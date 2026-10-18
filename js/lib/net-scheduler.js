/* Harmonia 统一请求调度器（2026-10-17 限流治理）
 *
 * 用途：把「出网请求」统一收口到一处，按 host 限并发、限速率，GET 在途去重，
 * 429/503 读 `Retry-After` 进入冷却，并暴露可观测统计。设计目标是**限流场景下
 * 请求总量收敛**，而不是把请求做得更快。
 *
 * 为什么需要它（背景）：
 *   `js/main.js` 的出网路径有 ~15 个外域、40 处 `wrappedFetch` 调用。单次点播可同时
 *   打出「音频 URL + 封面 + 歌词 + 6 路网易云搜索」；`timeupdate` 驱动的下一首预加载
 *   在途期间还会重复发 `types=url`。上游 `music-api.gdstudio.xyz` 等会返回 429，
 *   而原实现既无并发上限、也无 429 处理（`Retry-After` 全文件 0 次出现），
 *   于是「失败 → 立刻重试 → 更严重的限流」形成正反馈。
 *
 * 分层：
 *   - 本文件只做**通用调度**（并发/间隔/去重/冷却/优先级），不认识任何业务端点；
 *   - 业务侧的「该不该发」判据（如预加载闸门）在 pure.js / main.js，二者正交。
 *
 * 浏览器：<script src="js/lib/net-scheduler.js"></script> 后暴露 window.HarmoniaNetScheduler
 * Node：  require('../../js/lib/net-scheduler.js') 得到 { createScheduler }
 *
 * ⚠ 双源同步：Harmonia/js/lib/net-scheduler.js 与
 *   HarmoniaApp/网页源码/js/lib/net-scheduler.js 必须逐字节一致
 *   （由 HarmoniaApp/tests/dual-source-parity.test.js 与 prepare.mjs 双重守卫）。
 *
 * 设计约束（刻意为之）：
 *   1. **不缓存响应**：只合并「在途」的相同 GET，结算即移除。业务缓存（songCache /
 *      albumArtUrlCache / IndexedDB 歌词）各有自己的 TTL，调度器不越权。
 *   2. **不重试**：429 由冷却处理，网络错误原样抛给调用方（重试策略是业务决策）。
 *   3. **不吞错**：所有失败原样传播，调用方的既有错误处理链路完全不变。
 *   4. **时间与网络全部可注入**：测试用假时钟 + 假 fetch，因此断言是确定性的。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaNetScheduler = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ── 默认策略 ─────────────────────────────────────────────────────────
     gdstudio 给到 2 并发 / 300ms 间隔（≈3.3 req/s）——这是第三方免费聚合接口，
     保守值比激进值更能避免 429；酷狗自建代理可略宽。host 未命中时用 defaultHost。 */
  var DEFAULT_HOST_POLICY = { maxConcurrent: 2, minIntervalMs: 100 };
  var DEFAULT_GLOBAL_MAX_CONCURRENT = 8;
  var RATE_LIMIT_BASE_MS = 5000;    // 429 且无 Retry-After 时的首次退避
  var RATE_LIMIT_MAX_MS = 120000;   // 退避封顶 2min
  var RATE_LIMIT_MAX_HITS = 6;      // 退避翻倍的最大级数（超过后维持封顶值）

  // cache-buster 参数：这些参数每次请求都不同（时间戳/随机数），
  // 若参与去重键会让「同一资源」永远去重失败。剥离后才是资源的真实身份。
  var CACHE_BUSTER_PARAMS = ['_', '_t', 'timestamp', 'ts', 't', 'r', 'random', 'nocache', '_dc'];

  function hostOf(url) {
    try {
      var u = new URL(String(url), 'http://localhost');
      return u.host || 'unknown';
    } catch (_) {
      return 'unknown';
    }
  }

  // 归一化 URL 作为去重键：去掉 hash、剥离 cache-buster 参数、参数按名排序。
  // 注意保留其余参数顺序无关性——`?a=1&b=2` 与 `?b=2&a=1` 是同一资源。
  function normalizeUrlKey(url) {
    try {
      var u = new URL(String(url), 'http://localhost');
      u.hash = '';
      var drop = [];
      u.searchParams.forEach(function (value, name) {
        if (CACHE_BUSTER_PARAMS.indexOf(String(name).toLowerCase()) >= 0) drop.push(name);
      });
      for (var i = 0; i < drop.length; i++) u.searchParams.delete(drop[i]);
      var names = [];
      u.searchParams.forEach(function (value, name) { names.push(name); });
      names.sort();
      var rebuilt = new URLSearchParams();
      for (var j = 0; j < names.length; j++) rebuilt.append(names[j], u.searchParams.get(names[j]));
      var qs = rebuilt.toString();
      return u.origin + u.pathname + (qs ? '?' + qs : '');
    } catch (_) {
      return String(url);
    }
  }

  function methodOf(init) {
    var m = (init && init.method) || 'GET';
    return String(m).toUpperCase();
  }

  /* 调度器的私有字段绝不能再传给原生 fetch。
   *
   * ⚠ 真实事故（2026-10-17）：本调度器用 `init.priority`（0/1/2）表达优先级，
   * 但 `priority` 是**标准化的 RequestInit 字段**，枚举为 'high'|'low'|'auto'。
   * 传数字会让 Chrome 在**发出任何网络请求之前**就抛：
   *   TypeError: Failed to execute 'fetch' on 'Window':
   *     The provided value '1' is not a valid enum value of type FetchPriority
   * 于是所有请求都发不出去、F12 网络面板一片空白，而 wrappedFetch 把该 TypeError
   * 归类为 isNetworkError → 只报「网络或服务端无响应」，真实原因被完全掩盖。
   *
   * 更隐蔽的是：用自定义 JS 桩替换 window.fetch 的测试**完全测不出**这个问题
   * （JS 桩不校验枚举），缺陷因此顺利通过全部单测与 E2E。
   * 结论：调度器私有字段在**下发前必须显式剥离**，绝不能依赖"原生 fetch 会忽略未知字段"
   * —— 对已标准化的字段名（如 priority）这个假设是错的。 */
  var SCHEDULER_PRIVATE_KEYS = ['_priority', 'priority', 'skipIslandStatus'];

  function stripPrivateKeys(init) {
    if (!init || typeof init !== 'object') return init;
    var i;
    for (i = 0; i < SCHEDULER_PRIVATE_KEYS.length; i++) {
      if (Object.prototype.hasOwnProperty.call(init, SCHEDULER_PRIVATE_KEYS[i])) break;
    }
    if (i === SCHEDULER_PRIVATE_KEYS.length) return init; // 无需剥离，保持原对象（零拷贝）
    var clean = {};
    for (var k in init) {
      if (!Object.prototype.hasOwnProperty.call(init, k)) continue;
      if (SCHEDULER_PRIVATE_KEYS.indexOf(k) >= 0) continue;
      clean[k] = init[k];
    }
    return clean;
  }

  // Retry-After 支持两种格式：秒数（"5"）与 HTTP 日期（"Wed, 21 Oct 2015 07:28:00 GMT"）。
  // 解析失败返回 0（由调用方回退到指数退避），绝不返回 NaN/负值。
  function parseRetryAfterMs(value, now) {
    if (value === null || value === undefined) return 0;
    var raw = String(value).trim();
    if (!raw) return 0;
    if (/^\d+(\.\d+)?$/.test(raw)) {
      var sec = Number(raw);
      if (!isFinite(sec) || sec < 0) return 0;
      return Math.round(sec * 1000);
    }
    var t = Date.parse(raw);
    if (!isFinite(t)) return 0;
    var delta = t - now;
    return delta > 0 ? delta : 0;
  }

  function computeRateLimitBackoffMs(hits) {
    var n = Number(hits);
    if (!isFinite(n) || n < 1) n = 1;
    if (n > RATE_LIMIT_MAX_HITS) n = RATE_LIMIT_MAX_HITS;
    var ms = RATE_LIMIT_BASE_MS;
    for (var i = 1; i < n; i++) ms *= 2;
    return Math.min(ms, RATE_LIMIT_MAX_MS);
  }

  // 为「在途去重的额外等待者」复制一份响应：body 是一次性流，必须各自持有。
  // clone() 在 body 已被消费后会抛错 —— 此时退化为原对象（调用方本来就只读一次）。
  function cloneResponseSafely(res) {
    if (!res || typeof res.clone !== 'function') return res;
    try {
      return res.clone();
    } catch (_) {
      return res;
    }
  }

  // 结算时的统一分发：owner 拿原始响应，其余等待者各拿一份克隆。
  // 克隆必须**同步**完成（在任何人 await 之前），否则 owner 可能先消费掉 body。
  function settleResponse(waiters, res) {
    if (!waiters || !waiters.length) return;
    for (var i = 0; i < waiters.length; i++) {
      waiters[i].resolve(cloneResponseSafely(res));
    }
  }

  function createScheduler(options) {
    var o = options || {};
    var fetchImpl = o.fetch;
    if (typeof fetchImpl !== 'function') throw new Error('net-scheduler: 需要注入 fetch');
    var now = typeof o.now === 'function' ? o.now : function () { return Date.now(); };
    var setTimer = typeof o.setTimeout === 'function' ? o.setTimeout : function (fn, ms) { return setTimeout(fn, ms); };
    var clearTimer = typeof o.clearTimeout === 'function' ? o.clearTimeout : function (id) { clearTimeout(id); };
    var globalMax = Number(o.globalMaxConcurrent);
    if (!isFinite(globalMax) || globalMax < 1) globalMax = DEFAULT_GLOBAL_MAX_CONCURRENT;
    var defaultPolicy = normalizePolicy(o.defaultHost) || DEFAULT_HOST_POLICY;
    var hostPolicies = Object.create(null);
    if (o.hosts) {
      for (var k in o.hosts) {
        if (!Object.prototype.hasOwnProperty.call(o.hosts, k)) continue;
        var p = normalizePolicy(o.hosts[k]);
        if (p) hostPolicies[k] = p;
      }
    }

    var inFlight = 0;                    // 全局在飞数
    var queue = [];                      // 待发队列（每项含 priority/seq，便于稳定排序）
    var queueSeq = 0;
    var inflightGets = Object.create(null); // key -> { promise, waiters }
    var hostState = Object.create(null); // host -> { inFlight, queued, cooldownUntil, rateLimitHits, lastStartAt, timer }
    var totalRequests = 0;
    var totalRateLimited = 0;
    var pumping = false;

    function normalizePolicy(raw) {
      if (!raw || typeof raw !== 'object') return null;
      var mc = Number(raw.maxConcurrent);
      if (!isFinite(mc) || mc < 1) mc = 1;
      var mi = Number(raw.minIntervalMs);
      if (!isFinite(mi) || mi < 0) mi = 0;
      return { maxConcurrent: Math.floor(mc), minIntervalMs: Math.round(mi) };
    }

    function policyFor(host) {
      return hostPolicies[host] || defaultPolicy;
    }

    function stateOf(host) {
      var s = hostState[host];
      if (!s) {
        s = hostState[host] = {
          inFlight: 0,
          queued: 0,
          cooldownUntil: 0,
          rateLimitHits: 0,
          lastStartAt: 0,
          timer: null
        };
      }
      return s;
    }

    function clearHostTimer(host) {
      var s = hostState[host];
      if (s && s.timer) {
        clearTimer(s.timer);
        s.timer = null;
      }
    }

    function schedulePump(host, delayMs) {
      var s = stateOf(host);
      if (s.timer) return;
      var wait = Math.max(0, Math.round(delayMs));
      s.timer = setTimer(function () {
        s.timer = null;
        pump();
      }, wait);
    }

    // 该 host 现在能不能发：冷却已过 + 并发未满 + 距上次启动已过最小间隔。
    // 返回 0 表示可发；正数表示还要等多少毫秒；-1 表示并发已满（等结算）。
    function hostDelayMs(host) {
      var s = stateOf(host);
      var p = policyFor(host);
      var t = now();
      if (s.cooldownUntil > t) return s.cooldownUntil - t;
      if (s.inFlight >= p.maxConcurrent) return -1;
      if (p.minIntervalMs > 0 && s.lastStartAt > 0) {
        var gap = s.lastStartAt + p.minIntervalMs - t;
        if (gap > 0) return gap;
      }
      return 0;
    }

    function takeNextFromQueue() {
      // 稳定优先级：priority 小者先；同 priority 按入队顺序。
      if (!queue.length) return null;
      var bestIdx = 0;
      for (var i = 1; i < queue.length; i++) {
        var a = queue[i], b = queue[bestIdx];
        if (a.priority < b.priority || (a.priority === b.priority && a.seq < b.seq)) bestIdx = i;
      }
      return queue.splice(bestIdx, 1)[0];
    }

    function pump() {
      if (pumping) return;
      pumping = true;
      try {
        var progressed = true;
        while (progressed && queue.length && inFlight < globalMax) {
          progressed = false;
          // 按优先级顺序尝试出队；首个因 host 限额/冷却而不可发的项留在队列，
          // 但它不应阻塞后面「别的 host」的请求 —— 故遍历一遍候选。
          var candidates = queue.slice().sort(function (a, b) {
            return a.priority - b.priority || a.seq - b.seq;
          });
          for (var i = 0; i < candidates.length; i++) {
            var item = candidates[i];
            if (item.aborted) {
              removeFromQueue(item);
              progressed = true;
              continue;
            }
            var delay = hostDelayMs(item.host);
            if (delay === -1) continue;      // 该 host 并发满，看下一个候选
            if (delay > 0) {
              schedulePump(item.host, delay); // 定时唤醒（多次调用幂等）
              continue;
            }
            removeFromQueue(item);
            startItem(item);
            progressed = true;
            if (inFlight >= globalMax) break;
          }
        }
      } finally {
        pumping = false;
      }
    }

    function removeFromQueue(item) {
      var idx = queue.indexOf(item);
      if (idx >= 0) queue.splice(idx, 1);
      var s = stateOf(item.host);
      if (s.queued > 0) s.queued--;
    }

    function startItem(item) {
      var host = item.host;
      var s = stateOf(host);
      s.inFlight++;
      inFlight++;
      s.lastStartAt = now();
      totalRequests++;
      // 发起后同步清理该 host 的唤醒定时器：本次已消费额度，下一次由结算再驱动
      clearHostTimer(host);

      var promise;
      try {
        /* 剥离调度器私有字段后再下发：`priority` 是标准化的 RequestInit 枚举字段
           （'high'|'low'|'auto'），把调度器的 0/1/2 传下去会让 fetch 在发请求前
           就抛 TypeError（详见 stripPrivateKeys 注释里的真实事故）。 */
        promise = Promise.resolve(fetchImpl(item.url, stripPrivateKeys(item.init)));
      } catch (err) {
        promise = Promise.reject(err);
      }

      item.settle = function (fn) { fn(); };
      promise.then(function (res) {
        // 先为所有去重等待者克隆响应（同步、先于任何 await），再结算 owner。
        if (item.dedupEntry) {
          settleResponse(item.dedupEntry.waiters, res);
          item.dedupEntry.waiters = [];
        }
        onSettled(host, res, null);
        item.resolve(res);
      }, function (err) {
        if (item.dedupEntry) {
          var ws = item.dedupEntry.waiters;
          item.dedupEntry.waiters = [];
          for (var i = 0; i < ws.length; i++) ws[i].reject(err);
        }
        onSettled(host, null, err);
        item.reject(err);
      });
    }

    function onSettled(host, res, err) {
      var s = stateOf(host);
      if (s.inFlight > 0) s.inFlight--;
      if (inFlight > 0) inFlight--;

      if (!err && res && (res.status === 429 || res.status === 503)) {
        var hits = s.rateLimitHits + 1;
        s.rateLimitHits = hits;
        totalRateLimited++;
        var retryAfter = 0;
        try {
          if (res.headers && typeof res.headers.get === 'function') {
            retryAfter = parseRetryAfterMs(res.headers.get('retry-after'), now());
          }
        } catch (_) { retryAfter = 0; }
        var backoff = retryAfter > 0 ? retryAfter : computeRateLimitBackoffMs(hits);
        s.cooldownUntil = now() + backoff;
        schedulePump(host, backoff);
      } else if (!err && res && res.status >= 200 && res.status < 400) {
        // 成功即重置退避级数：上游恢复后不应继续按历史 429 次数退避
        s.rateLimitHits = 0;
      }
      pump();
    }

    // 对外主入口：与 fetch(url, init) 形状兼容，额外支持 init.priority。
    // priority: 0=交互（点播/搜索/当前歌歌词） 1=预取（下一首/分析） 2=后台（更新日志等）
    function schedulerFetch(url, init) {
      var method = methodOf(init);
      var host = hostOf(url);
      /* 只认私有字段 `_priority`。绝不读 `priority` —— 那是标准化枚举字段，
         读它会让调用方误以为可以传数字，从而触发 fetch 的枚举校验异常。 */
      var prio = Number(init && init._priority);
      if (!isFinite(prio)) prio = 1;
      if (prio < 0) prio = 0;
      if (prio > 2) prio = 2;

      var signal = init && init.signal;
      if (signal && signal.aborted) {
        return Promise.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      }

      // GET 在途去重：同一归一化 URL 的在途请求共享同一个上游响应。
      // 只合并 GET —— 有副作用的方法（POST 翻译等）绝不能合并。
      //
      // ⚠ Response.body 是一次性流。**不能**让多个等待者共享同一个 Response 对象：
      // 谁先读 body，其余人就会撞上 "body stream already read"。
      // 也不能靠 `.then(res => res.clone())` 惰性克隆——微任务顺序无法保证克隆发生在
      // owner 消费 body 之前。故在**结算瞬间**同步为所有等待者克隆，顺序完全确定。
      var dedupKey = method === 'GET' ? method + ' ' + normalizeUrlKey(url) : '';
      if (dedupKey && inflightGets[dedupKey]) {
        var shared = inflightGets[dedupKey];
        return new Promise(function (resolve, reject) {
          shared.waiters.push({ resolve: resolve, reject: reject });
        });
      }

      var item = {
        url: url,
        init: init,
        host: host,
        priority: prio,
        seq: ++queueSeq,
        aborted: false,
        resolve: null,
        reject: null
      };

      var promise = new Promise(function (resolve, reject) {
        item.resolve = resolve;
        item.reject = reject;
      });

      if (dedupKey) {
        item.dedupEntry = { waiters: [] };
        inflightGets[dedupKey] = item.dedupEntry;
      }
      var settleCleanup = function () {
        if (dedupKey && inflightGets[dedupKey] === item.dedupEntry) delete inflightGets[dedupKey];
      };
      promise.then(settleCleanup, settleCleanup);

      if (signal) {
        signal.addEventListener('abort', function onAbort() {
          item.aborted = true;
          if (queue.indexOf(item) >= 0) {
            removeFromQueue(item);
            item.reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
          }
          // 在途请求的取消由底层 fetch 自己响应 signal（调用方已把 signal 传下去）
        }, { once: true });
      }

      var s = stateOf(host);
      queue.push(item);
      s.queued++;
      pump();
      return promise;
    }

    schedulerFetch.stats = function () {
      var hosts = {};
      for (var h in hostState) {
        if (!Object.prototype.hasOwnProperty.call(hostState, h)) continue;
        var s = hostState[h];
        var p = policyFor(h);
        hosts[h] = {
          inFlight: s.inFlight,
          queued: s.queued,
          cooldownUntil: s.cooldownUntil,
          cooldownRemainingMs: Math.max(0, s.cooldownUntil - now()),
          rateLimitHits: s.rateLimitHits,
          maxConcurrent: p.maxConcurrent,
          minIntervalMs: p.minIntervalMs
        };
      }
      return {
        inFlight: inFlight,
        queued: queue.length,
        totalRequests: totalRequests,
        totalRateLimited: totalRateLimited,
        globalMaxConcurrent: globalMax,
        hosts: hosts
      };
    };

    schedulerFetch.reset = function () {
      for (var h in hostState) {
        if (Object.prototype.hasOwnProperty.call(hostState, h)) clearHostTimer(h);
      }
      queue.length = 0;
      inflightGets = Object.create(null);
      hostState = Object.create(null);
      inFlight = 0;
      totalRequests = 0;
      totalRateLimited = 0;
      queueSeq = 0;
    };

    schedulerFetch.setHostPolicy = function (host, policy) {
      var p = normalizePolicy(policy);
      if (!p) return false;
      hostPolicies[String(host)] = p;
      pump();
      return true;
    };

    return { fetch: schedulerFetch, stats: schedulerFetch.stats, reset: schedulerFetch.reset, setHostPolicy: schedulerFetch.setHostPolicy };
  }

  return {
    createScheduler: createScheduler,
    normalizeUrlKey: normalizeUrlKey,
    parseRetryAfterMs: parseRetryAfterMs,
    computeRateLimitBackoffMs: computeRateLimitBackoffMs,
    DEFAULT_HOST_POLICY: DEFAULT_HOST_POLICY,
    DEFAULT_GLOBAL_MAX_CONCURRENT: DEFAULT_GLOBAL_MAX_CONCURRENT
  };
});
