/**
 * 行元素 —— 一条主行 + 可选的一条**嵌套**背景行。
 *
 * 这是相对我第一版最重要的结构修正。
 *
 * 第一版把背景行当成「独立的行」排进行序列，于是它必须和主行争夺同一个
 * 滚动位置，只能用泳道错开或卫星偏移来回避冲突 —— 这是治标。
 *
 * AMLL 的做法是：背景行**嵌在主行的包裹元素里**，作为一个
 * `bgWrapper` 子元素存在，并拥有自己独立的纵向弹簧（slideY）与缩放。
 * 于是：
 *   - 主行与背景行共享同一个「行位置」，天然同屏，不需要泳道；
 *   - 背景行可以独立做「折叠/展开」动画（未演唱时折叠收敛，演唱时展开）；
 *   - 背景行可以按时间先后出现在主行**上方**（bgFirst）或下方。
 *
 * 结构：
 *   .eng-group            ← 滚动位置由此元素承担
 *     .eng-bgWrapper      ← 仅在 bgFirst 时插到主行之前
 *     .eng-line.eng-main  ← 主行
 *     .eng-bgWrapper      ← 否则在主行之后
 *
 * 每个 .eng-line 内部固定三层：正文 / 翻译 / 音译，避免频繁增删节点。
 */

import { ROLE } from '../model.js';
import {
  createFloatAnimation, createEmphasizeAnimations, createRevealAnimation, WordAnimator,
} from './word-anim.js';

/** 判断一个词是否值得做强调动画（长音、或含 CJK 的多字词）。 */
function shouldEmphasize(word, duration) {
  const text = String(word?.word ?? '').trim();
  if (!text) return false;
  // 时长达阈值的长音，或含标点延长的词
  if (duration >= 900) return true;
  return /[~～ー—…♪]/.test(text);
}

/**
 * 一个词的可视元素与动画句柄。
 * @typedef {{word: object, el: HTMLElement, animator: WordAnimator, subEls: HTMLElement[]}} WordEntry
 */

/**
 * 渲染一行（不含背景行）的元素与内容。
 */
export class LineElement {
  /**
   * @param {object} line 规范化行
   * @param {object} [options]
   * @param {boolean} [options.dynamic=true] 是否启用逐字动画
   * @param {number} [options.fadeWidthRatio=0.6] 揭字拖尾宽度相对字高的比例
   */
  constructor(line, options = {}) {
    this.line = line;
    this.options = { dynamic: true, fadeWidthRatio: 0.6, ...options };

    /** @type {HTMLElement} */
    this.el = document.createElement('div');
    this.el.className = 'eng-line';
    this.el.dataset.role = line.role;
    if (line.isDuet) this.el.classList.add('eng-duet');
    if (line.role === ROLE.BG) this.el.classList.add('eng-bg');
    this.el.dataset.index = String(line.index);

    this.mainEl = document.createElement('div');
    this.mainEl.className = 'eng-main';
    this.transEl = document.createElement('div');
    this.transEl.className = 'eng-sub eng-trans';
    this.romanEl = document.createElement('div');
    this.romanEl.className = 'eng-sub eng-roman';
    this.el.append(this.mainEl, this.transEl, this.romanEl);

    /** @type {WordEntry[]} */
    this.words = [];
    this.built = false;
    this.visible = false;
  }

  /** 取本行的纯文本（用于调试与断言）。 */
  get text() {
    return String(this.line.text || '');
  }

  /**
   * 构建行内 DOM 与动画。仅在进入可视区时调用（延迟构建）。
   */
  build() {
    if (this.built) return;
    this.built = true;

    const words = this.line.words?.length
      ? this.line.words
      : [{ word: this.line.text || '♪', startTime: this.line.startMs, endTime: this.line.endMs }];

    const nonDynamic = !this.options.dynamic;
    if (nonDynamic) {
      // 非逐字模式：整行文本，无动画，成本最低
      this.mainEl.textContent = words.map((w) => String(w.word ?? '')).join('');
    } else {
      for (const word of words) {
        const raw = String(word.word ?? '');
        // 关键：**不能 trim**。
        // 真实 TTML 把词间空格写在 span 内部（<span>When </span>），
        // trim 会吃掉这个空格，英文歌词会连成一片
        //（"When the first light" → "Whenthefirstlight"）。
        // 与 CSS 的 white-space: pre-wrap 配合即可正确渲染。
        if (!raw.trim()) {
          // 纯空白：作为文本节点，保留原样
          this.mainEl.appendChild(document.createTextNode(raw));
          continue;
        }
        const el = document.createElement('span');
        el.className = 'eng-word';
        // 保留首尾空白；仅去掉可能存在的换行/制表（它们由解析器转为空格）
        el.textContent = raw.replace(/[\r\n\t]+/g, ' ');
        this.mainEl.appendChild(el);

        const start = Number.isFinite(word.startTime) ? word.startTime : this.line.startMs;
        const end = Number.isFinite(word.endTime) && word.endTime > start
          ? word.endTime : start + 300;
        const duration = end - start;

        const anims = [];
        const floatAnim = createFloatAnimation(el, {
          startTime: start,
          endTime: end,
          lineStartTime: this.line.startMs,
          isBg: this.line.role === ROLE.BG,
        });
        if (floatAnim) anims.push(floatAnim);

        if (shouldEmphasize(word, duration)) {
          // 强调是针对「词内每个字符」做错峰的，因此这里为整词做一个整体强调
          anims.push(...createEmphasizeAnimations(el, {
            startTime: start,
            endTime: end,
            lineStartTime: this.line.startMs,
            isBg: this.line.role === ROLE.BG,
            charIndex: 0,
            charCount: 1,
          }));
          el.classList.add('eng-emphasize');
        }

        this.words.push({ word, el, animator: new WordAnimator(anims), subEls: [] });
      }
    }

    if (this.line.translatedLyric) this.transEl.textContent = this.line.translatedLyric;
    if (this.line.romanLyric) this.romanEl.textContent = this.line.romanLyric;
  }

  /**
   * 构建揭字动画。
   *
   * 必须在元素已挂载、且完成一次布局之后调用 —— 因为要读字宽。
   * 这也是 `updateMaskImage` 的职责。
   */
  buildRevealAnimations() {
    if (!this.options.dynamic || !this.words.length) return;
    let changed = false;
    for (const entry of this.words) {
      if (entry.reveal) continue;
      const el = entry.el;
      const padding = Number.parseFloat(getComputedStyle(el).paddingLeft) || 0;
      const width = Math.max(1, el.clientWidth - padding * 2);
      const height = Math.max(1, el.clientHeight - padding * 2);
      const fadeWidth = height * this.options.fadeWidthRatio;
      const start = Number.isFinite(entry.word.startTime) ? entry.word.startTime : this.line.startMs;
      const end = Number.isFinite(entry.word.endTime) && entry.word.endTime > start
        ? entry.word.endTime : start + 300;
      const anim = createRevealAnimation(el, {
        startTime: start,
        endTime: end,
        lineStartTime: this.line.startMs,
        totalDuration: Math.max(1, this.line.endMs - this.line.startMs),
        fadeWidth,
        width,
        padding,
      });
      if (anim) {
        entry.reveal = anim;
        entry.animator.animations.push(anim);
        changed = true;
      }
    }
    return changed;
  }

  /**
   * 按当前时刻定位全部动画。
   *
   * @param {number} ms 当前时刻
   * @param {boolean} isActive 是否为当前活动行
   * @param {boolean} isPlaying 是否播放中
   */
  seek(ms, isActive, isPlaying) {
    for (const entry of this.words) {
      entry.animator.seek(ms, this.line.startMs, isPlaying && isActive);
    }
  }

  /** 标记为活动行（触发揭字与强调）。 */
  setActive(active) {
    if (this._active === active) return false;
    this._active = active;
    this.el.classList.toggle('is-active', active);
    if (!active) {
      // 退场：倒放悬浮动画，形成「字被收回」的观感
      for (const entry of this.words) entry.animator.reverse();
    }
    return true;
  }

  /** 从 DOM 移除并释放动画（视口剔除时调用）。 */
  teardown() {
    for (const entry of this.words) entry.animator.cancel();
    this.words = [];
    this.mainEl.textContent = '';
    this.transEl.textContent = '';
    this.romanEl.textContent = '';
    this.built = false;
    this._active = undefined;
  }

  /** 彻底销毁。 */
  dispose() {
    this.teardown();
    this.el.remove();
  }
}

/**
 * 一个「行组」—— 主行 + 可选嵌套背景行。
 *
 * 承担滚动位置（posY 弹簧），并管理背景行的折叠/展开（bgSlideY 弹簧）。
 */
export class LineGroup {
  /**
   * @param {object} group 来自 optimize.buildGroups 的组
   * @param {object} [options]
   * @param {(line: object, options: object) => LineElement} [options.createLine] 行工厂（供子类/方案定制）
   */
  constructor(group, options = {}) {
    this.group = group;
    this.main = options.createLine ? options.createLine(group.main, options) : new LineElement(group.main, options);
    this.bg = group.bg
      ? (options.createLine ? options.createLine(group.bg, options) : new LineElement(group.bg, options))
      : null;

    this.el = document.createElement('div');
    this.el.className = 'eng-group';
    if (group.main.isDuet || group.bg?.line?.isDuet) this.el.classList.add('eng-group-duet');
    this.el.dataset.groupStart = String(Math.round(group.startMs));

    // 背景行先于主行起唱 → 放到主行上方，展开方向相反
    const bgStart = group.bg
      ? (group.bg.words?.[0]?.startTime ?? group.bg.startMs)
      : 0;
    const mainStart = group.main.words?.[0]?.startTime ?? group.main.startMs;
    this.bgFirst = Boolean(group.bg) && bgStart < mainStart;

    this.bgWrapper = null;
    if (this.bg) {
      this.bgWrapper = document.createElement('div');
      this.bgWrapper.className = 'eng-bg-wrap';
      if (this.bgFirst) this.bgWrapper.classList.add('eng-bg-wrap-top');
      this.bgWrapper.appendChild(this.bg.el);
      // 主行内部的三个子元素是 mainEl/transEl/romanEl，需插到整个 line 元素之前/之后
      if (this.bgFirst) this.el.appendChild(this.bgWrapper);
      this.el.appendChild(this.main.el);
      if (!this.bgFirst) this.el.appendChild(this.bgWrapper);
    } else {
      this.el.appendChild(this.main.el);
    }

    this.built = false;
    /** 组内两行的测量高度（前缀和用）。 */
    this.height = 0;
  }

  get startMs() { return this.group.startMs; }

  get endMs() { return this.group.endMs; }

  /** 构建组内内容（延迟到进入可视区）。 */
  build() {
    if (this.built) return;
    this.built = true;
    this.main.build();
    this.bg?.build();
  }

  /** 构建揭字动画（需已挂载并完成布局）。 */
  buildRevealAnimations() {
    this.main.buildRevealAnimations();
    this.bg?.buildRevealAnimations();
  }

  /**
   * 测量组高。
   *
   * 注意背景行是绝对定位或折叠的，测高时必须以「展开态」测量，
   * 否则会把折叠状态的高度当成真实高度，导致滚动距离偏小。
   */
  measure(expanded = true) {
    const prev = this.bgWrapper?.dataset.mode;
    if (expanded && this.bgWrapper) this.bgWrapper.dataset.mode = 'expanded';
    const h = this.el.offsetHeight || 0;
    if (expanded && this.bgWrapper) {
      if (prev === undefined) delete this.bgWrapper.dataset.mode;
      else this.bgWrapper.dataset.mode = prev;
    }
    this.height = h;
    return h;
  }

  /**
   * 更新活动状态与动画时刻。
   *
   * @param {number} ms
   * @param {boolean} isActive
   * @param {boolean} isPlaying
   */
  update(ms, isActive, isPlaying) {
    this.main.setActive(isActive);
    this.main.seek(ms, isActive, isPlaying);
    if (this.bg) {
      // 背景行只要在自身时间窗内就应活跃（它与主行并行，不一定与主行同时起止）
      const bgActive = ms >= this.bg.line.startMs && ms < this.bg.line.endMs;
      this.bg.setActive(bgActive);
      this.bg.seek(ms, bgActive, isPlaying);
    }
  }

  /** 释放内容（视口剔除）。 */
  teardown() {
    this.main.teardown();
    this.bg?.teardown();
    this.built = false;
  }

  /** 彻底销毁。 */
  dispose() {
    this.main.dispose();
    this.bg?.dispose();
    this.el.remove();
  }
}
