/* 开屏加载动画控制器（自包含、零依赖、无全局污染，仅暴露 window.__harmoniaSplash.ready）
   职责：
   1. 用 rAF 平滑驱动进度条（未就绪时渐近爬升封顶 88%，营造真实加载感）；
   2. 加载完毕判定 = main.js 初始化完成信号 ready() + 页面静态资源加载完（window load）+ 启动期 fetch 全部返回，三者齐备 → 进度补满；
   3. 保证最短展示时长后淡出并移除节点（避免一闪而过）；
   4. 兜底：超时未就绪也强制走补满→淡出流程；任何异常直接移除开屏，绝不阻塞主界面。
   进度值写入 .splash-scrubber 的 --splash-progress（0~1），供填充条与滑块共用；
   同时同步 .splash-percent 百分比读数（元素缺失时静默跳过）。 */
(function () {
  'use strict';

  const MIN_SHOW_MS = 1100;  // 开屏最短完整展示时长（就绪更早时等待到该时刻才开始淡出）
  const TIMEOUT_MS = 8000;   // 兜底超时：网络异常/初始化卡死时强制进入退出流程
  const READY_EASE = 0.18;   // 就绪后进度补满的每帧缓动系数
  const CREEP_EASE = 0.06;   // 未就绪时进度爬升的每帧缓动系数
  const LEAVE_FALLBACK_MS = 700; // 淡出兜底移除时间（略大于 CSS transition 0.5s）

  function removeSplashRoot() {
    const root = document.getElementById('splashScreen');
    if (root && root.parentNode) root.parentNode.removeChild(root);
  }

  function initSplash() {
    const root = document.getElementById('splashScreen');
    if (!root || root.dataset.splashBound) return;
    root.dataset.splashBound = '1';

    const host = root.querySelector('.splash-scrubber') || root.querySelector('.splash-progress-fill');
    const percentEl = root.querySelector('.splash-percent');
    const start = now();
    let readyAt = 0;   // 0 表示尚未收到就绪信号
    let initDone = false; // main.js 初始化完成（ready() 已调用）
    let loadDone = document.readyState === 'complete'; // 页面静态资源（CSS/JS/图片/字体）加载完
    let bootFetchesPending = 0; // 启动期（load 完成前）发起、尚未返回的 fetch 计数
    let leaving = false;
    let shown = 0;     // 当前展示进度（0~100）
    let rafId = 0;

    function now() {
      return (window.performance && typeof window.performance.now === 'function')
        ? window.performance.now()
        : Date.now();
    }

    function setProgress(percent) {
      shown = Math.max(0, Math.min(100, percent));
      if (host) {
        host.style.setProperty('--splash-progress', String(shown / 100));
      }
      if (percentEl) {
        percentEl.textContent = Math.round(shown) + '%';
      }
    }

    function beginLeave() {
      if (leaving) return;
      leaving = true;
      if (rafId) window.cancelAnimationFrame(rafId);
      setProgress(100);
      root.classList.add('splash-leaving');
      // transitionend 为主、定时器兜底，二者均幂等
      window.setTimeout(removeSplashRoot, LEAVE_FALLBACK_MS);
    }

    // 加载完毕 = 初始化完成 且 页面静态资源加载完 且 启动期 fetch 全部返回；齐备才进入补满→淡出流程
    function maybeReady() {
      if (!leaving && !readyAt && initDone && loadDone && bootFetchesPending === 0) readyAt = now();
    }

    // 启动期 fetch 门控：load 完成前发起的请求计入在途，全部返回（含失败）才满足加载完毕。
    // 全库无 XMLHttpRequest，仅包装 fetch；load 之后的请求（按需/懒加载）不追踪。
    const nativeFetch = (typeof window.fetch === 'function') ? window.fetch.bind(window) : null;
    if (nativeFetch) {
      window.fetch = function () {
        if (loadDone || leaving) return nativeFetch.apply(this, arguments);
        bootFetchesPending++;
        const onSettle = () => { bootFetchesPending = Math.max(0, bootFetchesPending - 1); maybeReady(); };
        try {
          return nativeFetch.apply(this, arguments).then(
            (res) => { onSettle(); return res; },
            (err) => { onSettle(); throw err; }
          );
        } catch (err) {
          // fetch 同步抛错（如非法参数）也要归还计数，否则开屏会一直等到兜底超时
          onSettle();
          throw err;
        }
      };
    }

    function tick() {
      const elapsed = now() - start;
      const target = readyAt ? 100 : 88 * (1 - Math.exp(-elapsed / 1100));
      shown += (target - shown) * (readyAt ? READY_EASE : CREEP_EASE);
      if (readyAt && target - shown < 0.5) shown = 100;
      setProgress(shown);
      if (readyAt && shown >= 100 && elapsed >= MIN_SHOW_MS) {
        beginLeave();
        return;
      }
      rafId = window.requestAnimationFrame(tick);
    }

    root.addEventListener('transitionend', (e) => {
      if (leaving && e.target === root && e.propertyName === 'opacity') {
        removeSplashRoot();
      }
    });

    // 静态资源加载完（load 事件）→ 满足加载完毕的第二条件
    if (!loadDone) {
      window.addEventListener('load', () => {
        loadDone = true;
        maybeReady();
      }, { once: true });
    }

    window.setTimeout(() => {
      if (!leaving && !readyAt) {
        initDone = true;
        loadDone = true;
        readyAt = now();
      }
    }, TIMEOUT_MS);

    rafId = window.requestAnimationFrame(tick);

    // 供 main.js 在主界面初始化完成后调用；重复调用与淡出后调用均安全
    window.__harmoniaSplash = {
      ready() {
        initDone = true;
        maybeReady();
      }
    };
  }

  try {
    initSplash();
  } catch (err) {
    // 开屏自身异常时立即移除，保证主界面永远可达
    try { removeSplashRoot(); } catch (_) { /* ignore */ }
  }
})();
