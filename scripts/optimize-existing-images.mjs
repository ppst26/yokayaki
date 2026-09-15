// =============================================================
// สคริปต์ Optimize รูปภาพเมนูและโปรโมชั่นที่มีอยู่แล้วในระบบ
//
// รันแบบจำลองดูผลก่อน (ไม่บันทึกจริง):
//   node scripts/optimize-existing-images.mjs --dry-run
//
// รันจริงและอัปเดตลง Supabase + Cloudflare R2:
//   node scripts/optimize-existing-images.mjs
// =============================================================

import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_BASE_URL',
]);

const isDryRun = process.argv.includes('--dry-run');

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const R2_BASE = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
const R2_CACHE_CONTROL = 'public, max-age=31536000, immutable';

function isOurR2Url(url) {
  return typeof url === 'string' && url.startsWith(`${R2_BASE}/`);
}

function r2UrlToKey(url) {
  if (!isOurR2Url(url)) return null;
  return url.slice(R2_BASE.length + 1);
}

async function fetchImageBuffer(url) {
  if (url.startsWith('/')) {
    // Local static file in public directory
    const localPath = join(process.cwd(), 'public', url);
    if (existsSync(localPath)) {
      return readFileSync(localPath);
    }
    throw new Error(`ไม่พบไฟล์บนเครื่อง: ${localPath}`);
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ดาวน์โหลดรูปไม่สำเร็จ (${res.status} ${res.statusText}): ${url}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processTable({ tableName, folder }) {
  console.log(`\n📂 กำลังตรวจสอบตาราง [${tableName}]...`);

  const { data: items, error } = await supabase
    .from(tableName)
    .select('id, name, image_url')
    .not('image_url', 'is', null)
    .order('id', { ascending: true });

  if (error) {
    throw new Error(`ดึงข้อมูล ${tableName} ไม่สำเร็จ: ${error.message}`);
  }

  if (!items || items.length === 0) {
    console.log(`  (ไม่พบรายการที่มีรูปภาพในตาราง ${tableName})`);
    return { checked: 0, optimized: 0, savedBytes: 0 };
  }

  let optimizedCount = 0;
  let skippedCount = 0;
  let savedBytes = 0;

  for (const item of items) {
    const url = item.image_url;
    if (!url) continue;

    try {
      const originalBuffer = await fetchImageBuffer(url);
      const originalSize = originalBuffer.length;
      const meta = await sharp(originalBuffer).metadata();

      const isAlreadySmallWebp =
        meta.format === 'webp' &&
        meta.width <= 640 &&
        meta.height <= 640 &&
        originalSize <= 85 * 1024;

      if (isAlreadySmallWebp) {
        console.log(
          `  ⏭️ #${item.id} "${item.name}": เหมาะสมอยู่แล้ว (${meta.width}x${meta.height} WebP, ${(originalSize / 1024).toFixed(1)} KB) - ข้าม`
        );
        skippedCount++;
        continue;
      }

      // Optimize ด้วย sharp: max 640x640, WebP 82%
      const optimizedBuffer = await sharp(originalBuffer)
        .resize({
          width: 640,
          height: 640,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();

      const newSize = optimizedBuffer.length;
      const reduction = Math.max(0, originalSize - newSize);
      const pct = originalSize > 0 ? ((reduction / originalSize) * 100).toFixed(0) : 0;
      savedBytes += reduction;

      if (isDryRun) {
        console.log(
          `  🔍 [DRY-RUN] #${item.id} "${item.name}": ${(originalSize / 1024).toFixed(1)} KB (${meta.width}x${meta.height}) -> ${(newSize / 1024).toFixed(1)} KB (ลดลง ${pct}%)`
        );
        optimizedCount++;
        continue;
      }

      // 1. Upload new WebP to R2
      const newKey = `${folder}/${randomUUID()}.webp`;
      await r2.send(
        new PutObjectCommand({
          Bucket: env.R2_BUCKET,
          Key: newKey,
          Body: optimizedBuffer,
          ContentType: 'image/webp',
          CacheControl: R2_CACHE_CONTROL,
        })
      );

      const newUrl = `${R2_BASE}/${newKey}`;

      // 2. Update Supabase
      const { error: updateError } = await supabase
        .from(tableName)
        .update({ image_url: newUrl })
        .eq('id', item.id);

      if (updateError) {
        console.error(`  ❌ อัปเดต Supabase ไม่สำเร็จสำหรับ #${item.id}:`, updateError.message);
        continue;
      }

      // 3. Delete old file from R2 if it was our file
      const oldKey = r2UrlToKey(url);
      if (oldKey && oldKey !== newKey) {
        try {
          await r2.send(
            new DeleteObjectCommand({
              Bucket: env.R2_BUCKET,
              Key: oldKey,
            })
          );
        } catch (delErr) {
          console.warn(`  ⚠️ ลบไฟล์เก่าไม่สำเร็จ (${oldKey}):`, delErr.message);
        }
      }

      console.log(
        `  ✨ #${item.id} "${item.name}": ${(originalSize / 1024).toFixed(1)} KB -> ${(newSize / 1024).toFixed(1)} KB (ลดลง ${pct}%) [บันทึกแล้ว]`
      );
      optimizedCount++;
    } catch (err) {
      console.error(`  ⚠️ ข้าม #${item.id} "${item.name}" เนื่องจากข้อผิดพลาด:`, err.message);
    }
  }

  return { checked: items.length, optimized: optimizedCount, savedBytes };
}

async function main() {
  console.log('='.repeat(60));
  console.log('  🖼️ Yokayaki Batch Image Optimization');
  if (isDryRun) {
    console.log('  (โหมด DRY-RUN: แสดงการจำลองเท่านั้น ไม่มีการเปลี่ยนแปลงจริง)');
  }
  console.log('='.repeat(60));

  const menuStats = await processTable({ tableName: 'menu_items', folder: 'menu' });
  const promoStats = await processTable({ tableName: 'promotions', folder: 'promo' });

  const totalChecked = menuStats.checked + promoStats.checked;
  const totalOptimized = menuStats.optimized + promoStats.optimized;
  const totalSavedMb = (menuStats.savedBytes + promoStats.savedBytes) / (1024 * 1024);

  console.log('\n' + '='.repeat(60));
  console.log('📊 สรุปผลการทำงาน:');
  console.log(`- ตรวจสอบรูปภาพทั้งหมด: ${totalChecked} รายการ`);
  console.log(`- ได้รับการปรับแต่ง (Optimize): ${totalOptimized} รายการ`);
  console.log(`- พื้นที่และแบนด์วิดท์ที่ประหยัดได้: ${totalSavedMb.toFixed(2)} MB`);
  if (isDryRun) {
    console.log('\n💡 หากต้องการดำเนินการจริง ให้รัน:');
    console.log('   node scripts/optimize-existing-images.mjs');
  } else {
    console.log('\n🎉 เสร็จสิ้นการปรับแต่งรูปภาพทั้งหมดเรียบร้อยแล้ว!');
  }
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
