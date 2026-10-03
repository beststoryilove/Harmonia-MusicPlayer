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

  function warn(...args) {
    console.warn('[DynamicBg]', ...args);
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
     否则 WebGL 贴图会被跨域污染。 */
  async function applyAlbum() {
    if (!background || !lastAlbum) return;
    try {
      await background.setAlbum(lastAlbum);
      albumState = (lastAlbum && lastAlbum.tagName === 'IMG') ? 'element' : 'url';
    } catch (error) {
      albumState = 'error';
      warn('设置专辑资源失败:', error);
    }
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
      containerEl.classList.add('active');
      document.body.classList.add('dynamic-bg-on');

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
      return { frameTime: null, flowSpeed: null, paused: null };
    }
    try {
      const r = background.getRenderer();
      return { frameTime: r ? r.frameTime : null, flowSpeed: r ? r.flowSpeed : null, paused: r ? r.paused : null };
    } catch (error) {
      return { frameTime: null, flowSpeed: null, paused: null };
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
      autoRetryPending: !!autoRetryTimer
    }, rendererDiag())
  };

  /* 页面卸载兜底：main.js 的 registerAMLLUnloadCleanup 也会调用（它走 onPageHide），
     本处为不依赖 main.js 的独立保险。 */
  window.addEventListener('pagehide', onPageHide);
})();