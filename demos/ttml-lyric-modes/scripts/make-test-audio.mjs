#!/usr/bin/env node
/**
 * 生成测试用音频 —— 一段带整秒报时的 WAV，用于端到端验证「音频驱动歌词」。
 *
 * 为什么需要它：本 demo 支持用户载入音频后由 `<audio>.currentTime` 统一驱动
 * 时间轴。这个行为必须被自动化验证（歌词是否真的跟着声音走），
 * 但仓库里没有可自由分发的音频文件，因此在测试时就地合成一段。
 *
 * 生成内容：每 1 秒开头 120ms 一个 880Hz 短音（第 N 秒的音高随 N 递增），
 * 其余时间静音 —— 这样人耳与程序都能定位到「当前是第几秒」。
 *
 * 用法：node scripts/make-test-audio.mjs [秒数] [输出路径]
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));

/**
 * 合成 16-bit 单声道 PCM WAV。
 *
 * @param {number} seconds 时长（秒）
 * @returns {Buffer} 完整 WAV 文件字节
 */
export function makeWav(seconds = 30) {
  const sampleRate = 22050;          // 够用且体积小（30s ≈ 1.3MB）
  const total = Math.round(seconds * sampleRate);
  const data = Buffer.alloc(total * 2);

  for (let i = 0; i < total; i += 1) {
    const t = i / sampleRate;
    const second = Math.floor(t);
    const inSecond = t - second;
    // 每整秒开头 120ms 发声，音高每秒 +40Hz，便于用耳朵核对秒数
    const beep = inSecond < 0.12;
    let v = 0;
    if (beep) {
      const freq = 660 + (second % 12) * 40;
      // 加一点淡入淡出，避免爆音
      const env = Math.min(1, inSecond / 0.01) * Math.min(1, (0.12 - inSecond) / 0.03);
      v = Math.sin(2 * Math.PI * freq * t) * 0.35 * Math.max(0, env);
    }
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2);
  }

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);        // fmt chunk 大小
  header.writeUInt16LE(1, 20);         // PCM
  header.writeUInt16LE(1, 22);         // 单声道
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28); // 字节率
  header.writeUInt16LE(2, 32);         // 块对齐
  header.writeUInt16LE(16, 34);        // 位深
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);

  return Buffer.concat([header, data]);
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const seconds = Number(process.argv[2]) || 30;
  const out = process.argv[3] || resolve(ROOT, 'scripts/fixtures/beep-30s.wav');
  mkdirSync(dirname(out), { recursive: true });
  const buf = makeWav(seconds);
  writeFileSync(out, buf);
  console.log(`已生成 ${out}（${seconds}s，${(buf.length / 1024 / 1024).toFixed(2)} MB）`);
}
