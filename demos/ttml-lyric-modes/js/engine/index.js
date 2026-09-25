/**
 * 引擎层 —— 从 AMLL 学到的技术思路的自研实现。
 *
 * 与参考实现的关系（许可说明）：
 *
 *  本目录**不是** `applemusic-like-lyrics` 的代码移植。它只借鉴其技术方向，
 *  全部代码为自研：
 *    - 弹簧用阻尼谐振子解析解（通用物理，非其专有）
 *    - 背景行嵌套结构（结构性思路）
 *    - WAAPI 做逐字动画（Web 标准 API 的常规用法）
 *    - 像素级 overscan 剔除（常规虚拟化手段）
 *  参考仓库为 AGPL-3.0-only，因此**不复制其任何代码**。
 *
 * 分层与职责：
 *
 *   spring.js       阻尼谐振子解析解（帧率无关），Spring 标量类
 *   optimize.js     歌词清洗 + 主行/背景行关联 + 分组（纯函数，可单测）
 *   word-anim.js    WAAPI 逐字揭字 / 悬浮 / 强调
 *   line.js         行元素 + 行组（主行 + 嵌套背景行）
 *   layout.js       像素级滚动 + 每行独立弹簧 + 视口剔除（布局引擎）
 */

export { Spring, solveSpring, velocityOf, DEFAULT_SPRING, createSpringMap } from './spring.js';
export {
  optimizeLines, buildGroups, DEFAULT_OPTIONS, THRESHOLDS,
} from './optimize.js';
export {
  createRevealAnimation, createFloatAnimation, createEmphasizeAnimations,
  WordAnimator, FRAME_QUANTITY, makeFadeMask,
} from './word-anim.js';
export { LineElement, LineGroup } from './line.js';
export { LyricLayoutEngine, LAYOUT_DEFAULTS } from './layout.js';
