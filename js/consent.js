/* 协议同意门（Harmonia 网页播放器专属）
 *
 * 语义：进入 main.html 时若未同意当前版本的《用户协议》与《隐私政策》，
 * 弹出强制交互弹窗；勾选并点击「同意并进入」后记录同意状态（版本号绑定），
 * 下次访问同版本不再弹出。协议内容更新时，递增 CONSENT_VERSION 即可让
 * 所有老用户重新看到弹窗。
 *
 * 设计文档：docs/superpowers/specs/2026-10-06-consent-gate-design.md
 * 单元测试：Harmonia/tests/js/consent.test.js
 *
 * 为什么独立文件而不是写进 js/main.js：main.js 已 16000+ 行，而本模块的
 * 核心正确性（版本比较 + 降级链）可以纯函数化，独立出去才能用 vm 注入假
 * storage 直接驱动真实源码（与 cover-scale.js 同款约定）。
 */
(function (global) {
  'use strict';

  /* 协议内容更新时递增此版本号（格式：YYYY-MM-DD）。 */
  var CONSENT_VERSION = '2026-10-06';
  var STORE_KEY = 'harmoniaConsent';
  var SESSION_KEY = 'harmoniaConsentSession';

  /* 内存兜底：两级存储都写不进去时，至少本次页面生命周期内不重弹。 */
  var memoryConsent = null;

  /* 安全读取并解析一条同意记录；任何异常都视为无记录。 */
  function readRecord(storage, key, version) {
    try {
      var raw = storage.getItem(key);
      var rec = raw ? JSON.parse(raw) : null;
      return (rec && rec.agreedVersion === version) ? rec : null;
    } catch (e) {
      return null;
    }
  }

  /* 判定是否弹窗。storage 可为真实的 localStorage，也可为注入的假对象。
   * 判定顺序：内存 → localStorage → sessionStorage，命中即不弹。 */
  function resolveConsentState(storage, version) {
    if (memoryConsent === version) return { show: false, reason: 'memory-fallback' };
    if (storage) {
      if (readRecord(storage, STORE_KEY, version)) return { show: false, reason: 'already-agreed' };
      /* 有记录但版本不匹配 → 老用户看新版弹窗；无记录/非法 JSON → no-record */
      try {
        var raw = storage.getItem(STORE_KEY);
        if (raw) {
          var rec = JSON.parse(raw);
          if (rec && rec.agreedVersion !== version) return { show: true, reason: 'version-mismatch' };
        }
      } catch (e) { /* 非法 JSON：按无记录处理 */ }
    }
    try {
      if (readRecord(global.sessionStorage, SESSION_KEY, version)) {
        return { show: false, reason: 'session-fallback' };
      }
    } catch (e) { /* sessionStorage 不可用（极少数嵌入式 webview），按未同意处理 */ }
    return { show: true, reason: 'no-record' };
  }

  /* 保存同意记录，带三级降级：localStorage → sessionStorage → 内存。
   * 值形状：{"agreedVersion":"YYYY-MM-DD","agreedAt":"ISO8601"}。 */
  function saveConsent(storage, version, now) {
    var rec = JSON.stringify({ agreedVersion: version, agreedAt: now || new Date().toISOString() });
    try {
      storage.setItem(STORE_KEY, rec);
      memoryConsent = version;
      return 'local';
    } catch (e) { /* 隐私模式 / 配额满：降级 sessionStorage */ }
    try {
      global.sessionStorage.setItem(SESSION_KEY, rec);
      memoryConsent = version;
      return 'session';
    } catch (e) { /* 降级到内存 */ }
    memoryConsent = version;
    return 'memory';
  }

  /* ── DOM 接线（只在浏览器里使用；单测不触达 init，避免假 DOM 成本）── */

  function init(deps) {
    var document = deps.document;
    var storage = deps.storage;
    var root = document.getElementById('consentGate');
    if (!root) return { show: false };

    var state = resolveConsentState(storage, CONSENT_VERSION);
    if (!state.show) return { show: false };

    var agreeBtn = document.getElementById('consentAgreeBtn');
    var checkbox = document.getElementById('consentCheckbox');
    var titleEl = document.getElementById('consentTitle');

    root.hidden = false;
    document.documentElement.classList.add('consent-locked');

    if (checkbox) {
      checkbox.addEventListener('change', function () {
        if (agreeBtn) agreeBtn.disabled = !checkbox.checked;
      });
    }
    if (agreeBtn) {
      agreeBtn.addEventListener('click', function () {
        saveConsent(storage, CONSENT_VERSION);
        root.classList.add('consent-leaving');
        document.documentElement.classList.remove('consent-locked');
        global.setTimeout(function () {
          if (root.parentNode) root.parentNode.removeChild(root);
        }, 320); /* 与 css 里 .consent-leaving 的过渡时长一致 */
      });
    }
    if (titleEl) titleEl.focus();
    return { show: true };
  }

  global.HarmoniaConsent = {
    CONSENT_VERSION: CONSENT_VERSION,
    STORE_KEY: STORE_KEY,
    SESSION_KEY: SESSION_KEY,
    resolveConsentState: resolveConsentState,
    saveConsent: saveConsent,
    init: init,
  };

  /* 浏览器自举：本脚本 defer 加载，执行到此处时 DOM 已解析完毕，直接接线。
   * 必须自调 —— main.js 不感知本模块（与 cover-scale 由 main.js 显式 init 不同）；
   * 单测的 vm 领域没有 document，此分支不会触达。 */
  if (typeof global.document !== 'undefined' && global.document.getElementById) {
    try {
      HarmoniaConsent.init({
        document: global.document,
        storage: global.localStorage,
        sessionStorage: global.sessionStorage,
      });
    } catch (e) { /* 弹窗接线失败不阻塞播放器初始化 */ }
  }
})(window);
