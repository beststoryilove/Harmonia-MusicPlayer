'use strict';
/* AMLL 动态背景（客户端源与网页版源同构，勿单独修改其中一份）。
 * 依据：https://amll.dev/guides/component/background
 *
 * 契约：宿主（js/main.js）在文件顶部注册 window.HarmoniaDynamicBgHost，提供
 *   isEnabled() / getSpeed() / clampSpeed(v) / getCoreModule() / ensureEngine()
 *   / isMobile() / isPlaying() / onEnabledChange(bool)
 * 本模块只依赖该契约，不直接读取 localStorage、不自行判定运行平台。
 *
 * 生命周期：仅开关打开时创建 BackgroundRender（禁用态不占 WebGL 上下文）；
 * 关闭开关或页面卸载时 dispose() 并释放渲染器，符合官方「清理」检查清单。 */
(function () {
  const HOST_WAIT_MAX_MS = 8000;   // 等待宿主注册的上限（defer 脚本竞态兜底）
  const HOST_WAIT_STEP_MS = 100;
  const RETRY_DELAY_MS = 1500;     // 引擎加载失败后的冷却，避免换歌风暴反复重试
  /* 启用失败后的自动重试（2026-10-02 修复）。
     背景：冷启动时 bootstrap() 的首次尝试发生在 AMLL 引擎尚未就绪、整页仍在初始化的时刻，
     一旦这一枪打空（引擎导入竞态 / WebGL 上下文尚未可用），此前**没有任何后续重试**：
     catch 里只打印「稍后自动重试」，而引擎就绪时那次补启用又会被 starting 守卫静默吞掉，
     于是开关看着是开的、背景却一直是旧的静态模糊图，必须进设置关一次再开才生效。
     现在按 n×基数 退避重试，成功后复位；上限到了会明确告警。 */
  const AUTO_RETRY_MAX = 5;
  const AUTO_RETRY_BASE_MS = 2000;

  let background = null;      // BackgroundRender 实例（仅启用时存在）
  let container = null;       // #amllBgContainer
  let lastAlbum = null;       // 最近一次专辑资源（URL 字符串或 HTMLImageElement）
  let lastAlbumUrl = null;    // 与 lastAlbum 对应的 URL（元素不可安全读取时用它兜底）
  let starting = false;       // 引擎加载中，避免并发重复创建
  let failedAt = 0;           // 上次启用失败时间戳
  let playingState = null;    // 期望的播放状态；引擎就绪后据此 resume/pause
  let disposed = false;
  /* 只读诊断：记录最近一次真正下发到渲染器的值，供 E2E 断言「渲染器确实收到了」
     （仅看 localStorage 只能证明设置被保存，证明不了链路打通） */
  let lastAppliedSpeed = null;
  let albumState = null;      // 'url' | 'element' | 'error'
  let autoRetryTimer = 0;     // 自动重试定时器
  let autoRetryCount = 0;     // 已自动重试次数（成功后复位）
  let lastSkipReason = null;  // 只读诊断：最近一次未启用的原因
  let rendered = false;       // 渲染器是否已产出可见内容（决定是否隐藏旧的模糊背景）
  let unavailableNotified = false; // 已向用户提示过「无法渲染」，避免重复打扰

  function warn(...args) {
    console.warn('[DynamicBg]', ...args);
  }

  /* ── 画布安全性探测（安卓「纯黑」根因防线）──────────────────────────────
     AMLL 的 MeshGradientRenderer 会把封面 drawImage 进一个**渲染器实例级共享**的
     32×32 取样画布（reduceImageSizeCanvas），再 getImageData 取色。若传入的 Image 是
     「跨域且未声明 crossOrigin」的，drawImage 会**永久**污染那张共享画布
     —— clearRect 无法解除；此后每一次 setAlbum 都在 getImageData 抛 SecurityError，
     于是 meshStates 永远为空 → 背景 canvas 没有任何内容 → 露出 body 的纯黑
     —— 这就是安卓端「开启动态背景后背景纯黑」的根因。

     为什么只有安卓：桌面 Electron 主窗口设了 webSecurity:false（源码/desktop/main.js），
     不执行同源策略，未声明 crossOrigin 的跨域图**不污染**画布，故桌面端从不触发。

     这里在把元素交给 AMLL 之前，先用一张一次性 1×1 画布自证「可读」：不可读就退化为
     传 URL 字符串 —— AMLL 收到 URL 时会自行 new Image() 并设 crossOrigin='anonymous'，
     失败只会静默降级（绝不会污染共享画布）。代价是一次 1×1 drawImage，可忽略。 */
  function isCanvasSafeImage(imgEl) {
    try {
      if (!imgEl || imgEl.tagName !== 'IMG' || !imgEl.naturalWidth) return false;
      const probe = document.createElement('canvas');
      probe.width = 1;
      probe.height = 1;
      const ctx = probe.getContext('2d');
      if (!ctx) return false;
      ctx.drawImage(imgEl, 0, 0, 1, 1);
      ctx.getImageData(0, 0, 1, 1);   // 已被跨域数据污染时会抛 SecurityError
      return true;
    } catch (_) {
      return false;
    }
  }

  /* 渲染器是否已产出内容。
     返回 true=有内容 / false=确定没有 / null=无法判定（AMLL 内部字段改名等）。
     依赖 renderer.meshStates 这一内部字段：它由 setAlbum 成功取色后 push。
     与既有 rendererDiag() 读取 frameTime/flowSpeed/paused 属同一取舍（版本已 pin）。 */
  function rendererHasContent() {
    if (!background || typeof background.getRenderer !== 'function') return null;
    try {
      const r = background.getRenderer();
      if (!r || !Array.isArray(r.meshStates)) return null;
      return r.meshStates.length > 0;
    } catch (_) {
      return null;
    }
  }

  /* 背景可见性收敛：**只有确认渲染器真的有内容**才隐藏旧的专辑图模糊背景。
     历史事故：onEnabledChange(true) 在渲染器建起来之前就把 .am-background 隐藏了，
     一旦取色失败（如上面的画布污染）就只剩 body 的纯黑底板 —— 用户看到「一片纯黑」。
     无法判定时按「有内容」处理，保持与改动前一致的桌面行为，避免误伤。
     attempted=true 表示「这次确实给过封面」：只有这种情况下的空内容才是真故障，需要提示用户；
     尚未有曲目时（attempted=false）保持安静，否则刚打开开关就会弹一条误导性的错误提示。 */
  function syncVisibility(attempted) {
    const has = rendererHasContent();
    const visible = has === null ? true : has;
    rendered = visible;
    if (container) container.classList.toggle('active', visible);
    document.body.classList.toggle('dynamic-bg-on', visible);
    if (!visible && attempted) notifyUnavailable();
  }

  /* 渲染器起来了但始终没有内容：明确告知用户，而不是留一块纯黑让人以为界面坏了。 */
  function notifyUnavailable() {
    if (unavailableNotified) return;
    const host = getHost();
    if (!host || typeof host.onRenderUnavailable !== 'function') return;
    unavailableNotified = true;
    try { host.onRenderUnavailable(); } catch (error) { warn('通知宿主失败:', error); }
  }

  function getHost() {
    const host = window.HarmoniaDynamicBgHost;
    return host && typeof host.isEnabled === 'function' ? host : null;
  }

  /* 本模块以 defer 先于 main.js 执行，首次调用时宿主可能尚未注册，
     故用轮询等待（最多 8s），避免与 DOM 事件时序耦合。 */
  function waitForHost() {
    const existing = getHost();
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const tick = () => {
        const host = getHost();
        if (host) { resolve(host); return; }
        if (Date.now() - startedAt >= HOST_WAIT_MAX_MS) { resolve(null); return; }
        setTimeout(tick, HOST_WAIT_STEP_MS);
      };
      setTimeout(tick, 0);
    });
  }

  function ensureContainer() {
    if (container && container.isConnected) return container;
    container = document.getElementById('amllBgContainer');
    if (container) return container;
    /* 极端情况下 HTML 缺该节点：补建，避免整条链路静默失效 */
    container = document.createElement('div');
    container.id = 'amllBgContainer';
    document.body.appendChild(container);
    return container;
  }

  function applySettings(host) {
    if (!background || !host) return;
    try {
      const speed = host.clampSpeed ? host.clampSpeed(host.getSpeed()) : host.getSpeed();
      background.setFlowSpeed(speed);
      lastAppliedSpeed = speed;
    } catch (error) {
      warn('设置流动速度失败:', error);
    }
  }

  function applyPlayingState() {
    if (!background || playingState === null) return;
    try {
      if (playingState) background.resume();
      else background.pause();
    } catch (error) {
      warn('同步播放状态失败:', error);
    }
  }

  /* 专辑资源下发：优先传 HTMLImageElement（已解码，省一次网络加载），
     否则传 URL 由 AMLL 自行加载。注意不可直接传未设 crossOrigin 的图片元素，
     否则 WebGL 贴图会被跨域污染。
     另：**必须**先经 isCanvasSafeImage 自证可读 —— AMLL 内部会把它 drawImage 进共享
     取样画布再 getImageData，被污染的画布会永久失效（见 isCanvasSafeImage 注释）。
     自证不通过时退化为传 URL：AMLL 收到 URL 会自行 new Image()+crossOrigin='anonymous'，
     即使取图失败也只降级、不污染，故这条兜底永远安全。 */
  async function applyAlbum() {
    if (!background) return;
    /* 尚无封面：AMLL 的 isNoCover=true 时 meshStates 为空，canvas 全透明。
       此时必须让旧模糊背景继续可见（syncVisibility 会据此判定），不能留一块纯黑。 */
    if (!lastAlbum) { syncVisibility(false); return; }
    let target = lastAlbum;
    if (target && target.tagName === 'IMG' && !isCanvasSafeImage(target)) {
      const fallbackUrl = lastAlbumUrl;
      warn('封面元素不可安全读取（跨域未声明 crossOrigin），退化为按 URL 加载');
      if (!fallbackUrl) { syncVisibility(false); return; }
      target = fallbackUrl;
    }
    try {
      await background.setAlbum(target);
      albumState = (target && target.tagName === 'IMG') ? 'element' : 'url';
    } catch (error) {
      albumState = 'error';
      warn('设置专辑资源失败:', error);
    }
    /* 取色完成后才决定背景是否可见：成功即隐藏旧模糊背景，失败则保留它当底板。 */
    syncVisibility(true);
  }

  /* 启用失败后的退避重试。getHost() 缺失或用户已关开关时不再排队。 */
  function scheduleAutoRetry() {
    if (disposed || autoRetryTimer) return;
    if (autoRetryCount >= AUTO_RETRY_MAX) {
      warn('自动重试已达上限 ' + AUTO_RETRY_MAX + ' 次，仍失败；请手动切换一次开关');
      return;
    }
    autoRetryCount++;
    const delay = AUTO_RETRY_BASE_MS * autoRetryCount;
    autoRetryTimer = setTimeout(function () {
      autoRetryTimer = 0;
      const host = getHost();
      if (!host || !host.isEnabled()) return;      /* 期间用户关掉了开关 */
      warn('自动重试启用（第 ' + autoRetryCount + '/' + AUTO_RETRY_MAX + ' 次）');
      enable();
    }, delay);
  }

  function cancelAutoRetry() {
    if (autoRetryTimer) { clearTimeout(autoRetryTimer); autoRetryTimer = 0; }
    autoRetryCount = 0;
  }

  async function enable() {
    if (background) return;
    if (starting || disposed) { lastSkipReason = starting ? 'starting' : 'disposed'; return; }
    const host = await waitForHost();
    if (!host) { lastSkipReason = 'no-host'; return; }
    if (!host.isEnabled()) { lastSkipReason = 'disabled'; return; }
    if (Date.now() - failedAt < RETRY_DELAY_MS) { lastSkipReason = 'cooldown'; return; }
    starting = true;
    lastSkipReason = null;
    try {
      const core = host.getCoreModule() || await host.ensureEngine();
      const Renderer = core && core.MeshGradientRenderer;
      const BackgroundRender = core && core.BackgroundRender;
      if (!BackgroundRender || !Renderer) {
        throw new Error('AMLL Core 未导出 BackgroundRender / MeshGradientRenderer');
      }
      if (!host.isEnabled() || disposed) return;   // 等待期间用户已关闭 / 页面已卸载
      if (background) return;

      background = BackgroundRender.new(Renderer);
      const containerEl = ensureContainer();
      containerEl.innerHTML = '';
      containerEl.appendChild(background.getElement());
      /* 刻意**不**在这里加 .active / body.dynamic-bg-on：
         此时还没有任何内容，加了两者只会把旧的专辑图模糊背景藏掉、露出 body 纯黑。
         可见性统一由 applyAlbum() 末尾的 syncVisibility() 按「渲染器是否真有内容」决定。 */

      background.setFPS(host.isMobile() ? 30 : 60);
      background.setStaticMode(false);
      applySettings(host);
      /* 播放状态：仅在「已有曲目且处于暂停」时保持静止。
         尚未加载任何曲目时（用户刚打开开关）必须让动画跑起来，否则
         刚开启只看到一片静止，会被当成功能失效——同 spatial3d「开了没反应」的事故类型。 */
      if (typeof host.isPlaying === 'function' && typeof host.hasTrack === 'function') {
        playingState = host.hasTrack() ? !!host.isPlaying() : true;
      } else if (playingState === null) {
        playingState = true;
      }
      applyPlayingState();
      await applyAlbum();
      failedAt = 0;
      cancelAutoRetry();                                 /* 成功：复位退避计数 */
    } catch (error) {
      failedAt = Date.now();
      lastSkipReason = 'error';
      warn('启用失败（设置保持开启，将自动重试）:', error);
    } finally {
      starting = false;
      /* 失败即排队下一次尝试。这里是唯一的排队点：成功路径已 cancelAutoRetry()，
         用户关开关的路径由 disable()/setEnabled(false) 取消并复位。 */
      if (!background && !disposed) {
        const h = getHost();
        if (h && h.isEnabled()) scheduleAutoRetry();
      }
    }
  }

  function disable() {
    cancelAutoRetry();
    if (background) {
      try { background.dispose(); } catch (error) { warn('释放背景失败:', error); }
      background = null;
    }
    if (container) {
      container.innerHTML = '';
      container.classList.remove('active');
    }
    document.body.classList.remove('dynamic-bg-on');
    lastAppliedSpeed = null;
    albumState = null;
    rendered = false;
    unavailableNotified = false;
  }

  /* 主界面初始化完成后调用：仅在开关已开启时才真正启用。
     注意「引擎刚就绪」的补启用回调会落在首次尝试仍在进行时（ensureEngine 要拉 470KB 模块），
     此时不能静默 return —— 首次尝试若随后失败，finally 会排队重试，这次意图不会丢。 */
  function bootstrap() {
    waitForHost().then((host) => {
      if (!host) { warn('未等到宿主桥接，启动跳过'); return; }
      if (!host.isEnabled()) return;            /* 开关未开：正常态，不打扰控制台 */
      if (background) return;
      if (starting) { warn('启用仍在进行中，本次补启用交给失败重试处理'); return; }
      enable();
    }).catch((error) => {
      /* 兜底：bootstrap 自身异常（含 waitForHost 意外拒绝）不再静默 */
      warn('启动异常:', error);
    });
  }

  /* 开关切换：开启即建、关闭即释放；同时通知宿主更新互斥显示。 */
  function setEnabled(enabled) {
    if (enabled) {
      const host = getHost();
      if (host && typeof host.onEnabledChange === 'function') {
        try { host.onEnabledChange(true); } catch (error) { warn('通知宿主失败:', error); }
      }
      cancelAutoRetry();            /* 用户手动开启：复位退避，立即重新尝试 */
      enable();
      return;
    }
    disable();
    const host = getHost();
    if (host && typeof host.onEnabledChange === 'function') {
      try { host.onEnabledChange(false); } catch (error) { warn('通知宿主失败:', error); }
    }
  }

  /* 设置项变化（速度）：即时下发。 */
  function applyCurrentSettings() {
    const host = getHost();
    if (host) applySettings(host);
  }

  /* 封面就绪通知：换歌时由宿主各处回调调用。
     未启用时只记录，等启用时补下发，不会产生额外网络请求；
     若开关是开的但渲染器仍未起来（冷启动首次尝试失败），在此按设计文档补一次启用——
     这是「下次封面就绪时重试」的落点。重试频率由 RETRY_DELAY_MS 冷却与退避上限约束。 */
  function notifyCover(url, imgEl) {
    if (typeof url === 'string' && url) lastAlbumUrl = url;
    if (imgEl && imgEl.tagName === 'IMG' && imgEl.naturalWidth > 0) lastAlbum = imgEl;
    else if (url && typeof url === 'string') lastAlbum = url;
    else return;
    if (background) { applyAlbum(); return; }
    const host = getHost();
    if (host && host.isEnabled() && !starting && !disposed) enable();
  }

  /* 播放状态同步：playing=true → resume()，false → pause()。 */
  function syncPlaying(playing) {
    playingState = !!playing;
    applyPlayingState();
  }

  /* 释放并标记终态：页面真正卸载时调用，之后不再重建。
     注意 setEnabled(false)（用户关开关）走 disable() 而非本函数——关开关是可逆的。 */
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAutoRetry();
    disable();
    lastAlbum = null;
    lastAlbumUrl = null;
  }

  /* bfcache 往返：pagehide 在「进入缓存」时也会触发，此时若走终态 dispose，
     用户点后退返回页面后背景会永久消失（disposed 阻止一切重建）。
     persisted=true 表示页面只是被冻结、可能被恢复，故只暂停动画并保留实例；
     真正卸载（persisted=false）才做终态释放。 */
  function onPageHide(event) {
    if (event && event.persisted) {
      try { if (background) background.pause(); } catch (error) { warn('冻结背景失败:', error); }
      return;
    }
    dispose();
  }

  /* 渲染器运行时诊断：frameTime 是渲染器内部随时间累加的动画时钟，
     采样两次即可判定「动画是否真的在推进」——比读 canvas 像素可靠，
     因为 WebGL 默认 preserveDrawingBuffer:false，帧外读回只会得到全黑。 */
  function rendererDiag() {
    if (!background || typeof background.getRenderer !== 'function') {
      return { frameTime: null, flowSpeed: null, paused: null, meshCount: null };
    }
    try {
      const r = background.getRenderer();
      return {
        frameTime: r ? r.frameTime : null,
        flowSpeed: r ? r.flowSpeed : null,
        paused: r ? r.paused : null,
        /* meshStates 数量即「取色成功的封面数」：0 = canvas 全透明（背景不可见） */
        meshCount: (r && Array.isArray(r.meshStates)) ? r.meshStates.length : null
      };
    } catch (error) {
      return { frameTime: null, flowSpeed: null, paused: null, meshCount: null };
    }
  }

  window.HarmoniaDynamicBg = {
    bootstrap,
    setEnabled,
    applyCurrentSettings,
    notifyCover,
    syncPlaying,
    dispose,
    /* 让 main.js 的卸载清理路径可复用同一套 bfcache 判定 */
    onPageHide,
    /* 供测试与排查使用 */
    isActive: () => !!background,
    getDiagnostics: () => Object.assign({
      active: !!background,
      appliedSpeed: lastAppliedSpeed,
      albumState: albumState,
      hasAlbum: !!lastAlbum,
      disposed: disposed,
      /* 冷启动启用失败时，下面三项能一眼看出「还没启用、为什么、还有没有在重试」 */
      skipReason: lastSkipReason,
      autoRetryCount: autoRetryCount,
      autoRetryPending: !!autoRetryTimer,
      /* 背景是否真的已产出内容（决定旧模糊背景是否被隐藏）；false 时界面保留可见底板 */
      rendered: rendered
    }, rendererDiag())
  };

  /* 页面卸载兜底：main.js 的 registerAMLLUnloadCleanup 也会调用（它走 onPageHide），
     本处为不依赖 main.js 的独立保险。 */
  window.addEventListener('pagehide', onPageHide);
})();