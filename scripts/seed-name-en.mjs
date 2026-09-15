// =============================================================
// Seed name_en for ALL menu items that are missing it
//
//   node scripts/seed-name-en.mjs            # seed missing name_en
//   node scripts/seed-name-en.mjs --dry-run  # preview only
// =============================================================
import { createClient } from '@supabase/supabase-js';
import { loadEnv } from './_env.mjs';

const env = loadEnv();
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = process.argv.includes('--dry-run');

// ─── Mapping: menu item ID → English name ─────────────────
// Based on actual data in production DB (queried 2026-09-15)
const NAME_EN_BY_ID = {
  35: 'Grilled Chicken Gizzard',
  36: 'Salmon Roll',
  37: 'Ikura Sushi',
  // 38 ตับไก่ย่าง → already has name_en
  39: 'Unagi Don',
  40: 'Tuna Sashimi',
  41: 'Grilled Japanese Leek',
  42: 'Gyoza',
  43: 'Engawa Sashimi',
  44: 'California Roll',
  45: 'Seaweed Salad',
  47: 'Grilled Pork Belly with Enoki',
  49: 'Grilled Chicken Wings',
  50: 'Yakisoba',
  51: 'Udon Set',
  53: 'Tako Wasabi',
  54: 'Grilled Aussie Beef Skewer',
  56: 'Spicy Salmon Salad',
  59: 'Cucumber Salad',
  61: 'Tamagoyaki',
  62: 'Pork Udon',
  63: 'Kimchi',
  64: 'Japanese Cold Tofu',
  65: 'Salmon Aburi Roll',
  67: 'Salmon Salad',
  68: 'Grilled Duck Skewer',
  69: 'Grilled Chicken Thigh',
  70: 'Grilled Okra',
  71: 'Grilled Chicken Skin',
  72: 'Grilled Chicken with Leek',
  74: 'Grilled Beef Tongue',
  76: 'Chicken Karaage',
  77: 'Takoyaki',
  78: 'Fried Chicken Tendon',
  79: 'French Fries',
  80: 'Uni Gunkan',
  81: 'Spicy Tuna',
  82: 'Spicy 2 Tone (Salmon & Tuna)',
  83: 'Beef Udon',
  84: 'Zaru Somen',
  85: 'Otoro Sashimi',
  86: 'Chutoro Sashimi',
  87: 'Akami Sashimi',
  88: 'Tuna 3 Kinds (6 pcs)',
  90: 'Kani Sashimi',
  91: 'Yellowfin Tuna',
  92: 'Hotate Sashimi',
  93: 'Hamachi Sashimi',
  95: 'Tuna Sushi',
  96: 'Engawa Sushi',
  97: 'Ika Sushi',
  98: 'Hotate Sushi',
  100: 'Surimi Sushi',
  102: 'Akami Sushi',
  103: 'Chutoro Sushi',
  104: 'Otoro Sushi',
  109: 'Asahi Beer',
  110: 'Kirin Beer',
  111: 'Singha Beer',
  112: 'Hoegaarden Rosé',
  113: 'Sapporo (Can)',
  114: 'Wine Red/White',
  115: 'Regency Brandy',
  116: 'Soda',
  117: 'Coca-Cola',
  118: 'Schweppes',
  119: 'Ice',
  120: 'Japanese Rice',
  122: 'Akami Sashimi',
  123: 'Chutoro Sashimi',
  124: 'Otoro Sashimi',
  125: 'Grilled Ray Fin',
  126: 'Special Murasaki Uni',
  127: 'Tuna Salad',
  128: 'Crispy Silver Fish Salad',
  129: 'Japanese Oyster',
  130: 'Beef Don',
  131: 'Pork Don',
  134: 'Ebi Tempura Avocado Roll',
  135: 'Tuna Avocado Roll',
  137: 'Otoro Sashimi',
  138: 'Chutoro Sashimi',
  139: 'Otoro Sashimi',
  140: 'Sweet Egg Omelette',
  141: 'Hoegaarden Beer',
  142: 'Coca-Cola Zero',
  143: 'Aura Mineral Water',
  144: 'Cucumber',
  145: 'Salmon Sashimi',
  146: 'Arabiki Sausage',
  147: 'Edamame',
  148: 'Tomato on Ice',
  149: 'Grilled Snow Fish with Yaki Sauce',
  150: 'Maguro Trinity',
};

async function main() {
  console.log('🍣 Yokayaki — Seed English menu names\n');
  if (dryRun) console.log('🔍 DRY RUN — ไม่มีการแก้ไขข้อมูลจริง\n');

  // Verify column exists
  const { error: colErr } = await db.from('menu_items').select('name_en').limit(1);
  if (colErr) {
    console.error('✗ คอลัมน์ name_en ยังไม่มี — ต้องรัน ALTER TABLE ก่อน');
    console.error('  → node scripts/apply-name-en.mjs');
    process.exit(1);
  }

  // Fetch items missing name_en
  const { data: items, error } = await db
    .from('menu_items')
    .select('id, name, name_en')
    .is('name_en', null)
    .order('id');

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log(`รายการที่ยังไม่มี name_en: ${items.length} รายการ\n`);

  let updated = 0;
  let skipped = 0;
  const unmapped = [];

  for (const item of items) {
    const nameEn = NAME_EN_BY_ID[item.id];

    if (!nameEn) {
      unmapped.push(item);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`  [DRY] ${item.id} ${item.name} → ${nameEn}`);
      updated++;
      continue;
    }

    const { error: updateErr } = await db
      .from('menu_items')
      .update({ name_en: nameEn })
      .eq('id', item.id);

    if (updateErr) {
      console.error(`  ✗ ${item.id} ${item.name}: ${updateErr.message}`);
    } else {
      console.log(`  ✓ ${item.id} ${item.name} → ${nameEn}`);
      updated++;
    }
  }

  console.log(`\n📊 สรุป: อัปเดต ${updated} รายการ, ข้าม ${skipped} รายการ`);

  if (unmapped.length > 0) {
    console.log(`\n⚠️  ไม่มี mapping สำหรับ ${unmapped.length} รายการ (เพิ่มใน NAME_EN_BY_ID):`);
    unmapped.forEach(i => console.log(`  ${i.id}: '${i.name}',`));
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
