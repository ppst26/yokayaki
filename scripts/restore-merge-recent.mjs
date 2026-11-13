import pg from 'pg';
import fs from 'fs';

const branch1Url = 'postgresql://postgres:YayokiP%40ssw0rd%40112233@db.liffkthlunfuesyblpuv.supabase.co:5432/postgres';

async function main() {
  const raw = fs.readFileSync('scripts/branch1_recent_orders_backup.json', 'utf8');
  const backup = JSON.parse(raw);

  const b1 = new pg.Client({ connectionString: branch1Url });
  await b1.connect();

  console.log('🔄 Checking existing orders in Branch 1...');
  const currentOrders = await b1.query('SELECT id FROM orders');
  const currentOrderIds = new Set(currentOrders.rows.map(r => r.id));

  const missingOrders = backup.orders.filter(o => !currentOrderIds.has(o.id));
  console.log(`Found ${missingOrders.length} orders to merge back.`);

  if (missingOrders.length === 0) {
    console.log('All recent orders are already present in DB.');
    await b1.end();
    return;
  }

  await b1.query('BEGIN');
  try {
    // 1. Insert orders
    for (const o of missingOrders) {
      await b1.query(`
        INSERT INTO orders (id, table_id, status, created_at, updated_at, org_id, qr_session_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING
      `, [o.id, o.table_id, o.status, o.created_at, o.updated_at, o.org_id, o.qr_session_id]);
    }

    // 2. Insert order_items
    for (const oi of backup.order_items) {
      await b1.query(`
        INSERT INTO order_items (id, order_id, menu_item_id, quantity, status, notes, created_at, updated_at, org_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `, [oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.status, oi.notes, oi.created_at, oi.updated_at, oi.org_id]);
    }

    // 3. Insert payments
    for (const p of backup.payments) {
      await b1.query(`
        INSERT INTO payments (id, order_id, payment_method, subtotal, discount_amount, net_amount, cash_amount, promptpay_amount, points_earned, points_redeemed, phone_number, created_at, org_id, is_voided, voided_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO NOTHING
      `, [p.id, p.order_id, p.payment_method, p.subtotal, p.discount_amount, p.net_amount, p.cash_amount, p.promptpay_amount, p.points_earned, p.points_redeemed, p.phone_number, p.created_at, p.org_id, p.is_voided, p.voided_at]);
    }

    // 4. Update sequences
    await b1.query(`
      SELECT setval('orders_id_seq', (SELECT COALESCE(MAX(id), 1) FROM orders));
      SELECT setval('order_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM order_items));
      SELECT setval('payments_id_seq', (SELECT COALESCE(MAX(id), 1) FROM payments));
    `);

    await b1.query('COMMIT');
    console.log('✅ Successfully merged recent orders into Branch 1 DB!');
  } catch (err) {
    await b1.query('ROLLBACK');
    console.error('❌ Merge error:', err);
    throw err;
  }

  await b1.end();
}

main().catch(console.error);

