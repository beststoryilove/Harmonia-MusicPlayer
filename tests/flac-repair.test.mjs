import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require2 = createRequire(import.meta.url);
const { stFindFlacStreaminfoOffset, stSniffContainer, stTryRepairWaveTail, stBuildFlacContinuationTail, stTryRepairTail } = require2('../js/stFlacRepair.js');

// 构造工具：在 offset 处放置规范 FLAC 头（fLaC + 块头(type=0,len=34) + STREAMINFO 特征值）
function makeFlacHead(offset, total) {
  const b = new Uint8Array(total);
  b.set([0x66, 0x4C, 0x61, 0x43], offset);
  b[offset + 4] = 0x00; // 块头首字节：last=0, type=0(STREAMINFO)
  b[offset + 7] = 34;   // 块长度 BE 低字节
  for (let i = offset + 8; i < offset + 42; i++) b[i] = i & 0xFF;
  return b;
}

// 1) 规范文件：魔数在 0，STREAMINFO 偏移 0，嗅探=flac
{
  const p = makeFlacHead(0, 64);
  assert.equal(stFindFlacStreaminfoOffset(p), 0);
  assert.equal(stSniffContainer(p), 'flac');
}
// 2) 大 ID3 前缀：魔数在 100000（酷狗/网易云带内嵌封面的真实场景）
{
  const p = makeFlacHead(100000, 100064);
  assert.equal(stFindFlacStreaminfoOffset(p), 100000);
}
// 3) 巧合 fLaC 在真头之前（封面二进制数据），须跳过假头找到真 STREAMINFO
{
  const p = new Uint8Array(300000);
  p.set([0x66, 0x4C, 0x61, 0x43], 20);   // 巧合 fLaC
  p[24] = 0x05;                          // 巧合块头 type=5（非 STREAMINFO）
  p.set([0x66, 0x4C, 0x61, 0x43], 100000); // 真头
  p[100004] = 0x00; p[100007] = 34;
  for (let i = 100008; i < 100042; i++) p[i] = i & 0xFF;
  assert.equal(stFindFlacStreaminfoOffset(p), 100000, '应跳过巧合假头');
  assert.equal(stSniffContainer(p), 'flac');
}
// 4) 非 FLAC（m4a ftyp）→ -1/unknown
{
  const p = new Uint8Array(64); p.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], 0);
  assert.equal(stFindFlacStreaminfoOffset(p), -1);
  assert.equal(stSniffContainer(p), 'm4a');
}
// 5) 魔数后 42B 不完整 → -1；纯巧合无真头 → -1/unknown
{
  const p = new Uint8Array(64); p.set([0x66, 0x4C, 0x61, 0x43], 40);
  assert.equal(stFindFlacStreaminfoOffset(p), -1);
}
{
  const p = new Uint8Array(64); p.set([0x66, 0x4C, 0x61, 0x43], 20); p[24] = 0x05;
  assert.equal(stFindFlacStreaminfoOffset(p), -1);
  assert.equal(stSniffContainer(p), 'unknown');
}
// 6) WAV：嗅探识别 + 44B 头修复
{
  const w = new Uint8Array(128);
  w.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  w.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  w.set([0x66, 0x6D, 0x74, 0x20], 12); // "fmt "
  w[20] = 1; w[22] = 2; w[23] = 0; // PCM, channels=2
  w[24] = 0x44; w[25] = 0xAC; w[26] = 0; w[27] = 0; // sampleRate=44100 (0xAC44)
  w[32] = 4; w[33] = 0; // blockAlign=4
  w[34] = 16; w[35] = 0; // bits=16
  assert.equal(stSniffContainer(w), 'wav');
  const out = new Uint8Array(stTryRepairWaveTail(new Uint8Array(8000).fill(0xAA).buffer, w));
  assert.equal(out.length, 44 + 8000);
  assert.deepEqual([...out.subarray(0, 4)], [0x52, 0x49, 0x46, 0x46], 'RIFF 魔数');
  assert.equal(out[22], 2, 'channels 保留');
  assert.equal(out[40] & 0xFF, 8000 & 0xFF, 'data 大小低字节');
}
// 7) 嗅探其他：m4a / 未知 / ID3
{
  const m = new Uint8Array(64); m.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70], 0);
  assert.equal(stSniffContainer(m), 'm4a');
}
assert.equal(stSniffContainer(new Uint8Array(16)), 'unknown');
{
  const id3 = new Uint8Array(64); id3.set([0x49, 0x44, 0x33], 0);
  assert.equal(stSniffContainer(id3), 'mp3-id3');
}
// 8) FLAC 连续流修复：整头原始字节 + 尾段拼接
{
  const head = makeFlacHead(0, 4096); // fLaC + STREAMINFO + 填充
  const tail = new Uint8Array(800).fill(0x11);
  const c = stBuildFlacContinuationTail(tail.buffer, head);
  assert.ok(c && c.byteLength === 4096 + 800, '连续流应为 头+尾');
  const out = new Uint8Array(c);
  assert.deepEqual([...out.subarray(0, 4)], [0x66, 0x4C, 0x61, 0x43]);
  assert.deepEqual([...out.subarray(4096)], [...tail], '尾段接在头部之后');
  // 统一入口也应命中 FLAC 连续流
  const r = stTryRepairTail(tail.buffer, head, head);
  assert.ok(r && r.byteLength === 4096 + 800);
}
// 9) 连续流：非 FLAC / 非法输入 → null
{
  const nonFlac = new Uint8Array(128).fill(0x00);
  assert.equal(stBuildFlacContinuationTail(new Uint8Array(8).buffer, nonFlac), null);
  assert.equal(stBuildFlacContinuationTail(null, makeFlacHead(0, 64)), null);
  assert.equal(stBuildFlacContinuationTail(new Uint8Array(8).buffer, null), null);
}

console.log('flac-repair: 全部断言通过');