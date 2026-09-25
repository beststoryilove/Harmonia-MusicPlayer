/**
 * 弹簧物理 —— 阻尼谐振子的解析解，用于所有位移与缩放动画。
 *
 * 为什么不用 CSS transition / 线性插值：
 *
 *  - 线性插值（我最初的做法）在目标点改变时会**速度突变**，多行同时滚动时
 *    观感是「一格一格跳」；弹簧则天然连续，且带轻微过冲，这是 AMLL 类效果的
 *    核心手感来源。
 *  - CSS transition 的问题是**无法在动画中途改变目标而不跳变**：歌词滚动会
 *    在行边界反复改变目标位置，插值实现会丢掉当前速度。
 *
 * 解析解而非数值积分：给定初位置、初速度、目标位置，直接求出任意时刻的位置
 * 闭式表达式。因此是**帧率无关**的 —— 30fps 与 120fps 下轨迹完全一致，
 * 不会因为掉帧而走样（数值积分版本会）。
 *
 * 数学形式（欠阻尼）：
 *   x(t) = target - (cos(ω_d t)·Δ + sin(ω_d t)·L) · e^(-ζ t)
 * 其中 Δ = target - from，L 由初速度与 Δ 决定，ω_d 为阻尼角频率。
 * 过阻尼（ζ ≥ 1）时退化为纯指数收敛，不带振荡。
 *
 * 参数默认值 (mass=1, damping=10, stiffness=100) 给出临界阻尼附近的收敛，
 * 约 0.5s 到位且几乎不过冲 —— 适合歌词滚动这种需要「跟手但不抖」的场景。
 */

/** 默认弹簧参数。 */
export const DEFAULT_SPRING = Object.freeze({
  mass: 1,
  damping: 10,
  stiffness: 100,
  soft: false,
});

/**
 * 求弹簧位移函数。
 *
 * @param {number} from 起始位置
 * @param {number} velocity 起始速度（单位/秒）
 * @param {number} to 目标位置
 * @param {number} [delay=0] 延迟（秒）；延迟期间保持起始位置
 * @param {object} [params] 弹簧参数
 * @returns {(t: number) => number} 位置关于时间的函数（t 为秒）
 */
export function solveSpring(from, velocity, to, delay = 0, params = {}) {
  const {
    mass = DEFAULT_SPRING.mass,
    damping = DEFAULT_SPRING.damping,
    stiffness = DEFAULT_SPRING.stiffness,
    soft = DEFAULT_SPRING.soft,
  } = params;

  const delta = to - from;

  // 过阻尼 / 临界阻尼 / soft：无振荡的指数收敛
  if (soft || 1 <= damping / (2 * Math.sqrt(stiffness * mass))) {
    const omega = -Math.sqrt(stiffness / mass);
    const leftover = -omega * delta - velocity;
    return (t) => {
      const tt = t - delay;
      if (tt < 0) return from;
      return to - (delta + tt * leftover) * Math.E ** (tt * omega);
    };
  }

  // 欠阻尼：带振荡的收敛
  const dampingFreq = Math.sqrt(4 * mass * stiffness - damping ** 2);
  const leftover = (damping * delta - 2 * mass * velocity) / dampingFreq;
  const dfm = (0.5 * dampingFreq) / mass;
  const dm = -(0.5 * damping) / mass;

  return (t) => {
    const tt = t - delay;
    if (tt < 0) return from;
    return to - (Math.cos(tt * dfm) * delta + Math.sin(tt * dfm) * leftover) * Math.E ** (tt * dm);
  };
}

/**
 * 求弹簧位移函数的一阶导数（速度），用于在动画中途改变目标时接续速度。
 *
 * 用**前向差分**而非中心差分：解析解在 t<0 时返回起始值（延迟区间），
 * 中心差分会在 t=0 处采到负时间而被钳制值污染，导致初速度被低估一半
 * （实测 v=50 被算成 25.24）。前向差分只用 t 与 t+h，不受该钳制影响。
 *
 * 之所以用差分而不是解析求导：解析式对过阻尼/欠阻尼两个分支要各写一份，
 * 出错风险高；而这里的量只用于设置初速度，一阶精度已足够。
 *
 * @param {(t: number) => number} solver 位移函数
 * @param {number} [h=1e-4] 差分步长
 * @returns {(t: number) => number} 速度函数
 */
export function velocityOf(solver, h = 1e-4) {
  return (t) => (solver(t + h) - solver(t)) / h;
}

/**
 * 一个弹簧标量：跟踪某个目标值，逐帧推进。
 *
 * 用法（每帧）：
 *   spring.setTarget(100);
 *   spring.update(deltaSeconds);
 *   const y = spring.position;
 */
export class Spring {
  /**
   * @param {number} initial 初始位置
   * @param {object} [params] 弹簧参数
   */
  constructor(initial = 0, params = {}) {
    this.params = { ...DEFAULT_SPRING, ...params };
    this.targetPosition = initial;
    this.currentPosition = initial;
    this.currentTime = 0;
    this._solver = () => this.targetPosition;
    this._velocity = () => 0;
    /** 延迟生效的目标（秒）与位置，用于级联动画。 */
    this._queuedTarget = null;
  }

  /** 位置是否已足够接近目标（可提前收敛，省掉后续计算）。 */
  get arrived() {
    return (
      Math.abs(this.targetPosition - this.currentPosition) < 0.01
      && Math.abs(this._velocity(this.currentTime)) < 0.01
      && this._queuedTarget === null
    );
  }

  /** 当前位置。 */
  get position() {
    return this.currentPosition;
  }

  /** 立即跳到位（不做动画）。 */
  setPosition(value) {
    this.targetPosition = value;
    this.currentPosition = value;
    this._solver = () => this.targetPosition;
    this._velocity = () => 0;
    this._queuedTarget = null;
  }

  /**
   * 设置新的目标位置。
   *
   * 关键点：从**当前位置与当前速度**重解，因此动画中途改目标不会跳变。
   * 这正是 CSS transition 做不到、而歌词滚动必须要的能力。
   *
   * @param {number} value 目标位置
   * @param {number} [delay=0] 延迟（秒）
   */
  setTarget(value, delay = 0) {
    if (delay <= 0 && Math.abs(this.targetPosition - value) < 0.001) {
      this._queuedTarget = null;
      return;
    }
    if (delay > 0) {
      this._queuedTarget = { position: value, time: delay };
      return;
    }
    this._queuedTarget = null;
    this.targetPosition = value;
    this._resetSolver();
  }

  /** 修改弹簧参数（可在运行中改，例如进入间奏时放松）。 */
  updateParams(params = {}, delay = 0) {
    if (delay > 0) {
      this._queuedParams = { ...params, time: delay };
      return;
    }
    this.params = { ...this.params, ...params };
    this._resetSolver();
  }

  _resetSolver() {
    // 用当前速度作为新解的初速度，保证 C1 连续（不跳变）
    const v = this._velocity(this.currentTime);
    this.currentTime = 0;
    this._solver = solveSpring(
      this.currentPosition,
      v,
      this.targetPosition,
      0,
      this.params,
    );
    this._velocity = velocityOf(this._solver);
  }

  /**
   * 推进时间。
   *
   * @param {number} delta 时间步长（秒）
   */
  update(delta = 0) {
    this.currentTime += delta;
    this.currentPosition = this._solver(this.currentTime);

    if (this._queuedParams) {
      this._queuedParams.time -= delta;
      if (this._queuedParams.time <= 0) {
        const { time, ...rest } = this._queuedParams;
        this._queuedParams = null;
        this.updateParams(rest);
      }
    }
    if (this._queuedTarget) {
      this._queuedTarget.time -= delta;
      if (this._queuedTarget.time <= 0) {
        const p = this._queuedTarget.position;
        this._queuedTarget = null;
        this.setTarget(p);
      }
    }
    if (this.arrived) this.setPosition(this.targetPosition);
  }
}

/** 创建一组弹簧（用于按行号索引的批量位移）。 */
export function createSpringMap(initial = 0, params = {}) {
  const map = new Map();
  return {
    get(key) {
      if (!map.has(key)) map.set(key, new Spring(initial, params));
      return map.get(key);
    },
    update(delta) {
      for (const spring of map.values()) spring.update(delta);
    },
    /** 是否全部到位（全部到位则可跳过本帧的样式写入）。 */
    get allArrived() {
      for (const spring of map.values()) if (!spring.arrived) return false;
      return true;
    },
    clear() {
      map.clear();
    },
    get size() {
      return map.size;
    },
  };
}
