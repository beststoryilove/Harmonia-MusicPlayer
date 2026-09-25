/**
 * 时钟与帧调度 —— 全 demo 唯一的时间来源。
 *
 * 设计要点：9 个渲染方案必须共享同一时钟，否则性能对比毫无意义。
 * 因此这里把「时间推进」和「帧广播」集中到一处：
 *  - 单一 rAF 循环，读取所有订阅者；
 *  - 未接音频时，时间由 performance.now() 推导（而非累加），暂停/拖动/变速都不漂移；
 *  - 接了音频后（attachMedia），时间的唯一权威变成 `<audio>.currentTime`，
 *    本时钟只负责「每帧读一次 + 广播」，绝不自行推进 —— 否则会与音频漂移；
 *  - 播放期只有这一处 rAF，方案自身不得再开 rAF（P2 除外，它是 CSS 驱动、完全不订阅帧）。
 */

/** 时钟状态。 */
export const CLOCK_STATE = Object.freeze({
  IDLE: 'idle',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
});

/**
 * 创建一个时钟实例。
 *
 * @param {object} [options]
 * @param {number} [options.durationMs=0] 总时长（毫秒）
 * @param {number} [options.rate=1] 播放倍速
 * @param {(state: object) => void} [options.onFrame] 每帧回调
 * @param {(state: object) => void} [options.onStateChange] 状态变化回调
 * @returns {object} 时钟 API
 */
export function createClock(options = {}) {
  const onFrame = typeof options.onFrame === 'function' ? options.onFrame : () => {};
  const onStateChange = typeof options.onStateChange === 'function' ? options.onStateChange : () => {};

  let durationMs = Math.max(0, Number(options.durationMs) || 0);
  let rate = Number.isFinite(options.rate) && options.rate > 0 ? options.rate : 1;
  let state = CLOCK_STATE.IDLE;
  let positionMs = 0;      // 上次暂停/定位时的基准位置
  let anchorWall = 0;      // 上次进入播放态时的 performance.now()
  let rafId = 0;
  let frameCount = 0;
  let lastFrameWall = 0;
  let frameGaps = [];      // 最近若干帧间隔，用于抖动统计
  /** 距上一帧的秒数，供弹簧使用（首帧给 1/60）。 */
  let lastFrameDeltaSec = 1 / 60;

  /**
   * 已接管的音频元素。非 null 时：
   *  - now() 直接读它的 currentTime（时间的唯一权威）；
   *  - play/pause/seek/setRate 全部转发给它；
   *  - rAF 循环仍在（需要一个「每帧广播」的节拍），但不推进任何时间。
   */
  let media = null;
  let mediaHandlersBound = false;
  /** 媒体事件处理器引用，用于 detach 时精确解绑。 */
  let mediaHandlersRef = null;
  /** 歌词相对音频的偏移（毫秒，正数 = 歌词延后显示）。 */
  let offsetMs = 0;

  /**
   * 当前时刻（毫秒）。
   *
   * 接线要点：接了媒体后，媒体时间是唯一权威，本函数只做「读取 + 偏移」。
   * 偏移在读取侧统一施加，因此各渲染方案无需知道偏移的存在。
   */
  function now() {
    if (media) {
      const sec = Number(media.currentTime);
      const raw = Number.isFinite(sec) ? sec * 1000 : 0;
      return Math.max(0, raw + offsetMs);
    }
    if (state !== CLOCK_STATE.PLAYING) return positionMs;
    const elapsed = (performance.now() - anchorWall) * rate;
    const value = positionMs + elapsed;
    if (durationMs > 0 && value >= durationMs) return durationMs;
    return value;
  }

  /** 组装一帧的状态快照交给订阅者。 */
  function snapshot() {
    return {
      ms: now(),
      state,
      rate,
      durationMs,
      frame: frameCount,
      fps: currentFps(),
      jitterMs: currentJitter(),
      hasMedia: Boolean(media),
      /**
       * 距上一帧的秒数。
       *
       * 弹簧用解析解，本可接受任意步长；但**必须**传真实帧间隔而不是
       * 假定 16.7ms —— 否则掉帧时动画会变慢（时间推进少于真实流逝）。
       * 首帧无上一帧参照，给一个 60fps 的默认值。
       */
      deltaSec: lastFrameDeltaSec,
    };
  }

  function currentFps() {
    if (frameGaps.length < 2) return 0;
    const avg = frameGaps.reduce((a, b) => a + b, 0) / frameGaps.length;
    return avg > 0 ? 1000 / avg : 0;
  }

  function currentJitter() {
    if (frameGaps.length < 3) return 0;
    const avg = frameGaps.reduce((a, b) => a + b, 0) / frameGaps.length;
    const variance = frameGaps.reduce((sum, g) => sum + (g - avg) ** 2, 0) / frameGaps.length;
    return Math.sqrt(variance);
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    const wall = performance.now();
    if (lastFrameWall) {
      const gap = wall - lastFrameWall;
      frameGaps.push(gap);
      if (frameGaps.length > 90) frameGaps.shift();
      // 夹取上限：标签页切回、断点调试后会出现秒级间隔，
      // 若原样喂给弹簧会让动画瞬间「闪」到目标位置
      lastFrameDeltaSec = Math.min(0.1, Math.max(0.001, gap / 1000));
    } else {
      lastFrameDeltaSec = 1 / 60;
    }
    lastFrameWall = wall;
    frameCount += 1;

    // 接了音频时，结束由媒体的 ended 事件驱动，不在这里判时长
    const atEnd = !media && durationMs > 0 && now() >= durationMs;
    onFrame(snapshot());
    if (atEnd) {
      pause();
      state = CLOCK_STATE.ENDED;
      onStateChange(snapshot());
    }
  }

  function startLoop() {
    if (rafId) return;
    lastFrameWall = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (!rafId) return;
    cancelAnimationFrame(rafId);
    rafId = 0;
  }

  /**
   * 进入播放态。
   *
   * 接了媒体时返回 `media.play()` 的 Promise —— 浏览器可能以
   * NotAllowedError 拒绝自动播放（用户尚未交互），调用方需要能感知并提示，
   * 否则表现为「点了没反应」。
   *
   * @returns {Promise<void>|undefined}
   */
  function play() {
    if (media) {
      // 交给媒体元素；状态由它的事件回写，避免两边状态不一致
      let p;
      try {
        p = media.play();
      } catch (error) {
        return Promise.reject(error);
      }
      // 无论成败都要起广播循环：成功后每帧读 currentTime
      startLoop();
      return p && typeof p.then === 'function' ? p : Promise.resolve();
    }
    if (state === CLOCK_STATE.PLAYING) return undefined;
    if (durationMs > 0 && positionMs >= durationMs) positionMs = 0;
    anchorWall = performance.now();
    state = CLOCK_STATE.PLAYING;
    startLoop();
    onStateChange(snapshot());
    return undefined;
  }

  /** 进入暂停态，冻结当前时刻。 */
  function pause() {
    if (media) {
      media.pause();
      // 停掉广播循环：暂停期间没有时间推进，无需每帧唤醒 9 个方案
      stopLoop();
      return;
    }
    if (state !== CLOCK_STATE.PLAYING) return;
    positionMs = now();
    state = CLOCK_STATE.PAUSED;
    stopLoop();
    onStateChange(snapshot());
  }

  /** 播放 / 暂停切换。 */
  function toggle() {
    if (state === CLOCK_STATE.PLAYING) pause();
    else play();
  }

  /**
   * 定位到指定时刻（歌词时间轴口径）。
   *
   * 接了音频时写 media.currentTime：注意要把偏移反解回去 ——
   * 对外的时间口径是「歌词时间 = 音频时间 + 偏移」，所以写回媒体时要减去偏移。
   * 并立即广播一帧，使用户拖动进度条时歌词即时跟上（不必等下一帧）。
   *
   * @param {number} ms
   */
  function seek(ms) {
    const clamped = Math.max(0, durationMs > 0 ? Math.min(ms, durationMs) : ms);
    if (media) {
      try {
        media.currentTime = Math.max(0, (clamped - offsetMs) / 1000);
      } catch { /* 元数据未就绪时赋值可能抛错，忽略 */ }
      positionMs = clamped;
      onFrame(snapshot());
      onStateChange(snapshot());
      return;
    }
    positionMs = clamped;
    anchorWall = performance.now();
    frameGaps = [];
    if (state === CLOCK_STATE.ENDED) state = CLOCK_STATE.PAUSED;
    onFrame(snapshot());
    onStateChange(snapshot());
  }

  /** 相对定位。 */
  function seekBy(deltaMs) {
    seek(now() + deltaMs);
  }

  /** 设置倍速（播放中即时生效，不改变当前时刻）。 */
  function setRate(next) {
    const value = Number(next);
    if (!Number.isFinite(value) || value <= 0) return;
    if (media) {
      // 保持音高不变（浏览器默认），倍速由媒体元素承担
      media.playbackRate = value;
      rate = value;
      onStateChange(snapshot());
      return;
    }
    const current = now();
    positionMs = current;
    anchorWall = performance.now();
    rate = value;
    onStateChange(snapshot());
  }

  /** 设置总时长。 */
  function setDuration(ms) {
    durationMs = Math.max(0, Number(ms) || 0);
    if (durationMs > 0 && positionMs > durationMs) positionMs = durationMs;
    onStateChange(snapshot());
  }

  /**
   * 接管一个 `<audio>` / `<video>` 元素，使其成为时间的唯一权威。
   *
   * 接管后本时钟不再自行推进时间，只做「每帧读 currentTime + 广播」。
   * 这是本 demo 能验证「真实播放」的关键：歌词与音频由同一个时间源驱动，
   * 因此不存在两套时间轴漂移的问题。
   *
   * @param {HTMLMediaElement} el
   * @param {object} [opts]
   * @param {number} [opts.offsetMs=0] 歌词相对音频的偏移（正数 = 歌词延后）
   */
  function attachMedia(el, opts = {}) {
    detachMedia();
    if (!el) return;
    media = el;
    offsetMs = Number(opts.offsetMs) || 0;

    const syncFromMedia = () => {
      state = media.paused
        ? (media.ended ? CLOCK_STATE.ENDED : CLOCK_STATE.PAUSED)
        : CLOCK_STATE.PLAYING;
      if (Number.isFinite(media.duration) && media.duration > 0) {
        durationMs = media.duration * 1000;
      }
      onStateChange(snapshot());
    };
    const onPlay = () => { syncFromMedia(); startLoop(); };
    const onPause = () => { syncFromMedia(); stopLoop(); };
    const onEnded = () => { state = CLOCK_STATE.ENDED; stopLoop(); onFrame(snapshot()); onStateChange(snapshot()); };
    const onLoaded = () => { syncFromMedia(); onFrame(snapshot()); };
    const onSeeked = () => { onFrame(snapshot()); };

    media.addEventListener('play', onPlay);
    media.addEventListener('playing', onPlay);
    media.addEventListener('pause', onPause);
    media.addEventListener('ended', onEnded);
    media.addEventListener('loadedmetadata', onLoaded);
    media.addEventListener('durationchange', onLoaded);
    media.addEventListener('seeked', onSeeked);

    mediaHandlersBound = true;
    mediaHandlersRef = { onPlay, onPause, onEnded, onLoaded, onSeeked };

    if (media.readyState >= 1 && Number.isFinite(media.duration) && media.duration > 0) {
      durationMs = media.duration * 1000;
    }
    syncFromMedia();
  }

  /** 解除对媒体元素的接管，恢复内部时钟推进。 */
  function detachMedia() {
    if (media && mediaHandlersBound && mediaHandlersRef) {
      media.removeEventListener('play', mediaHandlersRef.onPlay);
      media.removeEventListener('playing', mediaHandlersRef.onPlay);
      media.removeEventListener('pause', mediaHandlersRef.onPause);
      media.removeEventListener('ended', mediaHandlersRef.onEnded);
      media.removeEventListener('loadedmetadata', mediaHandlersRef.onLoaded);
      media.removeEventListener('durationchange', mediaHandlersRef.onLoaded);
      media.removeEventListener('seeked', mediaHandlersRef.onSeeked);
    }
    media = null;
    mediaHandlersBound = false;
    mediaHandlersRef = null;
    stopLoop();
  }

  /** 设置歌词相对音频的偏移（毫秒，正数 = 歌词延后）。 */
  function setOffset(ms) {
    offsetMs = Number(ms) || 0;
    onFrame(snapshot());
  }

  /** 停止并复位。 */
  function reset() {
    stopLoop();
    positionMs = 0;
    frameCount = 0;
    frameGaps = [];
    state = CLOCK_STATE.IDLE;
    if (media) { try { media.currentTime = 0; } catch { /* 忽略 */ } }
    onFrame(snapshot());
    onStateChange(snapshot());
  }

  /** 销毁：必须停止 rAF 并解绑媒体，避免切换方案后遗留循环。 */
  function destroy() {
    stopLoop();
    detachMedia();
    state = CLOCK_STATE.IDLE;
  }

  return {
    play, pause, toggle, seek, seekBy, setRate, setDuration, reset, destroy,
    attachMedia, detachMedia, setOffset,
    now,
    snapshot,
    get state() { return state; },
    get rate() { return rate; },
    get durationMs() { return durationMs; },
    get frameCount() { return frameCount; },
    get running() { return Boolean(rafId); },
    get hasMedia() { return Boolean(media); },
    get mediaElement() { return media; },
  };
}
