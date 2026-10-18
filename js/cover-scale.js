/* 专辑图随播放状态缩放（Harmonia 网页播放器专属）
 *
 * 语义：大 = 空闲 / 正在播放；小 = 取音频中 / 已暂停。
 * 状态落在 .album-cover 的 is-compact 类上；尺寸与过渡见 css/player.css。
 *
 * 设计文档：docs/superpowers/specs/2026-10-05-album-cover-playback-scale-design.md
 * 单元测试：Harmonia/tests/js/cover-scale.test.js
 *
 * 为什么是独立文件而不是写进 js/main.js：main.js 已近 16000 行，而这个状态机的
 * 正确性完全由媒体事件时序决定，独立成文件才能用假 DOM 直接驱动它、并让评审只看这一屏。
 */
(function (global) {
  'use strict';

  var STORE_KEY = 'coverScaleEnabled';
  var COMPACT_CLASS = 'is-compact';
  var CONTINUATION_MS = 3000;   /* 'ended' 后视为「续播切歌」的窗口 */
  var GUARD_TTL_MS = 20000;     /* 切换闸门兜底：防请求挂死导致闸门常闭 */

  var cover = null;
  var players = [];
  var enabled = true;
  var expanded = true;
  var ticketSeq = 0;
  var pendingTicket = 0;        /* 最近一次播放请求的票据；0 = 无在途请求 */
  var guardUntil = 0;           /* 闸门到期时间戳；now() < guardUntil 表示生效 */
  var continuationUntil = 0;    /* 续播窗口到期时间戳 */

  function now() { return Date.now(); }
  function guardActive() { return now() < guardUntil; }
  function continuationActive() { return now() < continuationUntil; }

  function anyPlaying() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (p && !p.paused && !p.ended) return true;
    }
    return false;
  }

  /* 是否有元素已自然播完 —— 跨元素聚合。存在的理由是实测事实：浏览器在自然播完时
     **先派发 pause 再派发 ended**，且派发 pause 时 ended 已为 true。所以「这次 pause
     是不是播完引起的」只能查这个标志 —— 查续播窗口没用，那一刻窗口还没打开。
     注意：这里只作为**兜底**。判定某次 pause 时优先看事件来源元素自身的 ended
     （见 notifyMediaEvent），因为跨元素聚合会被兄弟元素的残留 ended 污染。 */
  function anyEnded() {
    for (var i = 0; i < players.length; i++) {
      var p = players[i];
      if (p && p.ended) return true;
    }
    return false;
  }

  function render() {
    if (!cover) return;
    cover.classList.toggle(COMPACT_CLASS, enabled && !expanded);
  }

  /* 媒体事件 -> 状态。type ∈ 'play' | 'pause' | 'ended'
   *
   * ele = 事件来源元素（由 init() 的监听器传入）。'pause' 分支必须知道「是谁暂停的」：
   * 判据是**该元素自身**的 ended 标志，而不是跨元素聚合 —— 否则兄弟元素残留的
   * ended === true 会吞掉本元素上 ended === false 的真实用户暂停（违反需求 4），
   * 且这个误判是粘性的（不是 3s 窗口边界，不会自己过期）。
   * ele 缺省时（外部直接调用 notifyMediaEvent，既有单测就是这种形态）退回 anyEnded()
   * 聚合判定，保持向后兼容。
   *
   * 'ended' 单独分流的原因：自动接歌与「队列播完停住」在媒体状态上完全一样
   * （都是 paused === true && ended === true），无法区分。这里选择「播完不缩」，
   * 另打一个短窗口的续播标记，让紧随其后的自动接歌继续走切换闸门。 */
  function notifyMediaEvent(type, ele) {
    if (type === 'ended') {
      continuationUntil = now() + CONTINUATION_MS;
      render();
      return;
    }
    var endedAtSource = ele ? !!ele.ended : anyEnded();
    if (anyPlaying()) {
      /* 'play'，或 'pause' 时另一个元素还在响（无缝交叉淡变） */
      expanded = true; guardUntil = 0; continuationUntil = 0;
    } else if (guardActive() || endedAtSource) {
      /* 两种「不是用户暂停」的 pause，都保持不动（需求 3）：
         guardActive      —— 切歌换 src 引起的那次；
         endedAtSource    —— 自然播完引起的那次，依据是**事件来源元素自身**的 ended 标志。
         为什么必须查 ended 而不是查续播窗口：**实测**（headless Chrome + 真实 WAV 自然播完）
         浏览器先派发 pause 再派发 ended，派发 pause 时该元素 ended 已为 true —— 那一刻续播
         窗口还没被打开，只查 continuationActive() 会漏掉这条最常见的路径（歌曲播完自动接歌
         会先缩再涨）。顺手补一次续播窗口，从而不依赖「ended 一定会补发」这个顺序假设。 */
      if (endedAtSource) continuationUntil = now() + CONTINUATION_MS;
    } else {
      expanded = false; continuationUntil = 0;    /* 需求 4：用户暂停 */
    }
    render();
  }

  /* playSong() 的同步前缀调用。返回票据，供结算时校验 ——
     被 guardSongSwitch 挡掉的重复点击（其 finally 仍会跑）不得清掉在途请求的闸门。 */
  function notifyPlayRequest() {
    var ticket = ++ticketSeq;
    pendingTicket = ticket;
    if (!anyPlaying() && !continuationActive()) expanded = false;   /* 需求 1 */
    guardUntil = now() + GUARD_TTL_MS;
    continuationUntil = 0;                                          /* 窗口一次性消费 */
    render();
    return ticket;
  }

  /* playSong() 的 finally 调用。缺了这条，取地址失败后闸门会一直挂着，
     用户接下来按暂停将不缩小封面（违反需求 4）。 */
  function notifyPlayRequestSettled(ticket) {
    if (!ticket || ticket !== pendingTicket) return;   /* 过期票据忽略 */
    pendingTicket = 0;
    guardUntil = 0;
    if (!anyPlaying()) expanded = false;
    render();
  }

  function setEnabled(on) {
    enabled = !!on;
    try { global.localStorage.setItem(STORE_KEY, enabled ? 'true' : 'false'); } catch (e) {}
    render();
  }
  function isEnabled() { return enabled; }
  function getState() {
    return {
      enabled: enabled,
      expanded: expanded,
      pendingTicket: pendingTicket,
      guardActive: guardActive(),
      continuationActive: continuationActive(),
    };
  }

  function init(opts) {
    cover = (opts && opts.cover) || null;
    players = ((opts && opts.players) || []).filter(Boolean);
    try { enabled = global.localStorage.getItem(STORE_KEY) !== 'false'; } catch (e) { enabled = true; }
    expanded = true;
    render();
    players.forEach(function (p) {
      ['play', 'pause', 'ended'].forEach(function (type) {
        p.addEventListener(type, function () { notifyMediaEvent(type, p); });
      });
    });
  }

  /* init() 只由 js/main.js 显式调用（与 js/dynamic-bg.js 被 main.js 调用同款约定），
     脚本自身不做 bootstrap —— 这样单测可以注入假元素与假 media。 */
  global.HarmoniaCoverScale = {
    init: init,
    notifyMediaEvent: notifyMediaEvent,
    notifyPlayRequest: notifyPlayRequest,
    notifyPlayRequestSettled: notifyPlayRequestSettled,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    getState: getState,
  };
})(window);
