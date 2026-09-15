// =============================================================
// Apply name_en migration to Supabase production
//
//   node scripts/apply-name-en.mjs                       # auto-detect
//   node scripts/apply-name-en.mjs --token <access_token> # use Management API
//   node scripts/apply-name-en.mjs --seed-only            # skip ALTER, seed only
//
// ต้องมีใน .env.local: NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
const db = createClient(supabaseUrl, serviceKey);

// Parse project ref from URL
const ref = new URL(supabaseUrl).hostname.split('.')[0];

const args = process.argv.slice(2);
const tokenIdx = args.indexOf('--token');
const accessToken = tokenIdx !== -1 ? args[tokenIdx + 1] : env.SUPABASE_ACCESS_TOKEN;
const seedOnly = args.includes('--seed-only');

// ─── English name seed data ───────────────────────────────
const SEED_DATA = [
  { name: 'กิมจิ', name_en: 'Kimchi' },
  { names: ['เกี้ยวซ่า', 'เกี๊ยวซ่า'], name_en: 'Gyoza' },
  { names: ['ไก่คาราเกะ', 'ไก่คาราอาเกะ'], name_en: 'Chicken Karaage' },
  { name: 'ทาโกะวาซาบิ', name_en: 'Tako Wasabi' },
  { names: ['ถั่วแระญี่ปุ่น', 'ถั่วแระ'], name_en: 'Edamame' },
  { names: ['เฟรนซ์ฟาย', 'เฟรนช์ฟราย'], name_en: 'French Fries' },
  { name: 'ทาโกะยากิ', name_en: 'Takoyaki' },
  { name: 'ยำสาหร่าย', name_en: 'Seaweed Salad' },
  { names: ['ยำแซลมอน', 'ยำแซลมอล', 'ยำแซลม่อน'], name_en: 'Salmon Spicy Salad' },
  { names: ['สลัดแซลมอน', 'สลัดแซลม่อน', 'สลัดแซลมอล'], name_en: 'Tofu Salad' },
  { name: 'สลัดเต้าหู้', name_en: 'Tofu Salad' },
  { names: ['เต้าหู้เย็น', 'เต้าหู้'], name_en: 'Cold Tofu' },
  { names: ['ข้าวหน้าปลาไหล', 'ข้าวหน้าปลาไหลล้น'], name_en: 'Unagi Don' },
  { name: 'ข้าวหน้าเนื้อ', name_en: 'Gyudon (Beef Rice Bowl)' },
  { name: 'ข้าวหน้าหมู', name_en: 'Butadon (Pork Rice Bowl)' },
  { name: 'ข้าวหน้าแซลมอน', name_en: 'Salmon Don' },
  { name: 'ข้าวหน้าแซลมอนเบริน', name_en: 'Aburi Salmon Don' },
  { name: 'ยากิโซบะ', name_en: 'Yakisoba' },
  { name: 'อูด้ง', name_en: 'Udon' },
  { name: 'อุด้งหมูสไลด์', name_en: 'Pork Udon' },
  { name: 'อุด้งเนื้อสไลด์', name_en: 'Beef Udon' },
  { name: 'ข้าวปั้น', name_en: 'Onigiri' },
  { name: 'ข้าวปั้นทูน่า', name_en: 'Tuna Onigiri' },
  { names: ['ข้าวเปล่า', 'ข้าวสวยญี่ปุ่น'], name_en: 'Japanese Rice' },
  { names: ['แซลมอนซาซิมิ', 'แซลม่อลซาซิมิ', 'ซาซิมิแซลมอน'], name_en: 'Salmon Sashimi' },
  { names: ['ซูชิแซลมอน', 'ซูชิแซลม่อน'], name_en: 'Salmon Sushi' },
  { name: 'ซูชิไข่หวาน', name_en: 'Tamagoyaki Sushi' },
  { names: ['ซูซิไข้กุ้ง', 'ซูชิไข่กุ้ง'], name_en: 'Ebiko Sushi' },
  { names: ['ซูชิแซลม่อลโรล', 'แซลม่อลโรล', 'แซลมอนโรล'], name_en: 'Salmon Roll' },
  { name: 'แคลิฟอร์เนียโรล', name_en: 'California Roll' },
  { name: 'แซลมอนเบิร์นโรล', name_en: 'Aburi Salmon Roll' },
  { name: 'ไข่หวาน', name_en: 'Tamagoyaki (Sweet Egg)' },
  { name: 'ปีกไก่', name_en: 'Grilled Chicken Wings' },
  { name: 'ตับไก่ย่าง', name_en: 'Grilled Chicken Liver' },
  { names: ['หมูสามชั้นย่าง', 'หมูสามชั้นพันเห็ด'], name_en: 'Grilled Pork Belly' },
  { name: 'เนื้อย่าง', name_en: 'Grilled Beef' },
  { name: 'น้ำ', name_en: 'Water' },
];

// ─── Step 1: Check if column exists ───────────────────────
async function columnExists() {
  const { error } = await db.from('menu_items').select('name_en').limit(1);
  return !error;
}

// ─── Step 2: Add column via Management API ────────────────
async function addColumnViaManagementAPI(token) {
  const sql = 'ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT NULL;';
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Management API error (${res.status}): ${body}`);
  }
  console.log('✓ คอลัมน์ name_en ถูกเพิ่มสำเร็จผ่าน Management API');
  return true;
}

// ─── Step 3: Seed English names ───────────────────────────
async function seedEnglishNames() {
  let updated = 0;
  let skipped = 0;

  for (const entry of SEED_DATA) {
    const names = entry.names || [entry.name];
    
    // Find items with matching Thai names that don't have name_en yet
    const { data: items, error } = await db
      .from('menu_items')
      .select('id, name, name_en')
      .in('name', names)
      .is('name_en', null);

    if (error) {
      console.error(`  ✗ Error querying "${names[0]}":`, error.message);
      continue;
    }

    if (!items || items.length === 0) {
      skipped++;
      continue;
    }

    for (const item of items) {
      const { error: updateErr } = await db
        .from('menu_items')
        .update({ name_en: entry.name_en })
        .eq('id', item.id);

      if (updateErr) {
        console.error(`  ✗ Update failed for "${item.name}" (ID ${item.id}):`, updateErr.message);
      } else {
        console.log(`  ✓ ${item.name} → ${entry.name_en}`);
        updated++;
      }
    }
  }

  console.log(`\n📊 สรุป: อัปเดต ${updated} รายการ, ข้าม ${skipped} รายการ (มี name_en แล้วหรือไม่พบ)`);
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log('🍣 Yokayaki — Apply name_en migration\n');

  const exists = await columnExists();

  if (exists) {
    console.log('✓ คอลัมน์ name_en มีอยู่แล้วในฐานข้อมูล');
  } else if (seedOnly) {
    console.error('✗ คอลัมน์ name_en ยังไม่มี — ต้องเพิ่มก่อนถึงจะ seed ได้');
    process.exit(1);
  } else if (accessToken) {
    console.log('→ กำลังเพิ่มคอลัมน์ name_en ผ่าน Management API...');
    await addColumnViaManagementAPI(accessToken);
  } else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ⚠️  ต้องเพิ่มคอลัมน์ name_en ด้วยตนเอง                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('เนื่องจากไม่สามารถเชื่อมต่อ DB โดยตรงได้ (IPv6 + Windows Firewall)');
    console.log('กรุณาทำตามขั้นตอนด้านล่าง:\n');
    console.log('  1. เปิด Supabase Dashboard: https://supabase.com/dashboard/project/' + ref);
    console.log('  2. ไปที่ SQL Editor');
    console.log('  3. วางคำสั่งนี้แล้วกด Run:\n');
    console.log('     ALTER TABLE public.menu_items');
    console.log('     ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT NULL;\n');
    console.log('  4. รัน script นี้อีกครั้งด้วย --seed-only:\n');
    console.log('     node scripts/apply-name-en.mjs --seed-only\n');
    console.log('  หรือ ถ้ามี Supabase Access Token:\n');
    console.log('     node scripts/apply-name-en.mjs --token <your_access_token>\n');
    console.log('  สร้าง token ได้ที่: https://supabase.com/dashboard/account/tokens');
    process.exit(1);
  }

  // Seed English names
  console.log('\n→ กำลัง seed ชื่อเมนูภาษาอังกฤษ...\n');
  await seedEnglishNames();

  console.log('\n🎉 เสร็จสมบูรณ์!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
