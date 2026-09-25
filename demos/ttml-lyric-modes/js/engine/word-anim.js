/**
 * 逐字动画 —— 用 Web Animations API（WAAPI）驱动。
 *
 * 为什么从「改 CSS 变量宽度」改成 WAAPI：
 *
 *  我最初用 `clip-path: inset(... var(--p))` + 每帧写自定义属性做揭字。
 *  问题是：① 每帧都要写样式（即便量化也只是减少次数）；② 只能表达「线性推进」，
 *  做不出 AMLL 那种字与字之间相位错开、带缓动的书写感；
 *  ③ 暂停/继续靠开关 CSS 动画，与行级动画难以精确同步。
 *
 *  WAAPI 的好处：动画时间轴由浏览器维护（**播放期零 JS 写入**），
 *  可以精确 `currentTime = t` 定位、`playbackRate = -1` 倒放、
 *  多个动画 `composite: "add"` 叠加（float + emphasize 互不覆盖）。
 *  这正是「性能优先」也能做得好看的原因。
 *
 * 本模块只做三件事：
 *  - 揭字（mask 位移）
 *  - 悬浮（float，字随时间轻微上浮）
 *  - 强调（emphasize，长音上的缩放 + 辉光 + 逐字错峰）
 */

/** 强调动画的采样帧数。32 帧足以让缓动看起来平滑，又不必每帧计算。 */
export const FRAME_QUANTITY = 32;

/** 缓动：进场与出场用不同曲线，形成「书写」感。 */
function bezierIn(x) {
  // 近似 cubic-bezier(0.2, 0.4, 0.58, 1.0)
  const t = x;
  return 1 - (1 - t) ** 3 * (1 - 0.2 * t);
}
function bezierOut(x) {
  // 近似 cubic-bezier(0.3, 0.0, 0.58, 1.0)
  const t = x;
  return t ** 3 * (1 - 0.3 * (1 - t));
}

const clamp01 = (x) => (x < 0 ? 0 : (x > 1 ? 1 : x));
const clampPositive = (x) => (x < 0 ? 0 : x);

/** 分段缓动：前半段用进场曲线，后半段用出场曲线。 */
function makeSplitEasing(mid = 0.5) {
  return (x) => (x < mid
    ? bezierIn(clamp01(x / mid))
    : 1 - bezierOut(clamp01((x - mid) / (1 - mid))));
}

/** 生成「中间亮、两侧暗」的横向渐变，配合 mask-position 形成书写拖尾。 */
export function makeFadeMask(fadeWidth, width, brightAlpha = 1, darkAlpha = 0.2) {
  const totalAspect = 2 + (width > 0 ? fadeWidth / width : 0);
  const widthInTotal = width > 0 ? (fadeWidth / width) / totalAspect : 0;
  const leftPos = (1 - widthInTotal) / 2;
  const bright = `rgba(0,0,0,${brightAlpha})`;
  const dark = `rgba(0,0,0,${darkAlpha})`;
  return {
    image: `linear-gradient(to right,${bright} ${leftPos * 100}%,${dark} ${(leftPos + widthInTotal) * 100}%)`,
    size: `${totalAspect * 100}% 100%`,
  };
}

/**
 * 为一个词创建揭字动画。
 *
 * 实现思路：给词元素打一层 mask（中间透明的窄带），然后把 mask-position
 * 从「词左侧之外」线性推到「词右侧之外」。窄带扫过词面时即形成「正在书写」。
 * 相邻词的动画在时间上首尾相接，因此整行看起来是连续书写而非逐字闪跳。
 *
 * @param {HTMLElement} el 词元素
 * @param {object} opts
 * @param {number} opts.startTime 词起始（毫秒，绝对）
 * @param {number} opts.endTime 词结束（毫秒，绝对）
 * @param {number} opts.lineStartTime 行起始（毫秒，绝对）
 * @param {number} opts.totalDuration 行总时长（毫秒）
 * @param {number} opts.fadeWidth 拖尾宽度（像素）
 * @param {number} opts.width 词宽（像素）
 * @param {number} opts.padding 词内边距（像素）
 * @returns {Animation|null}
 */
export function createRevealAnimation(el, opts) {
  const {
    startTime, endTime, lineStartTime, totalDuration,
    fadeWidth, width, padding,
  } = opts;
  if (!el || !Number.isFinite(startTime) || !Number.isFinite(endTime)) return null;

  const w = Math.max(1, width || el.clientWidth || 1);
  const pad = padding || 0;
  const fade = Math.max(1, fadeWidth || w * 0.5);
  const duration = Math.max(1, totalDuration);

  const { image, size } = makeFadeMask(fade, w, 1, 0.4);
  el.style.maskImage = image;
  el.style.webkitMaskImage = image;
  el.style.maskRepeat = 'no-repeat';
  el.style.webkitMaskRepeat = 'no-repeat';
  el.style.maskOrigin = 'left';
  el.style.webkitMaskOrigin = 'left';
  el.style.maskSize = size;
  el.style.webkitMaskSize = size;

  // 窄带从「词左缘之外」扫到「词右缘之外」，扫过全程即完成揭字
  const from = -(w + pad * 2 + fade);
  const to = 0;
  // 词自身的时间区间映射到行时间轴上的相对位置
  const relStart = clamp01((startTime - lineStartTime) / duration);
  const relEnd = clamp01((Math.max(endTime, startTime + 1) - lineStartTime) / duration);

  const frames = [
    { offset: 0, maskPosition: `${from}px 0` },
    { offset: relStart, maskPosition: `${from}px 0` },
    { offset: relEnd, maskPosition: `${to}px 0` },
    { offset: 1, maskPosition: `${to}px 0` },
  ];

  try {
    const anim = el.animate(frames, { duration, id: `reveal-${startTime}`, fill: 'both' });
    anim.pause();
    return anim;
  } catch (error) {
    console.warn('[engine] 揭字动画创建失败', error);
    return null;
  }
}

/**
 * 悬浮动画：字在演唱期间轻微上浮。
 *
 * 用 `composite: "add"` 与揭字/强调动画叠加，互不覆盖 —— 这是 WAAPI 相对
 * CSS 变量的关键优势（多个动画可以合成到同一属性上）。
 */
export function createFloatAnimation(el, opts) {
  const { startTime, endTime, lineStartTime, isBg } = opts;
  if (!el || !Number.isFinite(startTime)) return null;

  const delay = Math.max(0, startTime - lineStartTime);
  let duration = Math.max(1000, (endTime || startTime + 1000) - startTime);
  let up = 0.05;
  if (isBg) up *= 2;

  try {
    const anim = el.animate(
      [{ transform: 'translateY(0px)' }, { transform: `translateY(${-up}em)` }],
      {
        duration, delay, id: 'float-word', composite: 'add', fill: 'both', easing: 'ease-out',
      },
    );
    anim.pause();
    return anim;
  } catch (error) {
    return null;
  }
}

/**
 * 强调动画：长音字上的缩放 + 辉光 + 逐字错峰。
 *
 * 参数按音长自适应：音越长，位移与辉光越明显（但设了上限，避免夸张）。
 */
export function createEmphasizeAnimations(el, opts) {
  const {
    startTime, endTime, lineStartTime, isBg,
    charIndex, charCount,
  } = opts;
  if (!el || !Number.isFinite(startTime)) return [];

  const delay = clampPositive(startTime - lineStartTime);
  let duration = Math.max(1000, (endTime || startTime + 1000) - startTime);

  let amount = duration / 2000;
  amount = amount > 1 ? Math.sqrt(amount) : amount ** 3;
  let blur = duration / 3000;
  blur = blur > 1 ? Math.sqrt(blur) : blur ** 3;
  amount *= 0.6;
  blur *= 0.5;
  amount = Math.min(1.2, amount);
  blur = Math.min(0.8, blur);

  const anchor = Math.max(1, charCount || 1);
  const perChar = (duration / 2.5) / anchor * (charIndex || 0);
  const wordDelay = delay + perChar;
  const easing = makeSplitEasing();

  const out = [];

  // 缩放 + 辉光
  try {
    const frames = new Array(FRAME_QUANTITY).fill(0).map((_, j) => {
      const x = (j + 1) / FRAME_QUANTITY;
      const p = easing(x);
      const scale = 1 + p * 0.1 * amount;
      const offsetX = -p * 0.03 * amount * ((charCount || 1) / 2 - (charIndex || 0));
      const offsetY = -p * 0.025 * amount;
      return {
        offset: x,
        transform: `scale(${scale.toFixed(4)}) translate(${offsetX.toFixed(4)}em, ${offsetY.toFixed(4)}em)`,
        textShadow: `0 0 ${Math.min(0.3, blur * 0.3).toFixed(3)}em rgba(255,255,255,${(p * blur).toFixed(3)})`,
      };
    });
    const glow = el.animate(frames, {
      duration, delay: wordDelay, id: 'emphasize-glow', iterations: 1,
      composite: 'replace', fill: 'both',
    });
    glow.onfinish = () => glow.pause();
    glow.pause();
    out.push(glow);
  } catch { /* 忽略单字失败 */ }

  // 额外上浮（与 float 叠加，因此 emphasize 时浮得更高）
  try {
    const frames = new Array(FRAME_QUANTITY).fill(0).map((_, j) => {
      const x = (j + 1) / FRAME_QUANTITY;
      let y = Math.sin(x * Math.PI);
      if (isBg) y *= 2;
      return { offset: x, transform: `translateY(${(-y * 0.05).toFixed(4)}em)` };
    });
    const float = el.animate(frames, {
      duration: duration * 1.4, delay: Math.max(0, wordDelay - 400),
      id: 'emphasize-float', iterations: 1, composite: 'add', fill: 'both',
    });
    float.onfinish = () => float.pause();
    float.pause();
    out.push(float);
  } catch { /* 忽略单字失败 */ }

  return out;
}

/**
 * 一组动画的统一控制句柄。
 *
 * 封装「按时刻定位 / 暂停 / 继续 / 倒放 / 销毁」，让渲染层不必理解
 * WAAPI 的细节，也让「性能优先」可以简单地只保留其一部分。
 */
export class WordAnimator {
  /**
   * @param {Array<Animation>} animations
   */
  constructor(animations = []) {
    this.animations = animations.filter(Boolean);
  }

  /** 是否为空（空则无需任何操作，供性能模式跳过）。 */
  get isEmpty() {
    return this.animations.length === 0;
  }

  /**
   * 按绝对时刻定位。
   *
   * @param {number} ms 当前时刻（绝对毫秒）
   * @param {number} lineStartTime 行起始（绝对毫秒）
   * @param {number} shouldPlay 是否应处于播放态
   */
  seek(ms, lineStartTime, shouldPlay) {
    const rel = clampPositive(ms - lineStartTime);
    for (const a of this.animations) {
      a.currentTime = rel;
      a.playbackRate = 1;
      const timing = a.effect?.getComputedTiming?.();
      const duration = Number(timing?.duration ?? 0);
      const delay = Number(timing?.delay ?? 0);
      if (shouldPlay && rel < delay + duration) a.play();
      else a.pause();
    }
  }

  /** 暂停（保持当前帧）。 */
  pause() {
    for (const a of this.animations) a.pause();
  }

  /** 继续。 */
  resume() {
    for (const a of this.animations) {
      const timing = a.effect?.getComputedTiming?.();
      const duration = Number(timing?.duration ?? 0);
      const delay = Number(timing?.delay ?? 0);
      const t = Number(a.currentTime) || 0;
      if (a.playState !== 'finished' && t < delay + duration) a.play();
    }
  }

  /**
   * 倒放退场。
   *
   * 为什么用倒放而不是另做一套退场动画：倒放天然「原路返回」，
   * 观感上像字被收回去，且不需要维护第二套关键帧。
   */
  reverse() {
    for (const a of this.animations) {
      if (a.id === 'float-word' || String(a.id).includes('float')) {
        a.playbackRate = -1;
        a.play();
      }
    }
  }

  /** 取消全部动画（释放浏览器资源）。 */
  cancel() {
    for (const a of this.animations) {
      try { a.cancel(); } catch { /* 已取消 */ }
    }
    this.animations = [];
  }
}
