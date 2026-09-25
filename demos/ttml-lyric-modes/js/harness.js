/**
 * 样本装载 —— 把 TTML 文本变成规范化行模型。
 *
 * 解析走 vendored 的 `vendor/ttml.js`（浏览器安全：无 DOM、无 Node 依赖），
 * 规范化走 `model.js`。两者都是纯函数，因此本模块在浏览器与 node --test 下行为一致。
 */

import { parseTtml } from './vendor/ttml.js';
import { normalizeLines, summarize } from './model.js';

/** 内置样本清单。文件名与 samples/ 目录一致。 */
export const SAMPLES = Object.freeze([
  {
    id: 'background-overlap',
    file: 'background-overlap.ttml',
    name: '背景人声 + 重叠时间轴',
    note: '背景行早于/晚于主行结束；<p> 之间时间轴重叠；三行同时活跃',
  },
  {
    id: 'duet',
    file: 'duet.ttml',
    name: '多声部对唱',
    note: '两个 ttm:agent；行内换声部被切分为独立行；中英混排',
  },
  {
    id: 'sidecar-ruby',
    file: 'sidecar-ruby.ttml',
    name: 'sidecar 翻译 + 注音',
    note: 'iTunesMetadata sidecar 翻译/音译；tts:ruby 假名注音；三种时间格式',
  },
  {
    id: 'real-3402223603',
    file: 'real-3402223603.ttml',
    name: '真实社区歌词（网易云 3402223603）',
    note: '77 行 / 19 背景 / 7 对唱 / 峰值 4 行并发，真实歌词库的容错场景',
  },
  {
    id: 'encanto-bruno',
    file: 'encanto-bruno.ttml',
    name: '真实社区歌词（Encanto · Bruno）',
    note: '长曲目压力样本，用于验证窗口虚拟化与长尾行',
  },
]);

/** samples/ 目录相对本模块的 URL。 */
const SAMPLE_BASE = new URL('../samples/', import.meta.url);

/**
 * 读取一个样本的原文。
 *
 * @param {string} file 文件名
 * @returns {Promise<string>}
 */
export async function fetchSampleText(file) {
  const url = new URL(file, SAMPLE_BASE);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`样本加载失败 ${file}: HTTP ${res.status}`);
  return res.text();
}

/**
 * 解析 TTML 文本为规范化行模型。
 *
 * @param {string} ttmlText
 * @param {object} [options] 透传给 parseTtml
 * @returns {{lines: Array<object>, meta: object, stats: object, warnings: string[]}}
 */
export function parseLyrics(ttmlText, options = {}) {
  const parsed = parseTtml(ttmlText, options);
  const lines = normalizeLines(parsed.lines);
  return {
    lines,
    meta: {
      title: parsed.metadata?.title || '',
      artists: parsed.metadata?.artists || parsed.metadata?.artist || '',
      language: parsed.language || '',
      timing: parsed.timing || '',
      primaryAgent: parsed.primaryAgent || '',
      agents: parsed.agents || [],
    },
    stats: summarize(lines),
    warnings: parsed.warnings || [],
  };
}

/**
 * 装载一个内置样本（读文件 + 解析）。
 *
 * @param {string} id 样本 id
 * @returns {Promise<{sample: object, lines: Array<object>, meta: object, stats: object, warnings: string[], text: string}>}
 */
export async function loadSample(id) {
  const sample = SAMPLES.find((s) => s.id === id) || SAMPLES[0];
  const text = await fetchSampleText(sample.file);
  const parsed = parseLyrics(text);
  return { sample, ...parsed, text };
}

/**
 * 用用户名下的 TTML 文本装载歌词。
 *
 * 与 loadSample 的区别：不读文件、不走网络，且**不吞掉解析失败** ——
 * 用户自己贴的文件出问题时，必须把原因明确回报给 UI，
 * 否则只会看到空歌词而不知道哪里错了。
 *
 * @param {string} text TTML 原文
 * @param {string} [fileName] 文件名（仅用于展示）
 * @returns {{lines: Array<object>, meta: object, stats: object, warnings: string[], text: string, sample: object}}
 * @throws {Error} 解析不出任何歌词行时抛错，附带诊断线索
 */
export function loadUserTtml(text, fileName = '用户文件') {
  const raw = String(text ?? '');
  if (!raw.trim()) throw new Error('文件内容为空');

  // 先做一次廉价的结构体检：给出比「解析出 0 行」更有用的提示
  if (!/<tt[\s>]/i.test(raw) && !/<p[\s>]/i.test(raw)) {
    throw new Error('看起来不是 TTML：未找到 <tt> 或 <p> 标签');
  }

  const parsed = parseLyrics(raw);
  if (!parsed.lines.length) {
    const hints = parsed.warnings.length
      ? `解析提示：${parsed.warnings.slice(0, 3).join('；')}`
      : '未找到带 begin 时间的 <p> 段落';
    throw new Error(`未解析出任何歌词行。${hints}`);
  }

  return {
    sample: {
      id: `user:${fileName}`,
      file: fileName,
      name: fileName,
      note: '来自本机文件',
      isUser: true,
    },
    ...parsed,
    text: raw,
  };
}
