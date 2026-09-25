/**
 * 布局引擎 —— 像素级滚动 + 每行独立弹簧 + 视口剔除。
 *
 * 这是整套效果的「骨架」。三个设计决定，每一个都针对我第一版的具体缺陷：
 *
 * ① **每行各有一条 Y 弹簧**，而不是「一个全局滚动偏移」。
 *    第一版用「当前行下标 × 固定行高」算位移，公式上等于是「整体匀速平移」，
 *    所有行同时启动、同时停止，观感僵硬。改成每行独立弹簧后：
 *      - 各行的目标位置一次算好，但**分别**用弹簧收敛，天然产生错峰；
 *      - 再叠加逐行递减的 delay（`baseDelay /= 1.05`），形成自下而上的涟漪。
 *    这是 AMLL 手感的关键，也是单纯调 CSS transition 做不出来的。
 *
 * ② **剔除按像素而非按行号**。第一版写死「距焦点 12 行以外剔除」，
 *    但行高是变化的（背景行更矮、长行会换行），按行号剔除要么切太早、
 *    要么留太多离屏节点。按像素 overscan(300px) 判断才是正确的量纲。
 *
 * ③ **剔除时 `teardown()` 释放 WAAPI 动画**，不只是隐藏。
 *    一个 77 行的样本若每行都有逐字动画，浏览器要维护上千条动画时间轴；
 *    离屏即释放，回到视野再重建（`build()` 是幂等的）。
 */

import { Spring } from './spring.js';
import { LineGroup } from './line.js';
import { ROLE } from '../model.js';
import { setStyle, toggleClass, counters } from '../dom.js';

/** 冻结的默认参数。 */
export const LAYOUT_DEFAULTS = Object.freeze({
  /** 焦点行在视口中的纵向比例（0.35 = 略高于中线，符合阅读习惯）。 */
  alignPosition: 0.35,
  /** 视口外仍渲染的像素余量。 */
  overscanPx: 300,
  /** 逐行级联延迟的基数（秒）与衰减比。 */
  baseDelay: 0.05,
  delayDecay: 1.05,
  /** 焦点对齐锚点：中心 / 顶部 / 底部。 */
  anchor: 'center',
  /** 是否启用弹簧；关掉则直接跳位（性能模式）。 */
  enableSpring: true,
  /** 是否启用模糊。 */
  enableBlur: true,
  /** 模糊强度倍率（性能模式可设为 0.5 做「轻量模糊」）。 */
  blurScale: 1,
  /** 是否启用逐字动画（关掉则整行文本，成本最低）。 */
  dynamic: true,
  /** 已唱过的行是否淡出隐藏。 */
  hidePassedLines: false,
  /** 弹簧参数。 */
  spring: { mass: 1, damping: 10, stiffness: 100 },
});

const ANCHOR_FACTOR = Object.freeze({ top: 0, center: 0.5, bottom: 1 });

/**
 * 歌词布局引擎。
 *
 * 生命周期：
 *   new LyricLayoutEngine(opts)
 *   engine.mount(host)
 *   engine.setGroups(groups)     // 来自 engine/optimize.buildGroups
 *   engine.update(ms, isPlaying) // 每帧
 *   engine.destroy()
 */
export class LyricLayoutEngine {
  /**
   * @param {object} [options] 覆盖 LAYOUT_DEFAULTS
   */
  constructor(options = {}) {
    this.opts = { ...LAYOUT_DEFAULTS, ...options };
    /** @type {LineGroup[]} */
    this.groups = [];
    /** 每组的弹簧（按 index 对齐 this.groups）。 */
    this.springs = [];
    /** 每组高度。 */
    this.heights = [];
    /** 前缀和：prefix[i] = 前 i 组高度之和。 */
    this.prefix = [0];
    /** 每组的背景行折叠弹簧（用于背景行的展开/收起）。 */
    this.bgSprings = [];

    this.host = null;
    this.size = [0, 0];
    this.scrollToIndex = 0;
    this.lastActiveIndex = -1;
    this.measured = false;
    this._rafPending = false;
    this._onResize = null;
  }

  /* ── 生命周期 ─────────────────────────────────────────────────────── */

  /** 挂载到宿主元素。 */
  mount(host) {
    this.host = host;
    this.measureSize();
    this._onResize = () => {
      this.measureSize();
      this.measure();
      // 尺寸变化后必须强制重排一次，否则弹簧会从旧位置缓慢爬过去
      const now = this._lastMs ?? 0;
      this.update(now, this._lastPlaying ?? false, true);
    };
    window.addEventListener('resize', this._onResize);
  }

  /** 测量视口尺寸。 */
  measureSize() {
    this.size = [this.host?.clientWidth || 900, this.host?.clientHeight || 460];
  }

  /**
   * 设置行组：构建 DOM、测量高度、重置弹簧。
   *
   * @param {Array<{main: object, bg: object|null, startMs: number, endMs: number}>} groups
   */
  setGroups(groups) {
    this.destroyGroups();
    this.groups = groups.map((g) => new LineGroup(g, {
      dynamic: this.opts.dynamic,
      ...(this.opts.lineOptions || {}),
    }));
    this.springs = this.groups.map(() => new Spring(0, this.opts.spring));
    this.bgSprings = this.groups.map(() => new Spring(this.opts.bgHiddenSlide ?? -80, this.opts.spring));
    for (const group of this.groups) {
      if (this.host) this.host.appendChild(group.el);
    }
    this.measure();
    this.measured = true;
    this.scrollToIndex = 0;
    this.lastActiveIndex = -1;
  }

  /**
   * 测量所有组高并重建前缀和。
   *
   * 两个必须遵守的前提，缺一个就会测出错的高度，进而让整个滚动数学失准：
   *
   *  1. **先 build() 再测**。行内容是延迟构建的（进入视口才建），
   *     若在空元素上量高度，只能得到 padding（实测 38px，而真实卡片约 119~166px）。
   *     前缀和因此被严重低估 → 行距过小 → 卡片互相压叠。
   *  2. **先置于可见 + 展开态**。`content-visibility` 与折叠的背景行都会
   *     让 offsetHeight 返回占位值而非真实高度。
   */
  measure() {
    if (!this.groups.length) {
      this.heights = [];
      this.prefix = [0];
      return;
    }
    const heights = [];
    for (const group of this.groups) {
      // 前提 1：确保内容已构建
      group.build();
      // 前提 2：临时解除离屏隐藏
      const wasHidden = group.el.dataset.offscreen === '1';
      if (wasHidden) group.el.dataset.offscreen = '0';
      heights.push(group.measure(true));
      if (wasHidden) group.el.dataset.offscreen = '1';
    }
    this.heights = heights;
    const prefix = [0];
    for (let i = 0; i < heights.length; i += 1) prefix.push(prefix[i] + heights[i]);
    this.prefix = prefix;
  }

  /* ── 活动行定位 ───────────────────────────────────────────────────── */

  /**
   * 由时刻求「当前应对齐到哪一组」。
   *
   * 用「最后一个起点 <= ms 的组」而不是「活动集合里最早的那组」：
   * 行与行之间常有空隙，若按活动集合判定，空隙期间会退回到更早的组，
   * 造成来回抖动。这与 AMLL 用 playbackCursor 单调推进的思路一致。
   *
   * @param {number} ms
   * @returns {number} 组下标
   */
  findScrollIndex(ms) {
    const n = this.groups.length;
    if (!n) return 0;
    let lo = 0;
    let hi = n - 1;
    let ans = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (this.groups[mid].startMs <= ms) {
        ans = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return ans;
  }

  /**
   * 计算某组应处的像素 Y。
   *
   * Y(i) = 视口对齐线 + (prefix[i] - prefix[target]) - 目标组高 × 锚点系数
   *
   * @param {number} i 组下标
   * @param {number} target 对齐目标组下标
   * @returns {number}
   */
  yFor(i, target) {
    const alignY = this.size[1] * this.opts.alignPosition;
    const targetH = this.heights[target] ?? (this.size[1] / 5);
    const anchorFactor = ANCHOR_FACTOR[this.opts.anchor] ?? 0.5;
    return alignY + (this.prefix[i] - this.prefix[target]) - targetH * anchorFactor;
  }

  /**
   * 计算模糊与透明度。
   *
   * 模糊强度按「距活动区的行数」线性增长（上限 5px）——
   * 与 AMLL 一致：近处轻微虚化，远处重虚化，形成景深。
   *
   * @param {number} i 组下标
   * @param {number} activeIndex 当前活动组
   * @param {number} latestIndex 已进入的活动区末组
   * @param {boolean} isActive
   * @returns {{blur: number, opacity: number}}
   */
  fogFor(i, activeIndex, latestIndex, isActive) {
    let blur = 0;
    let opacity = 1;
    if (this.opts.enableBlur && !isActive) {
      blur = 1;
      if (i < activeIndex) blur += Math.abs(activeIndex - i) + 1;
      else blur += Math.abs(i - Math.max(activeIndex, latestIndex));
      if (window.innerWidth <= 1024) blur *= 0.8;
    }
    return { blur: Math.min(5, blur), opacity };
  }

  /* ── 每帧更新 ─────────────────────────────────────────────────────── */

  /**
   * 推进一帧。
   *
   * @param {number} ms 当前时刻（毫秒）
   * @param {boolean} isPlaying 是否播放中
   * @param {boolean} [force=false] 强制跳位（不跑弹簧，用于 seek / 首次布局）
   */
  update(ms, isPlaying, force = false) {
    this._lastMs = ms;
    this._lastPlaying = isPlaying;
    if (!this.measured || !this.groups.length) return;

    const target = this.findScrollIndex(ms);
    this.scrollToIndex = target;
    this.lastActiveIndex = target;

    // 活动区末组：把「已经进入但还没唱完」的相邻组算作活动，避免刚起唱就被虚化
    let latestIndex = target;
    for (let i = target + 1; i < this.groups.length; i += 1) {
      if (this.groups[i].startMs <= ms + 1) latestIndex = i;
      else break;
    }

    const alignY = this.size[1] * this.opts.alignPosition;
    let delay = 0;
    let baseDelay = this.opts.baseDelay;

    for (let i = 0; i < this.groups.length; i += 1) {
      const group = this.groups[i];
      const targetY = this.yFor(i, target);

      // 是否在渲染范围内（按像素，含 overscan）
      const buffer = (this.size[1] / 5) * 2;
      const inSight = targetY > -(this.opts.overscanPx + buffer)
        && targetY < this.size[1] + this.opts.overscanPx + buffer;

      if (inSight) {
        if (group.el.dataset.offscreen === '1') {
          group.el.dataset.offscreen = '0';
          // 重新进入视野：必须先构建内容，并**立刻**跳到正确位置，
          // 否则弹簧会从旧位置（可能是很远处）慢慢爬过来，出现「飞入」
          group.build();
          this.springs[i].setPosition(targetY);
          setStyle(group.el, 'transform', `translate3d(0,${targetY.toFixed(2)}px,0)`);
        }
        group.build();
      } else if (group.el.dataset.offscreen !== '1') {
        group.el.dataset.offscreen = '1';
        group.teardown();
      }

      const isActive = i >= target && i <= latestIndex;
      const { blur, opacity } = this.fogFor(i, target, latestIndex, isActive);

      // 弹簴推进
      if (force || !this.opts.enableSpring) {
        this.springs[i].setPosition(targetY);
      } else {
        this.springs[i].setTarget(targetY, delay);
      }

      // 背景行折叠：活动时展开（slideY → 0），否则收起到一侧
      if (group.bgWrapper) {
        const bgTarget = isActive || !isPlaying
          ? 0
          : (group.bgFirst ? 80 : -80);
        if (force || !this.opts.enableSpring) this.bgSprings[i].setPosition(bgTarget);
        else this.bgSprings[i].setTarget(bgTarget);
      }

      if (inSight) {
        this.renderGroup(i, isActive, blur, opacity);
      }

      // 级联延迟：只在已经进入视口上方的行累加，且越靠后越小 → 涟漪
      if (targetY >= 0) {
        delay += baseDelay;
        if (i >= target) baseDelay /= this.opts.delayDecay;
      }
    }
  }

  /**
   * 推进弹簧时间并写入样式。
   *
   * 与 update 分离，是为了让外部（app.js）可以用**真实帧间隔**驱动弹簧，
   * 而不是假定固定 16.7ms —— 掉帧时轨迹依然正确（解析解保证帧率无关）。
   *
   * @param {number} delta 帧间隔（秒）
   * @param {number} ms 当前时刻
   * @param {boolean} isPlaying
   */
  step(delta, ms, isPlaying) {
    if (!this.measured) return;
    for (let i = 0; i < this.groups.length; i += 1) {
      this.springs[i].update(delta);
      this.bgSprings[i].update(delta);
    }
    this.writeStyles(ms, isPlaying);
  }

  /** 把弹簧当前位置写入 DOM。 */
  writeStyles(ms, isPlaying) {
    const target = this.scrollToIndex;
    let latestIndex = target;
    for (let i = target + 1; i < this.groups.length; i += 1) {
      if (this.groups[i].startMs <= ms + 1) latestIndex = i;
      else break;
    }

    for (let i = 0; i < this.groups.length; i += 1) {
      const group = this.groups[i];
      if (group.el.dataset.offscreen === '1') continue;
      const isActive = i >= target && i <= latestIndex;
      const { blur, opacity } = this.fogFor(i, target, latestIndex, isActive);
      this.renderGroup(i, isActive, blur, opacity);
      group.update(ms, isActive, isPlaying);
    }
  }

  /** 把某一组的弹簧值写进样式。 */
  renderGroup(i, isActive, blur, opacity) {
    const group = this.groups[i];
    const y = this.springs[i].position;

    // 写入统一走 dom.js 原语：既做「值未变则跳过」的去重，也让诊断面板
    // 能精确统计真实写入次数。若这里直接写 style，性能对比就失去依据。
    setStyle(group.el, 'transform', `translate3d(0,${y.toFixed(2)}px,0)`);

    if (Math.abs(opacity - (group._lastOpacity ?? -1)) >= 0.02) {
      group._lastOpacity = opacity;
      setStyle(group.el, 'opacity', String(opacity));
    }
    const b = Math.min(5, blur) * this.opts.blurScale;
    if (Math.abs(b - (group._lastBlur ?? -1)) >= 0.05) {
      group._lastBlur = b;
      setStyle(group.el, 'filter', b > 0.01 ? `blur(${b.toFixed(2)}px)` : 'none');
    }
    if (group._lastActive !== isActive) {
      group._lastActive = isActive;
      toggleClass(group.el, 'is-active', isActive);
      if (group.bgWrapper) toggleClass(group.bgWrapper, 'is-shown', isActive);
    }

    // 背景行折叠位移
    if (group.bgWrapper) {
      const slide = this.bgSprings[i].position;
      const progress = Math.max(0, Math.min(1, 1 - Math.abs(slide) / 80));
      const scale = (0.8 + progress * 0.2).toFixed(3);
      const height = group.bgWrapper.offsetHeight || 0;
      let ty = (slide / 100) * height;
      if (group.bgFirst) ty += -height * (1 - progress);
      setStyle(group.bgWrapper, 'transform', `translate3d(0,${ty.toFixed(2)}px,0) scale(${scale})`);
      setStyle(group.bgWrapper, 'opacity', progress.toFixed(3));
    }
  }

  /* ── 清理 ─────────────────────────────────────────────────────────── */

  /** 销毁全部行组。 */
  destroyGroups() {
    for (const group of this.groups) group.dispose();
    this.groups = [];
    this.springs = [];
    this.bgSprings = [];
    this.heights = [];
    this.prefix = [0];
    this.measured = false;
  }

  /** 彻底销毁。 */
  destroy() {
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this._onResize = null;
    this.destroyGroups();
    this.host = null;
  }

  /** 供诊断面板读取的结构信息。 */
  stats() {
    const offscreen = this.groups.filter((g) => g.el.dataset.offscreen === '1').length;
    const withBg = this.groups.filter((g) => g.bgWrapper).length;
    return {
      groups: this.groups.length,
      offscreen,
      visible: this.groups.length - offscreen,
      withBg,
      totalHeight: Math.round(this.prefix[this.prefix.length - 1] || 0),
    };
  }
}
