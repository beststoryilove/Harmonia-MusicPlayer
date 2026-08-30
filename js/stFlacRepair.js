/* FLAC/WAV 尾段容器修复（智能过渡无损音源支持）
   纯字节操作，无 DOM/Web Audio 依赖；经 Node 导出守卫支持单元测试。
   设计文档：docs/superpowers/specs/2026-08-24-lossless-tail-decode-design.md
   最终方案：FLAC 用「连续流修复」（整头原始字节 + 尾段），WAV 用 44B 合成头。 */
(function (global) {
'use strict';
const MAGIC = [0x66, 0x4C, 0x61, 0x43]; // "fLaC"
function stFindFlacStreaminfoOffset(bytes) {
/* 扫描合法的 FLAC 头：fLaC 魔数 + 首元数据块类型必须为 STREAMINFO(0)。
   关键：封面等二进制数据里常有碰巧的 "fLaC" 字节，须跳过这些假头继续向后找真正的头。
   要求其后 42 字节完整；未找到返回 -1。 */
try {
if (!bytes || bytes.length < 42) return -1;
const limit = bytes.length - 42;
for (let i = 0; i <= limit; i++) {
if (bytes[i] === MAGIC[0] && bytes[i + 1] === MAGIC[1] && bytes[i + 2] === MAGIC[2] && bytes[i + 3] === MAGIC[3] && (bytes[i + 4] & 0x7F) === 0) return i;
}
return -1;
} catch (_) { return -1; }
}
function _stHas(p, i, s) {
/* 4 字节魔数比对（越界安全） */
return p.length >= i + 4 && p[i] === s.charCodeAt(0) && p[i + 1] === s.charCodeAt(1) && p[i + 2] === s.charCodeAt(2) && p[i + 3] === s.charCodeAt(3);
}
function stSniffContainer(prefix) {
/* 识别音频容器类型（用于诊断与修复分流）：wav | m4a | mp3-id3 | ogg | flac | unknown */
try {
if (!prefix) return 'unknown';
const p = prefix instanceof Uint8Array ? prefix : new Uint8Array(prefix);
if (_stHas(p, 0, 'RIFF') && _stHas(p, 8, 'WAVE')) return 'wav';
if (_stHas(p, 4, 'ftyp')) return 'm4a';
if (p[0] === 0x49 && p[1] === 0x44 && p[2] === 0x33) return 'mp3-id3'; /* ID3v2 前缀（mp3/flac 均可能带） */
if (_stHas(p, 0, 'OggS')) return 'ogg';
if (stFindFlacStreaminfoOffset(p) >= 0) return 'flac';
return 'unknown';
} catch (_) { return 'unknown'; }
}
function stExtractWaveHeader(prefix) {
/* 解析标准 PCM WAV 头，返回 {header:44B 模板, blockAlign, channels, sampleRate, bits}；非 PCM WAV 返回 null */
try {
if (!prefix) return null;
const p = prefix instanceof Uint8Array ? prefix : new Uint8Array(prefix);
if (!(_stHas(p, 0, 'RIFF') && _stHas(p, 8, 'WAVE') && _stHas(p, 12, 'fmt '))) return null;
if (p.length < 36) return null;
if ((p[20] | (p[21] << 8)) !== 1) return null; /* 仅支持 fmt=1(PCM) */
const channels = p[22] | (p[23] << 8);
const sampleRate = p[24] | (p[25] << 8) | (p[26] << 16) | (p[27] << 24);
const blockAlign = p[32] | (p[33] << 8);
const bits = p[34] | (p[35] << 8);
if (!channels || !sampleRate || !blockAlign) return null;
const h = new Uint8Array(44);
const id = (o, s) => { h[o] = s.charCodeAt(0); h[o + 1] = s.charCodeAt(1); h[o + 2] = s.charCodeAt(2); h[o + 3] = s.charCodeAt(3); };
const u16 = (o, v) => { h[o] = v & 255; h[o + 1] = (v >> 8) & 255; };
const u32 = (o, v) => { h[o] = v & 255; h[o + 1] = (v >> 8) & 255; h[o + 2] = (v >> 16) & 255; h[o + 3] = (v >> 24) & 255; };
id(0, 'RIFF'); id(8, 'WAVE'); id(12, 'fmt '); id(36, 'data');
u16(20, 1); u16(22, channels); u32(24, sampleRate); u32(28, sampleRate * blockAlign); u16(32, blockAlign); u16(34, bits);
u32(16, 16);
return { header: h, blockAlign, channels, sampleRate, bits };
} catch (_) { return null; }
}
function stTryRepairWaveTail(tailRaw, prefix) {
/* 尾段前补 44B 标准 PCM WAV 头，产出 [RIFF头][PCM尾段]；不可修复返回 null */
try {
if (!tailRaw || !(tailRaw.byteLength > 0)) return null;
const meta = stExtractWaveHeader(prefix);
if (!meta) return null;
const tail = new Uint8Array(tailRaw);
const h = new Uint8Array(meta.header);
const ds = tail.length;
h[40] = ds & 255; h[41] = (ds >> 8) & 255; h[42] = (ds >> 16) & 255; h[43] = (ds >> 24) & 255; /* data 块大小 */
const rs = 36 + ds;
h[4] = rs & 255; h[5] = (rs >> 8) & 255; h[6] = (rs >> 16) & 255; h[7] = (rs >> 24) & 255; /* RIFF 大小 */
const out = new Uint8Array(44 + tail.length);
out.set(h, 0); out.set(tail, 44);
return out.buffer;
} catch (_) { return null; }
}
function stBuildFlacContinuationTail(tailRaw, headRaw) {
/* 连续流修复：把 [整段头部原始字节][尾段字节] 拼成一个连续 FLAC 流。
   头含真实 STREAMINFO + 若干真实音频帧，让解码器先锁流，再自然续到尾部帧（FLAC 帧自带同步码）。
   返回 ArrayBuffer 或 null；仅当头部确认为 FLAC（含 STREAMINFO）时返回，否则 null 交由他路（WAV 等）。 */
try {
if (!tailRaw || !(tailRaw.byteLength > 0) || !headRaw || !(headRaw.byteLength > 0)) return null;
const h = headRaw instanceof Uint8Array ? headRaw : new Uint8Array(headRaw);
if (stFindFlacStreaminfoOffset(h) < 0) return null;
const t = new Uint8Array(tailRaw);
const out = new Uint8Array(h.length + t.length);
out.set(h, 0);
out.set(t, h.length);
return out.buffer;
} catch (_) { return null; }
}
function stTryRepairTail(tailRaw, headRaw, sniffPrefix) {
/* 统一入口：优先 FLAC 连续流修复（整头+尾段），否则退回 WAV 合成 44B 头；均失败返回 null */
try {
const c = stBuildFlacContinuationTail(tailRaw, headRaw);
if (c) return c;
const w = stTryRepairWaveTail(tailRaw, sniffPrefix);
if (w) return w;
return null;
} catch (_) { return null; }
}
global.stFindFlacStreaminfoOffset = stFindFlacStreaminfoOffset;
global.stSniffContainer = stSniffContainer;
global.stTryRepairWaveTail = stTryRepairWaveTail;
global.stBuildFlacContinuationTail = stBuildFlacContinuationTail;
global.stTryRepairTail = stTryRepairTail;
if (typeof module !== 'undefined' && module.exports) module.exports = { stFindFlacStreaminfoOffset, stSniffContainer, stTryRepairWaveTail, stBuildFlacContinuationTail, stTryRepairTail };
})(typeof window !== 'undefined' ? window : globalThis);
