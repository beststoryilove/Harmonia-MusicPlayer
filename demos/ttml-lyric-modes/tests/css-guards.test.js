/**
 * CSS 度量风险守卫 —— 静态检查会破坏引擎测量数学的样式写法。
 *
 * 背景：本次重写中连续踩了三个「CSS 让 offsetHeight 失真」的坑，
 * 每一个都表现为「渲染出来位置全错」，但控制台毫无报错，极难定位：
 *
 *  1. `content-visibility: auto` + `contain-intrinsic-size` 常开
 *     → offsetHeight 返回占位值 40px（真实 130px）
 *  2. `contain: strict`（含 size containment）写在组容器上
 *     → 容器忽略子元素尺寸，13px（真实 67~130px）
 *  3. 测量前未 build() 内容（由 engine 的 measure() 保证，见 layout.js）
 *
 * 前两个都是**样式**问题，代码层面看不出。因此用静态检查守住：
 * 只要有人在会参与测量的元素上引入 size containment / 常开的
 * content-visibility，测试立刻失败。
 *
 * 这不是「检查实现细节」——引擎的滚动数学**依赖** offsetHeight 准确，
 * 因此「不破坏测量」是本模块的对外契约之一。
 *
 * 运行：cd Harmonia/demos/ttml-lyric-modes && npm test
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const CSS_DIR = new URL('../css/', import.meta.url);

/** 读取全部 CSS 文件（文件名 → 内容）。 */
function readAllCss() {
  const out = new Map();
  for (const name of readdirSync(CSS_DIR)) {
    if (!name.endsWith('.css')) continue;
    out.set(name, readFileSync(new URL(name, CSS_DIR), 'utf8'));
  }
  return out;
}

/**
 * 去掉 CSS 注释，避免注释里提到的写法被误判。
 * @param {string} css
 */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

test('CSS 守卫：参与测量的元素不得使用 size containment', () => {
  const offenders = [];
  for (const [name, raw] of readAllCss()) {
    const css = stripComments(raw);
    // contain: strict 隐含 size containment；contain: size 亦然
    for (const m of css.matchAll(/contain\s*:\s*([^;{}]+)/g)) {
      const value = m[1].trim().toLowerCase();
      if (/\bstrict\b/.test(value) || /\bsize\b/.test(value)) {
        const line = css.slice(0, m.index).split('\n').length;
        offenders.push(`${name}:${line} contain: ${value}`);
      }
    }
  }
  assert.deepEqual(
    offenders, [],
    'size containment 会让 offsetHeight 忽略子元素尺寸，破坏滚动数学。'
    + `请改用 contain: layout style paint。违规处：\n  ${offenders.join('\n  ')}`,
  );
});

test('CSS 守卫：content-visibility 必须限定在离屏元素上', () => {
  const offenders = [];
  for (const [name, raw] of readAllCss()) {
    const css = stripComments(raw);
    // 找每个声明块，检查 content-visibility: auto 所在选择器是否含 data-offscreen
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*content-visibility\s*:\s*auto[^{}]*)\}/g)) {
      const selector = m[1].trim();
      if (!/data-offscreen/.test(selector)) {
        const line = css.slice(0, m.index).split('\n').length;
        offenders.push(`${name}:${line} 选择器「${selector}」`);
      }
    }
  }
  assert.deepEqual(
    offenders, [],
    'content-visibility: auto 会用 contain-intrinsic-size 的占位值代替真实高度，'
    + '使 offsetHeight 失真（实测 40px vs 真实 130px）。'
    + `必须限定在 [data-offscreen="1"] 元素上。违规处：\n  ${offenders.join('\n  ')}`,
  );
});

test('CSS 守卫：行组必须有可见的高度来源（不被绝对定位压成 0）', () => {
  const css = stripComments(readFileSync(new URL('engine.css', CSS_DIR), 'utf8'));
  const groupRule = /\.eng-group\s*\{([^}]*)\}/.exec(css);
  assert.ok(groupRule, 'engine.css 中应存在 .eng-group 规则');
  const body = groupRule[1];
  // 组不能设固定 height（会与实际内容不符），但必须有 width/position 定义
  assert.ok(/position\s*:\s*absolute/.test(body), '.eng-group 应为绝对定位（由引擎写 transform）');
  assert.ok(/width\s*:/.test(body), '.eng-group 应声明宽度，否则测量宽度为 0');
  assert.ok(
    !/[^-]height\s*:\s*\d/.test(body),
    '.eng-group 不应写死高度：组高由内容（含展开的背景行）决定，写死会让滚动间距错误',
  );
});

test('CSS 守卫：背景行包裹层必须能与「展开态」区分', () => {
  const css = stripComments(readFileSync(new URL('engine.css', CSS_DIR), 'utf8'));
  // .eng-bg-wrap 默认折叠（绝对定位、透明），.is-shown 时回到文档流
  assert.ok(/\.eng-bg-wrap\s*\{/.test(css), '应定义 .eng-bg-wrap 基态');
  assert.ok(/\.eng-bg-wrap\.is-shown\s*\{/.test(css), '应定义 .eng-bg-wrap.is-shown 展开态');
  const base = /\.eng-bg-wrap\s*\{([^}]*)\}/.exec(css)[1];
  const shown = /\.eng-bg-wrap\.is-shown\s*\{([^}]*)\}/.exec(css)[1];
  assert.ok(/position\s*:\s*absolute/.test(base), '基态应绝对定位（不占文档流，不撑高组）');
  assert.ok(/position\s*:\s*relative/.test(shown), '展开态应回到文档流（撑起组高，供滚动计算）');
});
