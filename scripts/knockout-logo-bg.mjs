/**
 * แปลงโลโก้ JPEG (พื้นดำฝังในไฟล์) → PNG โปร่งใสจริง
 * ใช้: node scripts/knockout-logo-bg.mjs
 */
import sharp from 'sharp';
import { rename, unlink } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const brandingDir = path.join(root, 'public', 'branding');

const files = ['logo.png', 'logo-dark.png'];
const threshold = 40;

async function knockOutBlack(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= threshold && g <= threshold && b <= threshold) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toFile(outputPath);

  const meta = await sharp(outputPath).metadata();
  console.log(`✓ ${path.basename(outputPath)} — ${meta.width}x${meta.height} PNG (alpha)`);
}

for (const file of files) {
  const input = path.join(brandingDir, file);
  const out = path.join(brandingDir, `${file}.out`);
  await knockOutBlack(input, out);
  await unlink(input).catch(() => {});
  await rename(out, input);
}

console.log('Done — replaced originals with transparent PNG');
