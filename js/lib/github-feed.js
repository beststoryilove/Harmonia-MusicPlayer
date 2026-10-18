/* Harmonia GitHub 信息源（2026-10-17）
 *
 * 用途：为「更新日志重试」与「最新开发进度」提供可测逻辑。
 *   - 纯函数：作者筛选、GitHub 配额头解析、评论归一化、端点构造
 *   - 缓存：localStorage 读写 + TTL 判定（storage 与时钟均可注入）
 *   - 编排：TTL / 配额冷却 / force 最小间隔 / in-flight 去重 / 直连优先 + 代理回退
 *
 * 本文件不做任何 DOM 操作，浏览器与 Node 双环境可用。
 * 浏览器：<script src="js/lib/github-feed.js"></script> 后暴露 window.HarmoniaGithubFeed
 * Node：  require('../../js/lib/github-feed.js')
 *
 * ⚠ 双源同步：Harmonia/js/lib/github-feed.js 与
 *   HarmoniaApp/网页源码/js/lib/github-feed.js 必须逐字节一致
 *   （由 HarmoniaApp/tests/rate-limit-wiring.test.js 与 prepare.mjs 双重守卫）。
 *
 * ⚠ 评论正文是**外部不可信数据**：本模块只负责裁剪与链接白名单，
 *   真正的 HTML 转义由渲染方（main.js 的 escapeHtml）负责 —— 二者缺一不可。
 *
 * ⚠ 配额约束：GitHub 未认证 API 仅 **60 次/小时/IP**，且配额耗尽返回的是
 *   **403**（不是 429）+ `X-RateLimit-Remaining: 0`。因此本模块自带冷却窗口，
 *   不与 net-scheduler 的 429 处理重叠。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.HarmoniaGithubFeed = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEV_PROGRESS_AUTHOR = 'beststoryilove';
  var GITHUB_API_BASE = 'https://api.github.com';
  var GITHUB_REPO = 'beststoryilove/Harmonia-MusicPlayer';
  var GITHUB_ISSUE_NUMBER = 7;
  var CACHE_KEY = 'harmoniaDevProgressV1';
  var DEFAULT_MIN_INTERVAL_MS = 30 * 60 * 1000;   // 最短真实请求间隔
  var DEFAULT_FORCE_MIN_INTERVAL_MS = 30 * 1000;  // 用户主动点击的最短间隔
  var MAX_BODY_LEN = 20000;                        // 防御性上限
  var LINK_PREFIX = 'https://github.com/';         // 链接白名单前缀
  // 配额头缺失时的哨兵值。**不能**用 NaN：调用方做算术/比较会得到意外结果，
  // 且「绝不返回 NaN」是本模块对外的约定。消费方只用 `remaining === 0` 判断
  // 配额耗尽，故 -1（未知）不会被误判为耗尽。
  var REMAINING_UNKNOWN = -1;

  /* ── 纯函数 ─────────────────────────────────────────────────────── */

  // 取指定作者的最新评论。
  // 不依赖数组顺序（对 asc/desc 都正确）；created_at 非法的条目直接忽略。
  function pickLatestOwnComment(comments, login) {
    if (!Array.isArray(comments) || !login) return null;
    var want = String(login);
    var best = null;
    var bestTs = -Infinity;
    for (var i = 0; i < comments.length; i++) {
      var c = comments[i];
      if (!c || typeof c !== 'object') continue;
      if (!c.user || typeof c.user !== 'object') continue;
      if (String(c.user.login) !== want) continue;
      var ts = Date.parse(c.created_at);
      if (!isFinite(ts)) continue;
      if (ts > bestTs) { bestTs = ts; best = c; }
    }
    return best;
  }

  // 解析 GitHub 配额头。任何缺失/非法值都收敛为安全默认，绝不返回 NaN。
  //   X-RateLimit-Remaining / X-RateLimit-Reset（Unix 秒）/ Retry-After（秒数或 HTTP 日期）
  function parseGithubRateLimit(getHeader, now) {
    var out = { remaining: REMAINING_UNKNOWN, resetAt: 0, retryAfterMs: 0 };
    var t = Number(now);
    if (!isFinite(t)) t = 0;

    function readAny(names) {
      for (var i = 0; i < names.length; i++) {
        try {
          if (typeof getHeader !== 'function') return null;
          var v = getHeader(names[i]);
          if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
        } catch (_) { /* 头读取失败按缺失处理 */ }
      }
      return null;
    }

    var remRaw = readAny(['X-RateLimit-Remaining', 'x-ratelimit-remaining']);
    if (remRaw !== null) {
      var rem = Number(remRaw);
      if (isFinite(rem) && rem >= 0) out.remaining = Math.floor(rem);
    }

    var resetRaw = readAny(['X-RateLimit-Reset', 'x-ratelimit-reset']);
    if (resetRaw !== null) {
      var sec = Number(resetRaw);
      if (isFinite(sec) && sec > 0) out.resetAt = Math.round(sec * 1000);
    }

    var raRaw = readAny(['Retry-After', 'retry-after']);
    if (raRaw !== null) {
      if (/^\d+(\.\d+)?$/.test(raRaw)) {
        var ra = Number(raRaw);
        if (isFinite(ra) && ra >= 0) out.retryAfterMs = Math.round(ra * 1000);
      } else {
        var parsed = Date.parse(raRaw);
        if (isFinite(parsed)) {
          var delta = parsed - t;
          out.retryAfterMs = delta > 0 ? delta : 0;
        }
      }
    }
    return out;
  }

  // 评论 → 展示模型。非法输入返回 null；链接只接受 https://github.com/ 前缀。
  function normalizeComment(comment, login) {
    if (!comment || typeof comment !== 'object') return null;
    var id = Number(comment.id);
    if (!isFinite(id) || id <= 0) return null;
    if (!comment.user || typeof comment.user !== 'object') return null;
    var author = String(comment.user.login || '');
    if (!author) return null;
    var createdAt = String(comment.created_at || '');
    if (!isFinite(Date.parse(createdAt))) return null;

    var body = typeof comment.body === 'string' ? comment.body : '';
    if (body.length > MAX_BODY_LEN) body = body.slice(0, MAX_BODY_LEN);

    var htmlUrl = typeof comment.html_url === 'string' ? comment.html_url : '';
    // 白名单前缀：拒绝 javascript:/data:/http:/任意第三方域名
    if (htmlUrl.indexOf(LINK_PREFIX) !== 0) htmlUrl = '';

    return {
      commentId: id,
      body: body,
      authorLogin: author,
      createdAt: createdAt,
      htmlUrl: htmlUrl
    };
  }

  // 评论列表端点。
  //
  // ⚠ 2026-10-17 实测：GitHub 的 per-issue comments 端点**忽略** `sort` 与 `direction`
  //   —— 无论怎么传都返回 ASC（旧→新），只是把参数回显在 Link 头里。
  //   故这里不携带它们（避免制造"已按新→旧排序"的错觉）。
  //   评论数超过 per_page 时，靠 `parseLastPageFromLink` 取**末页**拿最新，
  //   再加 `pickLatestOwnComment` 的顺序无关筛选兜底。
  function buildCommentsUrl(repo, issueNumber, perPage, page) {
    var r = String(repo || GITHUB_REPO);
    var n = Number(issueNumber);
    if (!isFinite(n) || n <= 0) n = GITHUB_ISSUE_NUMBER;
    var pp = Number(perPage);
    if (!isFinite(pp) || pp <= 0) pp = 100;
    var pg = Number(page);
    if (!isFinite(pg) || pg <= 0) pg = 1;
    return GITHUB_API_BASE + '/repos/' + r + '/issues/' + n
      + '/comments?per_page=' + Math.floor(pp) + '&page=' + Math.floor(pg);
  }

  // 从 Link 头解析 `rel="last"` 的页码。单页（无 Link）或解析失败返回 0。
  // 用途：ASC 端点下"最新评论在最后一页"，超过 per_page 时必须翻到末页。
  function parseLastPageFromLink(linkHeader) {
    if (typeof linkHeader !== 'string' || !linkHeader) return 0;
    var parts = linkHeader.split(',');
    for (var i = 0; i < parts.length; i++) {
      var seg = parts[i];
      if (!/rel\s*=\s*"?last"?/i.test(seg)) continue;
      var m = seg.match(/[?&]page=(\d+)/);
      if (!m) continue;
      var n = Number(m[1]);
      if (isFinite(n) && n > 0) return Math.floor(n);
    }
    return 0;
  }

  /* ── 缓存层 ─────────────────────────────────────────────────────── */

  // 逐字段校验缓存对象。任一**必填**字段非法 → 返回 null（当作无缓存，重新请求）。
  // 时间字段非法**不整条丢弃**，只归零 —— fetchedAt=0 语义上等价于「已过期」，
  // 丢掉整条会连带丢失仍然可用的正文。
  function validateCache(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var id = Number(raw.commentId);
    if (!isFinite(id) || id <= 0) return null;
    if (typeof raw.body !== 'string') return null;
    if (typeof raw.createdAt !== 'string' || !isFinite(Date.parse(raw.createdAt))) return null;
    var fetchedAt = Number(raw.fetchedAt);
    if (!isFinite(fetchedAt) || fetchedAt < 0) fetchedAt = 0;
    var rateLimitResetAt = Number(raw.rateLimitResetAt);
    if (!isFinite(rateLimitResetAt) || rateLimitResetAt < 0) rateLimitResetAt = 0;
    return {
      commentId: id,
      body: raw.body.length > MAX_BODY_LEN ? raw.body.slice(0, MAX_BODY_LEN) : raw.body,
      authorLogin: String(raw.authorLogin || ''),
      createdAt: raw.createdAt,
      htmlUrl: typeof raw.htmlUrl === 'string' && raw.htmlUrl.indexOf(LINK_PREFIX) === 0 ? raw.htmlUrl : '',
      fetchedAt: fetchedAt,
      rateLimitResetAt: rateLimitResetAt
    };
  }

  function createFeedStore(storage, now, opts) {
    var o = opts || {};
    var key = o.key || CACHE_KEY;
    var usable = !!(storage
      && typeof storage.getItem === 'function'
      && typeof storage.setItem === 'function');
    // storage 不可用（隐私模式/被策略禁用）或写入失败时，退化为**内存缓存**：
    // 本次会话内功能仍完整可用，绝不因存储问题让功能报错。
    var memory = null;

    function read() {
      if (usable) {
        var raw;
        try { raw = storage.getItem(key); } catch (_) { raw = null; }
        if (raw !== null && raw !== undefined) {
          var parsed = null;
          try { parsed = JSON.parse(String(raw)); } catch (_) { parsed = null; }
          var valid = validateCache(parsed);
          if (valid) return valid;
          // 缓存损坏：不覆盖 read 结果，也不清空——交由 write 在下次成功时替换
        }
      }
      return validateCache(memory);
    }

    function write(obj) {
      var valid = validateCache(obj);
      if (!valid) return false;
      memory = valid;
      if (!usable) return false;
      try {
        storage.setItem(key, JSON.stringify(valid));
        return true;
      } catch (_) {
        return false; // 配额超限等：静默降级到内存缓存
      }
    }

    function clear() {
      memory = null;
      if (!usable) return;
      try { if (typeof storage.removeItem === 'function') storage.removeItem(key); } catch (_) {}
    }

    function isFresh(cache, nowMs, minIntervalMs) {
      if (!cache || !isFinite(Number(cache.fetchedAt)) || cache.fetchedAt <= 0) return false;
      var t = Number(nowMs);
      var iv = Number(minIntervalMs);
      if (!isFinite(t) || !isFinite(iv) || iv < 0) return false;
      return (t - cache.fetchedAt) < iv;
    }

    return { read: read, write: write, clear: clear, isFresh: isFresh };
  }

  /* ── 编排层 ─────────────────────────────────────────────────────── */

  // 缓存对象 → 展示模型（剥离 fetchedAt / rateLimitResetAt 等内部字段）
  function toModel(cache) {
    if (!cache) return null;
    return {
      commentId: cache.commentId,
      body: cache.body,
      authorLogin: cache.authorLogin,
      createdAt: cache.createdAt,
      htmlUrl: cache.htmlUrl
    };
  }

  function createGithubFeed(opts) {
    var o = opts || {};
    var fetchImpl = o.fetchImpl;
    if (typeof fetchImpl !== 'function') throw new Error('github-feed: 需要注入 fetchImpl');
    var store = o.store;
    if (!store || typeof store.read !== 'function') throw new Error('github-feed: 需要注入 store');
    var now = typeof o.now === 'function' ? o.now : function () { return Date.now(); };
    var author = o.author || DEV_PROGRESS_AUTHOR;
    var minInterval = Number(o.minIntervalMs);
    if (!isFinite(minInterval) || minInterval < 0) minInterval = DEFAULT_MIN_INTERVAL_MS;
    var forceMinInterval = Number(o.forceMinIntervalMs);
    if (!isFinite(forceMinInterval) || forceMinInterval < 0) forceMinInterval = DEFAULT_FORCE_MIN_INTERVAL_MS;
    var proxyBase = o.proxyBase || '';
    var logger = o.logger || { warn: function () {} };
    var inflight = null;
    var lastForceAt = 0;
    var cooldownUntil = 0;   // 实例内冷却窗口（跨刷新的持久化见 store）

    // 两跳：直连优先，代理兜底。代理参数必须 encodeURIComponent 整条目标 URL。
    function buildEndpoints(page) {
      var direct = buildCommentsUrl(GITHUB_REPO, GITHUB_ISSUE_NUMBER, 100, page || 1);
      var list = [direct];
      if (proxyBase) list.push(proxyBase + encodeURIComponent(direct));
      return list;
    }

    function tryEndpoint(endpoints, idx, headers) {
      if (idx >= endpoints.length) return Promise.resolve({ error: 'network' });
      var url = endpoints[idx];
      return Promise.resolve()
        .then(function () {
          return fetchImpl(url, { headers: headers, _priority: 2, timeout: 10000 });
        })
        .then(function (res) {
          var rl = parseGithubRateLimit(function (k) {
            return res && res.headers && typeof res.headers.get === 'function' ? res.headers.get(k) : null;
          }, now());

          // 配额耗尽：**不回退**（配额是 IP 级的，换代理只会再撞一次 403）
          if (res && res.status === 403 && rl.remaining === 0) {
            var wait = rl.retryAfterMs > 0
              ? rl.retryAfterMs
              : (rl.resetAt > now() ? rl.resetAt - now() : 60000);
            if (!isFinite(wait) || wait <= 0) wait = 60000;
            return { error: 'rate-limited', rateLimited: true, retryAfterMs: wait, rateLimitResetAt: now() + wait };
          }
          // 4xx 语义错误（404 等）：换代理结果相同，不回退
          if (res && res.status >= 400 && res.status < 500) {
            return { error: 'http-' + res.status };
          }
          // 5xx：上游故障，值得回退
          if (!res || !res.ok) {
            return tryEndpoint(endpoints, idx + 1, headers);
          }
          return Promise.resolve()
            .then(function () { return res.json(); })
            .then(function (data) {
              var link = null;
              try {
                if (res && res.headers && typeof res.headers.get === 'function') link = res.headers.get('link');
              } catch (_) { link = null; }
              return {
                data: data,
                link: link,
                rateLimitResetAt: rl.remaining === 0 ? rl.resetAt : 0
              };
            })
            .catch(function () { return { error: 'bad-json' }; });
        }, function () {
          // 网络层失败（TypeError / 超时 / abort）→ 回退下一跳
          return tryEndpoint(endpoints, idx + 1, headers);
        });
    }

    var REQ_HEADERS = { 'Accept': 'application/vnd.github.v3+json' };

    function fetchPage(page) {
      return tryEndpoint(buildEndpoints(page), 0, REQ_HEADERS);
    }

    // 从一页评论里筛出作者最新一条
    function pickFromData(data) {
      var picked = pickLatestOwnComment(data, author);
      if (!picked) return { error: 'no-comment' };
      var model = normalizeComment(picked, author);
      if (!model) return { error: 'bad-comment' };
      return { model: model };
    }

    // 统一结算：写入缓存 / 失败时保留旧缓存并处理配额冷却
    function handleResult(result, rlSource, cache) {
      var t = now();
      var rl = rlSource || {};
      if (!result || result.error) {
        // 配额耗尽：把冷却窗口记到实例 + 有缓存时落盘（跨刷新仍生效）
        if (rl.rateLimitResetAt) {
          cooldownUntil = Math.max(cooldownUntil, rl.rateLimitResetAt);
          lastForceAt = t;   // 冷却期间占住 force 名额，避免连点
          if (cache) {
            store.write({
              commentId: cache.commentId,
              body: cache.body,
              authorLogin: cache.authorLogin,
              createdAt: cache.createdAt,
              htmlUrl: cache.htmlUrl,
              fetchedAt: cache.fetchedAt,
              rateLimitResetAt: rl.rateLimitResetAt
            });
          }
        }
        // no-comment 属正常业务结果，不当作异常噪声
        if (result.error !== 'no-comment' && logger && typeof logger.warn === 'function') {
          logger.warn('[DevProgress] 获取失败:', result.error);
        }
        return {
          model: toModel(cache),
          fromCache: !!cache,
          fetchedAt: cache ? cache.fetchedAt : 0,
          error: result.error,
          rateLimited: !!(rl.rateLimited || rl.rateLimitResetAt),
          retryAfterMs: rl.rateLimitResetAt ? Math.max(0, rl.rateLimitResetAt - t) : (rl.retryAfterMs || 0),
          throttled: false
        };
      }
      store.write({
        commentId: result.model.commentId,
        body: result.model.body,
        authorLogin: result.model.authorLogin,
        createdAt: result.model.createdAt,
        htmlUrl: result.model.htmlUrl,
        fetchedAt: t,
        rateLimitResetAt: rl.rateLimitResetAt || 0
      });
      lastForceAt = t;
      return {
        model: result.model, fromCache: false, fetchedAt: t,
        error: null, rateLimited: false, retryAfterMs: 0, throttled: false
      };
    }

    function doFetch(cache) {
      return fetchPage(1).then(function (out) {
        if (out.error) return handleResult(out, out, cache);
        /* ASC 端点：评论超过 per_page 时，最新评论在**末页**。
           Link 头有 rel="last" 且页码 > 1 时追加一次请求取末页。
           单页场景（本 issue 当前 13 条）不会触发这次额外请求。 */
        var lastPage = parseLastPageFromLink(out.link);
        if (lastPage > 1) {
          return fetchPage(lastPage).then(function (out2) {
            // 末页取失败时退化为用第 1 页（顺序无关筛选仍可能命中）
            if (out2.error) return handleResult(pickFromData(out.data), out, cache);
            return handleResult(pickFromData(out2.data), out2, cache);
          });
        }
        return handleResult(pickFromData(out.data), out, cache);
      });
    }

    function refresh(options) {
      var force = !!(options && options.force);
      var cache = store.read();
      var t = now();

      // 1) 配额冷却优先级最高 —— 连 force 也不能绕过（绕过只会再撞 403）。
      //    取「实例内冷却」与「缓存落盘的冷却」的较大值：前者覆盖本次会话，
      //    后者覆盖跨刷新的场景。
      var effectiveCooldown = Math.max(cooldownUntil, (cache && cache.rateLimitResetAt) || 0);
      if (effectiveCooldown > t) {
        return Promise.resolve({
          model: toModel(cache), fromCache: true, fetchedAt: cache ? cache.fetchedAt : 0,
          error: null, rateLimited: true, retryAfterMs: effectiveCooldown - t, throttled: false
        });
      }
      // 2) TTL：非 force 且缓存新鲜 → 直接用
      if (!force && store.isFresh(cache, t, minInterval)) {
        return Promise.resolve({
          model: toModel(cache), fromCache: true, fetchedAt: cache.fetchedAt,
          error: null, rateLimited: false, retryAfterMs: 0, throttled: false
        });
      }
      // 3) force 最小间隔：防止用户连点耗尽配额
      if (force && lastForceAt > 0 && (t - lastForceAt) < forceMinInterval) {
        return Promise.resolve({
          model: toModel(cache), fromCache: !!cache, fetchedAt: cache ? cache.fetchedAt : 0,
          error: null, rateLimited: false, retryAfterMs: 0, throttled: true
        });
      }
      // 4) in-flight 去重：并发调用共享同一 Promise
      if (inflight) return inflight;

      inflight = doFetch(cache);
      var cleanup = function () { inflight = null; };
      inflight.then(cleanup, cleanup);
      return inflight;
    }

    function getCached() { return toModel(store.read()); }

    return { refresh: refresh, getCached: getCached, buildEndpoints: buildEndpoints };
  }

  return {
    DEV_PROGRESS_AUTHOR: DEV_PROGRESS_AUTHOR,
    GITHUB_API_BASE: GITHUB_API_BASE,
    GITHUB_REPO: GITHUB_REPO,
    GITHUB_ISSUE_NUMBER: GITHUB_ISSUE_NUMBER,
    CACHE_KEY: CACHE_KEY,
    DEFAULT_MIN_INTERVAL_MS: DEFAULT_MIN_INTERVAL_MS,
    DEFAULT_FORCE_MIN_INTERVAL_MS: DEFAULT_FORCE_MIN_INTERVAL_MS,
    MAX_BODY_LEN: MAX_BODY_LEN,
    LINK_PREFIX: LINK_PREFIX,
    REMAINING_UNKNOWN: REMAINING_UNKNOWN,
    pickLatestOwnComment: pickLatestOwnComment,
    parseGithubRateLimit: parseGithubRateLimit,
    normalizeComment: normalizeComment,
    buildCommentsUrl: buildCommentsUrl,
    parseLastPageFromLink: parseLastPageFromLink,
    createFeedStore: createFeedStore,
    createGithubFeed: createGithubFeed
  };
});
