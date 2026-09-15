import { createClient } from '@supabase/supabase-js';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: items } = await db
    .from('menu_items')
    .select('id, name, image_url')
    .or('name.eq.แซลมอนมากิ,name.eq.มากิแซลมอน,name.eq.มากิแซลม่อน,name.eq.แซลม่อนมากิ');

  if (!items || items.length === 0) {
    console.log('ไม่พบเมนู แซลมอนมากิ ในฐานข้อมูล (อาจถูกลบไปแล้ว)');
    return;
  }

  let r2 = null;
  if (env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET) {
    r2 = new S3Client({
      region: 'auto',
      endpoint: 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com',
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  for (const item of items) {
    console.log('กำลังดำเนินการลบเมนู:', item.name, '(ID:', item.id, ')');

    // 1. Delete order_items
    const { error: oiError, count: oiCount } = await db
      .from('order_items')
      .delete({ count: 'exact' })
      .eq('menu_item_id', item.id);

    if (oiError) {
      console.error('ลบ order_items ไม่สำเร็จ:', oiError.message);
      throw oiError;
    }
    console.log('  ✓ ลบ order_items ที่ผูกอยู่:', oiCount, 'รายการ');

    // 2. Delete stock_logs & unlink promotions
    await db.from('stock_logs').delete().eq('menu_item_id', item.id);
    await db.from('promotions').update({ menu_item_id: null }).eq('menu_item_id', item.id);

    // 3. Delete menu_item
    const { error: menuError } = await db.from('menu_items').delete().eq('id', item.id);
    if (menuError) {
      console.error('ลบ menu_item ไม่สำเร็จ:', menuError.message);
      throw menuError;
    }
    console.log('  ✓ ลบเมนูออกจากตาราง menu_items สำเร็จ!');

    // 4. Delete image from R2
    if (r2 && item.image_url && env.R2_PUBLIC_BASE_URL) {
      const base = env.R2_PUBLIC_BASE_URL.replace(/\/+$/, '');
      if (item.image_url.startsWith(base)) {
        const key = item.image_url.slice(base.length + 1);
        try {
          await r2.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
          console.log('  ✓ ลบรูปภาพบน R2 สำเร็จ:', key);
        } catch (r2Err) {
          console.warn('  ⚠️ ลบรูปบน R2 ไม่สำเร็จ:', r2Err.message);
        }
      }
    }
  }

  console.log('\n🎉 ดำเนินการลบเมนู แซลมอนมากิ เรียบร้อยสมบูรณ์แล้ว!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
