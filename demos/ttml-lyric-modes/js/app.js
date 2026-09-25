/**
 * Demo 装配层 —— 把样本、时钟、9 个方案、诊断面板接到一起。
 *
 * 职责边界：本模块只做「编排」，不含任何渲染逻辑。
 * 渲染细节全在 js/renderers/*，模型全在 js/model.js，时钟全在 js/scheduler.js。
 */

import { loadSample, SAMPLES, parseLyrics, fetchSampleText, loadUserTtml } from './harness.js';
import { createClock, CLOCK_STATE } from './scheduler.js';
import { createDiagnostics } from './diagnostics.js';
import { resetCounters } from './dom.js';
import { MODES, VARIANTS_BY_MODE, getVariant, selfCheck } from './renderers/index.js';
import { validateInstance } from './renderers/contract.js';
import { selectActiveSet } from './model.js';
import { runSelfTest } from './selftest.js';

/** 应用状态。 */
const state = {
  mode: 'visual',
  variantId: 'v1',
  sampleId: SAMPLES[0].id,
  compare: false,
  /** @type {{lines: Array, meta: object, stats: object, warnings: string[], sample: object}|null} */
  data: null,
  /** @type {Array<{variant: object, instance: object, host: HTMLElement, labelEl: HTMLElement}>} */
  slots: [],
  clock: null,
  diag: null,
  lastFg: null,
  /** 用户自己载入的 TTML（null = 用内置样本）。 */
  userLyrics: null,
  /** 用户 TTML 的文件名，仅用于展示。 */
  userLyricsName: '',
  /** 用户载入的音频 objectURL，卸载时需 revoke。 */
  audioObjectUrl: null,
  /** 用户音频文件名。 */
  audioName: '',
  /** 歌词偏移（毫秒，正数 = 歌词延后）。 */
  offsetMs: 0,
};

/** DOM 引用（启动时一次性缓存）。 */
const el = {};

function cacheDom() {
  el.modeSeg = document.getElementById('modeSeg');
  el.modeDesc = document.getElementById('modeDesc');
  el.variantList = document.getElementById('variantList');
  el.sampleSelect = document.getElementById('sampleSelect');
  el.sampleNote = document.getElementById('sampleNote');
  el.compareToggle = document.getElementById('compareToggle');
  el.stages = document.getElementById('stages');
  el.playBtn = document.getElementById('playBtn');
  el.prevBtn = document.getElementById('prevBtn');
  el.nextBtn = document.getElementById('nextBtn');
  el.scrub = document.getElementById('scrub');
  el.scrubFill = document.getElementById('scrubFill');
  el.timeLabel = document.getElementById('timeLabel');
  el.rateSelect = document.getElementById('rateSelect');
  el.diag = document.getElementById('diag');
  el.report = document.getElementById('report');
  el.dataPill = document.getElementById('dataPill');
  el.statusPill = document.getElementById('statusPill');
  // 用户文件与音频
  el.useOwnLyrics = document.getElementById('useOwnLyrics');
  el.ttmlFile = document.getElementById('ttmlFile');
  el.ttmlFileInfo = document.getElementById('ttmlFileInfo');
  el.audioFile = document.getElementById('audioFile');
  el.audioFileInfo = document.getElementById('audioFileInfo');
  el.autoplayOnLoad = document.getElementById('autoplayOnLoad');
  el.offsetRange = document.getElementById('offsetRange');
  el.offsetValue = document.getElementById('offsetValue');
  el.audioVolume = document.getElementById('audioVolume');
  el.volumeValue = document.getElementById('volumeValue');
  el.clearFilesBtn = document.getElementById('clearFilesBtn');
  el.audioEl = document.getElementById('audioEl');
}

/* ── 工具 ─────────────────────────────────────────────────────────────── */

function formatMs(ms) {
  const total = Math.max(0, ms) / 1000;
  const m = Math.floor(total / 60);
  const s = total - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function createEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

/* ── 侧栏：模式与方案 ─────────────────────────────────────────────────── */

function renderModeSeg() {
  el.modeSeg.textContent = '';
  for (const mode of MODES) {
    const btn = createEl('button', '', mode.name);
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(state.mode === mode.id));
    btn.addEventListener('click', () => selectMode(mode.id));
    el.modeSeg.appendChild(btn);
  }
  const current = MODES.find((m) => m.id === state.mode);
  el.modeDesc.textContent = current ? current.desc : '';
}

function renderVariantList() {
  el.variantList.textContent = '';
  const list = VARIANTS_BY_MODE[state.mode] || [];
  for (const variant of list) {
    const { meta } = variant;
    const card = createEl('button', 'ds-variant');
    card.type = 'button';
    card.setAttribute('aria-pressed', String(state.variantId === meta.id));
    card.dataset.variantId = meta.id;

    const head = createEl('div', 'ds-variant-head');
    head.appendChild(createEl('span', 'ds-variant-name', meta.name));
    const costLabel = { low: '开销低', medium: '开销中', high: '开销高' }[meta.cost] || meta.cost;
    head.appendChild(createEl('span', `ds-variant-cost ${meta.cost}`, costLabel));
    card.appendChild(head);

    card.appendChild(createEl('div', 'ds-variant-tagline', meta.tagline));

    const fixes = createEl('ul', 'ds-variant-fixes');
    for (const fix of meta.fixes) fixes.appendChild(createEl('li', '', fix));
    card.appendChild(fixes);

    card.addEventListener('click', () => selectVariant(meta.id));
    el.variantList.appendChild(card);
  }
}

/* ── 舞台装配 ─────────────────────────────────────────────────────────── */

/**
 * 拆除当前所有方案实例。
 *
 * 顺序很重要：先 destroy 实例（它会清自己的 DOM 与监听），再清空容器，
 * 否则方案内部持有的引用会泄漏。
 */
function teardownSlots() {
  for (const slot of state.slots) {
    try {
      slot.instance.destroy();
    } catch (error) {
      console.error('[demo] destroy 失败', slot.variant?.meta?.id, error);
    }
  }
  state.slots = [];
  el.stages.textContent = '';
  state.lastFg = null;
}

/**
 * 装配舞台。
 *
 * @param {Array<object>} variants 要渲染的方案（对比模式 3 个，单模式 1 个）
 */
function mountSlots(variants) {
  teardownSlots();
  el.stages.classList.toggle('compare', variants.length > 1);

  for (const variant of variants) {
    const cell = createEl('div', 'ds-stage-cell');
    const label = createEl('div', 'ds-stage-label');
    label.innerHTML = `<b>${variant.meta.name}</b> · ${variant.meta.tagline}`;
    const host = createEl('div', 'ds-stage');
    cell.appendChild(label);
    cell.appendChild(host);
    el.stages.appendChild(cell);

    let instance;
    try {
      instance = variant.create({
        lines: state.data.lines,
        meta: state.data.meta,
        stats: state.data.stats,
        clock: state.clock,
      });
      const problems = validateInstance(instance);
      if (problems.length) throw new Error(problems.join('; '));
      instance.mount(host);
    } catch (error) {
      console.error('[demo] 方案装配失败', variant.meta.id, error);
      host.appendChild(createEl('div', 'ds-report fail', `装配失败：${error.message}`));
      continue;
    }
    state.slots.push({ variant, instance, host, labelEl: label });
  }

  // 装配完成后立刻画一帧，避免首帧空白
  drawFrame(state.clock.snapshot());
}

/** 当前激活的方案 id 列表（对比模式 = 当前模式全部 3 个）。 */
function activeVariantIds() {
  if (state.compare) return (VARIANTS_BY_MODE[state.mode] || []).map((v) => v.meta.id);
  return [state.variantId];
}

/* ── 帧循环 ───────────────────────────────────────────────────────────── */

function drawFrame(frame) {
  const ms = frame?.ms ?? 0;

  // 活动行数用于诊断面板（用主模型算一次，与各方案无关）
  const { active } = state.data
    ? selectActiveSet(state.data.lines, ms, null, { maxBg: 4 })
    : { active: [] };

  for (const slot of state.slots) {
    try {
      slot.instance.update(frame);
      // P2 这类 CSS 驱动方案需要知道暂停态，以便冻结 CSS 时间轴
      if (typeof slot.instance.setPaused === 'function') {
        slot.instance.setPaused(frame?.state !== CLOCK_STATE.PLAYING);
      }
    } catch (error) {
      console.error('[demo] update 失败', slot.variant?.meta?.id, error);
    }
  }

  // 走带
  const duration = state.clock.durationMs || 1;
  const pct = Math.max(0, Math.min(1, ms / duration));
  el.scrubFill.style.width = `${(pct * 100).toFixed(3)}%`;
  el.timeLabel.textContent = `${formatMs(ms)} / ${formatMs(duration)}`;

  // 诊断必须在所有 update 之后采样，否则写入计数不完整。
  // 节点数改用方案自报（stats().nodes），不再每帧遍历 DOM ——
  // 实测 countNodes 对 776 节点的舞台每帧要 0.145ms，而它只是给诊断面板看的。
  const nodes = state.slots.reduce((sum, slot) => {
    if (typeof slot.instance.stats === 'function') {
      const st = slot.instance.stats();
      if (Number.isFinite(st.nodes)) return sum + st.nodes;
    }
    return sum;
  }, 0);
  state.diag.sample(frame, { activeLines: active.length, nodes });
  renderDiag();
}

let diagThrottle = 0;

function renderDiag() {
  // 诊断面板每 4 帧刷新一次，避免自己成为性能噪声源
  diagThrottle += 1;
  if (diagThrottle % 4 !== 0) return;
  const s = state.diag.summary();
  const rows = [
    ['FPS', s.fps.toFixed(1), s.fps >= 55 ? 'ok' : (s.fps >= 40 ? 'warn' : 'bad')],
    ['平均帧耗时', `${s.avgFrameMs.toFixed(2)} ms`, s.avgFrameMs <= 18 ? 'ok' : (s.avgFrameMs <= 26 ? 'warn' : 'bad')],
    ['P95 帧耗时', `${s.p95FrameMs.toFixed(2)} ms`, s.p95FrameMs <= 22 ? 'ok' : 'warn'],
    ['最差帧', `${s.worstFrameMs.toFixed(2)} ms`, ''],
    ['掉帧（>32ms）', `${s.jankCount} 次 / ${(s.jankRate * 100).toFixed(1)}%`, s.jankRate < 0.02 ? 'ok' : 'warn'],
    ['—', '', ''],
    ['样式写入 / 帧', s.styleWritesPerFrame.toFixed(1), s.styleWritesPerFrame < 40 ? 'ok' : 'warn'],
    ['写入跳过 / 帧', s.styleSkipsPerFrame.toFixed(1), ''],
    ['class 变更 / 帧', s.classTogglesPerFrame.toFixed(1), ''],
    ['强制布局读取 / 帧', s.layoutReadsPerFrame.toFixed(1), s.layoutReadsPerFrame === 0 ? 'ok' : 'bad'],
    ['rAF 回调 / 帧', s.rafCallbacksPerFrame.toFixed(1), s.rafCallbacksPerFrame <= 1.05 ? 'ok' : 'bad'],
    ['—', '', ''],
    ['当前活动行', String(s.activeLines), ''],
    ['舞台 DOM 节点', String(s.nodes), ''],
    ['采样帧数', String(s.frames), ''],
  ];

  el.diag.textContent = '';
  for (const [label, value, cls] of rows) {
    if (label === '—') {
      el.diag.appendChild(createEl('div', 'ds-diag-sep'));
      continue;
    }
    const row = createEl('div', 'ds-diag-row');
    row.appendChild(createEl('span', 'ds-diag-label', label));
    row.appendChild(createEl('span', `ds-diag-value ${cls}`, value));
    el.diag.appendChild(row);
  }
  // 各方案自报的模型信息
  for (const slot of state.slots) {
    if (typeof slot.instance.stats !== 'function') continue;
    const st = slot.instance.stats();
    const row = createEl('div', 'ds-diag-row');
    row.appendChild(createEl('span', 'ds-diag-label', slot.variant.meta.id));
    row.appendChild(createEl('span', 'ds-diag-value', st.model || ''));
    el.diag.appendChild(row);
  }
}

/* ── 选择动作 ─────────────────────────────────────────────────────────── */

function selectMode(modeId) {
  state.mode = modeId;
  const list = VARIANTS_BY_MODE[modeId] || [];
  if (!list.some((v) => v.meta.id === state.variantId)) {
    state.variantId = list[0]?.meta.id || '';
  }
  renderModeSeg();
  renderVariantList();
  remount();
}

function selectVariant(variantId) {
  state.variantId = variantId;
  renderVariantList();
  remount();
}

function remount() {
  const ids = activeVariantIds();
  const variants = ids.map((id) => getVariant(id)).filter(Boolean);
  state.diag.reset();
  mountSlots(variants);
}

/* ── 样本加载 ─────────────────────────────────────────────────────────── */

/**
 * 应用一份已解析的歌词数据到全局状态并重挂舞台。
 *
 * 内置样本与用户文件走同一条收尾路径，避免两套逻辑分别演进。
 *
 * @param {object} loaded loadSample / loadUserTtml 的结果
 */
function applyLyricsData(loaded) {
  state.data = loaded;
  const st = loaded.stats;

  // 时长口径：有音频时以音频为准（音频是时间的权威），否则用歌词自身跨度兜底。
  // 若音频比歌词短，仍按音频走 —— 否则进度条会拖到没有声音的位置。
  const audioDuration = state.clock.hasMedia && Number.isFinite(el.audioEl.duration)
    ? el.audioEl.duration * 1000
    : 0;
  state.clock.setDuration(audioDuration > 0 ? audioDuration : st.durationMs);

  el.dataPill.textContent =
    `${st.total} 行 · 主 ${st.main} / 对唱 ${st.duet} / 背景 ${st.bg}`
    + ` · 重叠簇 ${st.overlapGroups} · 峰值 ${st.peakConcurrent} 行`;

  const parts = [];
  if (loaded.warnings.length) parts.push(`${loaded.warnings.length} 条解析提示`);
  parts.push(state.clock.hasMedia ? '音频已接管' : '内置时钟');
  setStatus(parts.join(' · '), loaded.warnings.length ? 'warn' : 'ok');

  // 无音频时才回到 0：有音频时「换歌词」不应该把正在播放的进度复位
  if (!state.clock.hasMedia) state.clock.seek(0);

  state.diag.reset();
  remount();
}

async function selectSample(sampleId) {
  state.sampleId = sampleId;
  const sample = SAMPLES.find((s) => s.id === sampleId) || SAMPLES[0];
  // 同步下拉框：selectSample 也会被脚本（自检 / 截图）直接调用，
  // 若只更新 state，UI 会停留在旧样本名上，与实际渲染内容不一致。
  if (el.sampleSelect.value !== sample.id) el.sampleSelect.value = sample.id;
  el.sampleNote.textContent = sample.note;

  // 用户已选择「使用我自己的 TTML」时，切内置样本不改动歌词
  if (state.userLyrics) {
    setStatus('正在使用你自己的 TTML', 'ok');
    return;
  }

  setStatus('加载中…', '');
  try {
    applyLyricsData(await loadSample(sampleId));
  } catch (error) {
    console.error('[demo] 样本加载失败', error);
    setStatus(`加载失败：${error.message}`, 'bad');
  }
}

/**
 * 重跑当前歌词源（用户文件优先，否则内置样本）。
 *
 * 用于音频时长变化后重新计算时长口径，而不必让用户重新选文件。
 */
function reloadCurrentLyrics() {
  if (state.userLyrics) {
    applyLyricsData(state.userLyrics);
  } else {
    selectSample(state.sampleId);
  }
}

/* ── 用户文件 ─────────────────────────────────────────────────────────── */

/** 把字节数格式化为可读字符串。 */
function humanSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / (1024 ** i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** 一次性手势补偿的标志与解绑函数。 */
let gestureRetryArmed = false;
let gestureRetryCleanup = null;

/**
 * 挂一个「下次用户手势时自动补播」的一次性兜底。
 *
 * 为什么需要：浏览器要求音频播放必须由用户手势触发，而载入文件后的
 * 自动播放发生在异步回调里，手势可能已失效（实测 headless 下必然失效）。
 * 若不补偿，用户会看到「文件载入了但没声音」，且不知道该怎么办。
 *
 * 两个关键约束：
 *  1. 必须跳过走带控件上的点击 —— 那些控件自己会 play/pause，
 *     若这里也播一次，就会与按钮的 toggle 互相抵消（点播放反而暂停）。
 *  2. 只在仍未播放时才补播，避免打断正在进行的播放。
 *
 * 触发后立即自行解绑，不会长期驻留监听。
 */
function armGestureRetry() {
  if (gestureRetryArmed) return;
  gestureRetryArmed = true;
  const handler = (event) => {
    if (state.clock.state === CLOCK_STATE.PLAYING) { disarmGestureRetry(); return; }
    // 走带控件由它们自己的处理器负责，这里让位
    if (event.target instanceof Element && event.target.closest('.ds-transport')) return;
    Promise.resolve(state.clock.play())
      .then(() => {
        syncPlayButton();
        disarmGestureRetry();
      })
      .catch(() => { /* 仍失败则保持监听，等下一次手势 */ });
  };
  const events = ['pointerdown', 'keydown'];
  for (const name of events) window.addEventListener(name, handler, { capture: true });
  gestureRetryCleanup = () => {
    for (const name of events) window.removeEventListener(name, handler, { capture: true });
  };
}

/** 解绑手势补偿。 */
function disarmGestureRetry() {
  if (!gestureRetryArmed) return;
  gestureRetryArmed = false;
  gestureRetryCleanup?.();
  gestureRetryCleanup = null;
}

/** 读一个 File 为文本（显式按 UTF-8 解码，便于发现编码异常）。 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('读取文件失败'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * 处理用户选择的 TTML 文件。
 *
 * 失败时保留上一次可用的歌词，只报错 —— 否则用户贴错文件会看到一片空白，
 * 连原来能看的内容都没了。
 */
async function handleTtmlFile(file) {
  if (!file) return;
  setStatus('解析中…', '');
  try {
    const text = await readFileAsText(file);
    const loaded = loadUserTtml(text, file.name);
    state.userLyrics = loaded;
    state.userLyricsName = file.name;
    el.useOwnLyrics.checked = true;
    el.ttmlFileInfo.textContent =
      `✓ ${file.name}（${humanSize(file.size)}）· ${loaded.stats.total} 行`
      + ` · 峰值 ${loaded.stats.peakConcurrent} 行`;
    el.ttmlFileInfo.className = 'ds-file-info ok';
    el.sampleNote.textContent = `当前使用你自己的 TTML：${file.name}`;
    applyLyricsData(loaded);
  } catch (error) {
    console.error('[demo] TTML 解析失败', error);
    el.ttmlFileInfo.textContent = `✗ ${file.name}：${error.message}`;
    el.ttmlFileInfo.className = 'ds-file-info bad';
    setStatus(`TTML 解析失败（已保留原有歌词）`, 'bad');
  }
}

/**
 * 处理用户选择的音频文件。
 *
 * 用 objectURL 挂到 <audio> 上并交给时钟接管：此后音频的 currentTime
 * 就是全 demo 的时间权威，歌词与声音由同一时间源驱动，不会互相漂移。
 */
function handleAudioFile(file) {
  if (!file) return;
  try {
    if (state.audioObjectUrl) URL.revokeObjectURL(state.audioObjectUrl);
    const url = URL.createObjectURL(file);
    state.audioObjectUrl = url;
    state.audioName = file.name;

    el.audioEl.src = url;
    el.audioEl.volume = Number(el.audioVolume.value);
    el.audioFileInfo.textContent = `✓ ${file.name}（${humanSize(file.size)}）`;
    el.audioFileInfo.className = 'ds-file-info ok';

    state.clock.attachMedia(el.audioEl, { offsetMs: state.offsetMs });

    // 元数据到达后才有时长；此时重算时长口径
    const onMeta = () => {
      el.audioEl.removeEventListener('loadedmetadata', onMeta);
      reloadCurrentLyrics();
    };
    if (el.audioEl.readyState >= 1) onMeta();
    else el.audioEl.addEventListener('loadedmetadata', onMeta);

    // 自动播放必须在**用户手势的同步调用栈里**发起：选择文件本身是用户手势，
    // 但 loadedmetadata 是异步回调，等到那时手势已失效，浏览器会以
    // NotAllowedError 拒绝。因此这里立刻 play()（元数据未就绪也没关系）。
    //
    // 若被拒绝（例如通过脚本设值、或异步链路过长），挂一个一次性手势监听
    // 兜底：用户下次点击/按键时自动补播，避免「点了没反应」。
    if (el.autoplayOnLoad.checked) {
      Promise.resolve(state.clock.play())
        .then(() => setStatus(`音频已接管：${file.name}`, 'ok'))
        .catch((error) => {
          console.warn('[demo] 自动播放被拒绝，等待用户手势后重试', error?.name || error);
          armGestureRetry();
          setStatus('已载入音频 · 点击「播放」或按空格开始', 'warn');
        });
      syncPlayButton();
    } else {
      setStatus(`音频已接管：${file.name}`, 'ok');
    }
  } catch (error) {
    console.error('[demo] 音频载入失败', error);
    el.audioFileInfo.textContent = `✗ ${file.name}：${error.message}`;
    el.audioFileInfo.className = 'ds-file-info bad';
    setStatus('音频载入失败', 'bad');
  }
}

/** 清空用户载入的 TTML 与音频，回到内置样本 + 内置时钟。 */
function clearUserFiles() {
  // 音频：先让时钟松手，再释放 objectURL（顺序反了会让 <audio> 抓着一个已失效的 src）
  state.clock.detachMedia();
  el.audioEl.removeAttribute('src');
  try { el.audioEl.load(); } catch { /* 忽略 */ }
  if (state.audioObjectUrl) {
    URL.revokeObjectURL(state.audioObjectUrl);
    state.audioObjectUrl = null;
  }
  state.audioName = '';
  el.audioFile.value = '';
  el.audioFileInfo.textContent = '未选择文件 · 无音频时使用内置时钟';
  el.audioFileInfo.className = 'ds-file-info';

  // TTML
  state.userLyrics = null;
  state.userLyricsName = '';
  el.useOwnLyrics.checked = false;
  el.ttmlFile.value = '';
  el.ttmlFileInfo.textContent = '未选择文件';
  el.ttmlFileInfo.className = 'ds-file-info';

  syncPlayButton();
  setStatus('已清空，回到内置样本', '');
  selectSample(state.sampleId);
}

function wireUserFiles() {
  el.ttmlFile.addEventListener('change', () => {
    const file = el.ttmlFile.files?.[0];
    if (file) handleTtmlFile(file);
  });

  el.audioFile.addEventListener('change', () => {
    const file = el.audioFile.files?.[0];
    if (file) handleAudioFile(file);
  });

  // 取消勾选 = 回到当前内置样本；重新勾选 = 回到用户文件
  el.useOwnLyrics.addEventListener('change', () => {
    if (el.useOwnLyrics.checked) {
      if (state.userLyrics) {
        el.sampleNote.textContent = `当前使用你自己的 TTML：${state.userLyricsName}`;
        applyLyricsData(state.userLyrics);
      } else {
        el.useOwnLyrics.checked = false;
        setStatus('尚未选择 TTML 文件', 'warn');
      }
    } else if (state.userLyrics) {
      setStatus('已切回内置样本', '');
      selectSample(state.sampleId);
    }
  });

  el.offsetRange.addEventListener('input', () => {
    state.offsetMs = Number(el.offsetRange.value);
    el.offsetValue.textContent = `${state.offsetMs} ms`;
    state.clock.setOffset(state.offsetMs);
  });

  el.audioVolume.addEventListener('input', () => {
    const v = Number(el.audioVolume.value);
    el.audioEl.volume = v;
    el.volumeValue.textContent = `${Math.round(v * 100)}%`;
  });

  el.clearFilesBtn.addEventListener('click', clearUserFiles);

  // 拖放整个页面也能载入：按扩展名判断 TTML 还是音频
  window.addEventListener('dragover', (event) => {
    event.preventDefault();
    document.body.classList.add('ds-dragging');
  });
  window.addEventListener('dragleave', (event) => {
    if (event.relatedTarget === null) document.body.classList.remove('ds-dragging');
  });
  window.addEventListener('drop', (event) => {
    event.preventDefault();
    document.body.classList.remove('ds-dragging');
    const files = [...(event.dataTransfer?.files || [])];
    for (const file of files) {
      if (/\.(ttml|xml)$/i.test(file.name)) handleTtmlFile(file);
      else if (/^(audio|video)\//.test(file.type) || /\.(mp3|m4a|aac|flac|wav|ogg|opus|mp4|mkv)$/i.test(file.name)) {
        handleAudioFile(file);
      }
    }
  });
}

function setStatus(text, kind) {
  el.statusPill.textContent = text;
  el.statusPill.className = `ds-badge-pill ${kind || ''}`;
}

/* ── 走带交互 ─────────────────────────────────────────────────────────── */

function wireTransport() {
  el.playBtn.addEventListener('click', () => {
    state.clock.toggle();
    syncPlayButton();
  });

  el.prevBtn.addEventListener('click', () => {
    // 跳到上一个活动行起点（或上一行起点）
    const ms = state.clock.now();
    const lines = state.data?.lines || [];
    let target = 0;
    for (const line of lines) {
      if (line.startMs < ms - 120) target = line.startMs;
      else break;
    }
    state.clock.seek(target);
  });

  el.nextBtn.addEventListener('click', () => {
    const ms = state.clock.now();
    const lines = state.data?.lines || [];
    const next = lines.find((line) => line.startMs > ms + 60);
    state.clock.seek(next ? next.startMs : state.clock.durationMs);
  });

  const scrubTo = (event) => {
    const rect = el.scrub.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    state.clock.seek(ratio * state.clock.durationMs);
  };
  let scrubbing = false;
  el.scrub.addEventListener('pointerdown', (event) => {
    scrubbing = true;
    el.scrub.setPointerCapture?.(event.pointerId);
    scrubTo(event);
  });
  el.scrub.addEventListener('pointermove', (event) => {
    if (scrubbing) scrubTo(event);
  });
  el.scrub.addEventListener('pointerup', (event) => {
    scrubbing = false;
    el.scrub.releasePointerCapture?.(event.pointerId);
  });

  el.rateSelect.addEventListener('change', () => {
    state.clock.setRate(Number(el.rateSelect.value));
  });

  el.compareToggle.addEventListener('change', () => {
    state.compare = el.compareToggle.checked;
    remount();
  });

  // 键盘：空格播放/暂停，左右方向键定位
  window.addEventListener('keydown', (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.code === 'Space') {
      event.preventDefault();
      state.clock.toggle();
      syncPlayButton();
    } else if (event.code === 'ArrowLeft') {
      state.clock.seekBy(event.shiftKey ? -5000 : -1000);
    } else if (event.code === 'ArrowRight') {
      state.clock.seekBy(event.shiftKey ? 5000 : 1000);
    }
  });
}

function syncPlayButton() {
  const playing = state.clock.state === CLOCK_STATE.PLAYING;
  el.playBtn.textContent = playing ? '❚❚ 暂停' : '▶ 播放';
  el.playBtn.classList.toggle('primary', !playing);
}

/* ── 启动 ─────────────────────────────────────────────────────────────── */

async function main() {
  cacheDom();

  // ① 注册表自检：早失败早发现（漏方案 / meta 不合规）
  const problems = selfCheck();
  if (problems.length) {
    console.error('[demo] 方案注册表自检未通过', problems);
    el.report.textContent = `方案注册表自检未通过：\n${problems.join('\n')}`;
  }

  // ② 时钟与诊断
  state.clock = createClock({ durationMs: 0, rate: 1, onFrame: drawFrame });
  state.diag = createDiagnostics();
  state.diag.installRafCounter();
  resetCounters();

  // ③ 样本下拉
  for (const sample of SAMPLES) {
    const opt = createEl('option', '', sample.name);
    opt.value = sample.id;
    el.sampleSelect.appendChild(opt);
  }
  el.sampleSelect.value = state.sampleId;
  el.sampleSelect.addEventListener('change', () => selectSample(el.sampleSelect.value));

  // ④ 静态 UI
  renderModeSeg();
  renderVariantList();
  wireTransport();
  wireUserFiles();
  syncPlayButton();

  // ⑤ 首屏
  await selectSample(state.sampleId);
  el.clockApi = state.clock; // 供 selftest 使用

  // ⑥ 自检（?selftest=1 时运行，结果写入 #report）
  const params = new URLSearchParams(location.search);
  if (params.has('selftest')) {
    try {
      const report = await runSelfTest({
        state,
        getVariant,
        VARIANTS_BY_MODE,
        MODES,
        parseLyrics,
        fetchSampleText,
        SAMPLES,
        clock: state.clock,
      });
      el.report.textContent = report.text;
      for (const line of report.lines) {
        const div = createEl('div', line.pass ? 'pass' : 'fail', line.text);
        el.report.appendChild(div);
      }
      window.__DSH_SELFTEST__ = report.summary;
      document.body.dataset.selftest = report.summary.failed === 0 ? 'pass' : 'fail';
    } catch (error) {
      console.error('[demo] 自检异常', error);
      document.body.dataset.selftest = 'error';
      window.__DSH_SELFTEST__ = { failed: -1, error: String(error?.message || error) };
    }
  }

  // ⑦ 首帧渲染后自动播放（便于截图与观察）
  requestAnimationFrame(() => {
    state.clock.seek(0);
    if (params.has('autoplay')) {
      state.clock.play();
      syncPlayButton();
    }
  });

  window.__DSH_DEMO__ = {
    state,
    selectMode,
    selectVariant,
    selectSample,
    drawFrame,
    get variantIds() { return state.slots.map((s) => s.variant.meta.id); },
  };
}

main().catch((error) => {
  console.error('[demo] 启动失败', error);
  const report = document.getElementById('report');
  if (report) report.textContent = `启动失败：${error?.stack || error}`;
});
