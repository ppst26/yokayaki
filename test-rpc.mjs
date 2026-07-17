import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPlaceOrder() {
  console.log('Testing place_order_item RPC...');
  const { data, error } = await supabase.rpc('place_order_item', {
    p_table_id: 1,
    p_menu_item_id: 2,
    p_quantity: 1,
    p_unit_price: 100.00
  });

  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success:', data);
  }
}

testPlaceOrder();
