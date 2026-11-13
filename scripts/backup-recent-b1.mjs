import pg from 'pg';
import fs from 'fs';

const branch1Url = 'postgresql://postgres:YayokiP%40ssw0rd%40112233@db.liffkthlunfuesyblpuv.supabase.co:5432/postgres';

async function main() {
  const b1 = new pg.Client({ connectionString: branch1Url });
  await b1.connect();

  const tables = ['orders', 'order_items', 'payments', 'void_logs', 'qr_sessions'];
  const backup = {};

  for (const t of tables) {
    const res = await b1.query(`SELECT * FROM ${t} ORDER BY id ASC`);
    backup[t] = res.rows;
    console.log(`Saved ${res.rows.length} rows from ${t}`);
  }

  fs.writeFileSync('scripts/branch1_recent_orders_backup.json', JSON.stringify(backup, null, 2), 'utf8');
  console.log('✅ Current Branch 1 recent orders backed up to scripts/branch1_recent_orders_backup.json');

  await b1.end();
}

main().catch(console.error);

