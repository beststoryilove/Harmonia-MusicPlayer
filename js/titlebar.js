/* Windows 自绘窗口栏控制器（自包含、零依赖；网页/移动端自动保持隐藏）
   依赖 desktop/preload.js 暴露的 harmoniaDesktop（isDesktopApp / platform / 窗口控制 API）。
   职责：
   1. 仅当 harmoniaDesktop.isDesktopApp 且 platform === 'win32' 时启用——
      与桌面主进程 titleBarStyle: 'hidden'（win32）一一对应；
   2. 给 body 加 harmonia-titlebar 类（css/titlebar.css 据此显示窗口栏并下移顶部 UI）；
   3. 绑定最小化 / 最大化-还原 / 关闭按钮 → win:* IPC；
   4. 订阅 win:state-changed 切换最大化图标；全屏时隐藏窗口栏；
   5. 任何异常回退为不启用，绝不阻塞主界面。
   拖动与双击最大化由 -webkit-app-region: drag 原生提供（见 css/titlebar.css）。 */
(function () {
  'use strict';

  function bridge() { return window.harmoniaDesktop; }

  function supported() {
    var b = bridge();
    return !!(b && b.isDesktopApp === true && b.platform === 'win32' &&
      typeof b.minimizeWindow === 'function' &&
      typeof b.toggleMaximizeWindow === 'function' &&
      typeof b.closeWindow === 'function');
  }

  function applyState(bar, st) {
    if (!st) return;
    bar.classList.toggle('maximized', !!st.isMaximized);
    bar.classList.toggle('fullscreen', !!st.isFullscreen);
  }

  function init() {
    var bar = document.getElementById('windowTitlebar');
    if (!bar || bar.dataset.titlebarBound) return;
    if (!supported()) return; /* 网页 / 移动端 / macOS：保持隐藏 */
    bar.dataset.titlebarBound = '1';
    document.body.classList.add('harmonia-titlebar');

    var b = bridge();
    var bind = function (sel, fn) {
      var el = bar.querySelector(sel);
      if (el) el.addEventListener('click', function (e) {
        e.preventDefault();
        try { fn(); } catch (_) {}
      });
    };
    bind('.tb-min', b.minimizeWindow);
    bind('.tb-max', b.toggleMaximizeWindow);
    bind('.tb-close', b.closeWindow);

    if (typeof b.onWindowState === 'function') {
      try { b.onWindowState(function (st) { applyState(bar, st); }); } catch (_) {}
    }
    if (typeof b.getWindowState === 'function') {
      try {
        b.getWindowState().then(function (st) { applyState(bar, st); }).catch(function () {});
      } catch (_) {}
    }
  }

  function boot() {
    try {
      init();
    } catch (err) {
      /* 标题栏异常时回退为不启用（窗口控制退化到 Alt+F4 / 系统角），不阻塞主界面 */
      try { document.body.classList.remove('harmonia-titlebar'); } catch (_) {}
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
