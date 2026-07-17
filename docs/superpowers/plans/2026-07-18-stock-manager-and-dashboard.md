# แผนการพัฒนาระบบจัดการสต็อก (Stock Manager) และแดชบอร์ดรายงาน (Owner Dashboard)

> **สำหรับนักพัฒนา AI:** จำเป็นต้องใช้ทักษะย่อย: `superpowers:subagent-driven-development` (แนะนำ) หรือ `superpowers:executing-plans` เพื่อดำเนินการพัฒนาตามแผนนี้ทีละขั้นตอน โดยใช้กล่องเครื่องหมาย (`- [ ]`) ในการติดตามสถานะ

**เป้าหมาย:** สร้างหน้า "จัดการสต็อก" (Stock Manager) แยกเฉพาะเพื่อการกำหนดจำนวนจานพร้อมขาย (มีปุ่มเปิด/ปิดการนับสต็อก) และหน้า "แดชบอร์ดรายงาน" (Owner Dashboard) สำหรับเจ้าของร้านเพื่อดูภาพรวมยอดขาย กราฟรายชั่วโมง และประวัติการยกเลิกอาหาร (Void Logs) พร้อมเพิ่มแถบแจ้งเตือนสต็อกใกล้หมด/หมดแล้วบนหน้าผังโต๊ะ (Table Map)

**สถาปัตยกรรม (Architecture):**
- **ฐานข้อมูล (Database):** เพิ่มคอลัมน์ `is_stock_tracked` ในตาราง `menu_items` และอัปเดตฟังก์ชันสั่งอาหาร (RPCs) ให้ตรวจสอบเงื่อนไขนี้ พร้อมกับเพิ่มนโยบาย RLS เพื่อให้สิทธิ์แก้ไขข้อมูลแก่ POS Client
- **การนำทาง (Tabbed Navigation):** ปรับปรุง TableMap.tsx ให้รองรับการสลับมุมมอง (`'tables' | 'stock' | 'dashboard'`) พร้อมการจำกัดสิทธิ์ระดับพนักงาน (Role Restriction)
- **คอมโพเนนต์ (Components):** สร้าง StockManager.tsx สำหรับปรับแก้สต็อกและตัวเลือกจำกัดสต็อก และ OwnerDashboard.tsx สำหรับการแสดงข้อมูลยอดขาย (กราฟ SVG, เมนูขายดี, ประวัติยกเลิก)

**เทคโนโลยีที่ใช้ (Tech Stack):** React, Next.js 16, Supabase JS client, TailwindCSS 4, Lucide Icons

## ข้อจำกัดทั่วไป (Global Constraints)
- ห้ามใช้คลาส TailwindCSS ที่ต้องใช้ความเข้ากันได้ย้อนหลังกับเวอร์ชัน 3 หากพบว่าชนกันในเวอร์ชัน 4
- การเขียน/อัปเดตฐานข้อมูลทั้งหมดในเมนูอาหารต้องผ่านนโยบายความปลอดภัย RLS เสมอ
- ปกป้องการเข้าถึงหน้าแดชบอร์ดรายงาน เฉพาะพนักงานระดับ `owner` เท่านั้นที่เข้าถึงได้

---

### ขั้นตอนที่ 1: อัปเดตโครงสร้างฐานข้อมูลและฟังก์ชันสั่งอาหาร (RPCs)

**ไฟล์ที่เกี่ยวข้อง:**
- สร้างใหม่: `supabase/migrations/20260718_stock_and_reports.sql`

**อินเทอร์เฟซ (Interfaces):**
- เพิ่มคอลัมน์ `is_stock_tracked` (boolean) ในตาราง `menu_items`
- อัปเดตการทำงานของฟังก์ชัน SQL: `place_order_item` และ `customer_place_order_item`
- อัปเดต RLS Permissions สำหรับการ Update ตาราง `menu_items`

- [ ] **ขั้นตอน 1.1: สร้างไฟล์ SQL Migration**

สร้างไฟล์ `supabase/migrations/20260718_stock_and_reports.sql`:
```sql
-- 1. เพิ่มคอลัมน์ is_stock_tracked ในตาราง menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_stock_tracked BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. ตั้งค่าข้าวสวยญี่ปุ่นไม่นับสต็อกเป็นตัวอย่างเริ่มต้น
UPDATE menu_items SET is_stock_tracked = FALSE WHERE name = 'ข้าวสวยญี่ปุ่น';

-- 3. เพิ่มนโยบาย UPDATE สำหรับตาราง menu_items ให้เครื่อง POS ปรับแก้สต็อกได้
DROP POLICY IF EXISTS "Allow public update access to menu_items" ON menu_items;
CREATE POLICY "Allow public update access to menu_items" ON menu_items FOR UPDATE USING (true) WITH CHECK (true);

-- 4. อัปเดตฟังก์ชัน place_order_item ให้รองรับระบบตรวจสอบความต้องการนับสต็อก
CREATE OR REPLACE FUNCTION place_order_item(
  p_table_id INT,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_order_id INT;
  v_current_stock INT;
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- ดึงข้อมูลสต็อกปัจจุบันและสถานะการนับสต็อก
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
  
  -- ตรวจเช็คสต็อกเฉพาะเมนูที่เลือกนับสต็อกเท่านั้น
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN
    RETURN FALSE;
  END IF;

  -- ค้นหาหรือสร้างออเดอร์ใหม่ประจำโต๊ะที่เปิดอยู่
  SELECT id INTO v_order_id FROM orders WHERE table_id = p_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active') RETURNING id INTO v_order_id;
    -- เปลี่ยนสถานะโต๊ะเป็นมีลูกค้า (occupied)
    UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
  END IF;

  -- เพิ่มรายการอาหารในออเดอร์
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- หักสต็อกเฉพาะรายการอาหารที่เลือกนับสต็อก
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 5. อัปเดตฟังก์ชัน customer_place_order_item (ของลูกค้าสั่ง) ให้รองรับระบบเปิด/ปิดสต็อก
CREATE OR REPLACE FUNCTION customer_place_order_item(
  p_session_id UUID,
  p_menu_item_id INT,
  p_quantity INT,
  p_unit_price DECIMAL(10, 2)
) RETURNS BOOLEAN AS $$
DECLARE
  v_table_id INT;
  v_session_status VARCHAR(20);
  v_expired_at TIMESTAMP WITH TIME ZONE;
  v_order_id INT;
  v_current_stock INT;
  v_is_stock_tracked BOOLEAN;
BEGIN
  -- ตรวจสอบความถูกต้องของ QR Session
  SELECT table_id, status, expired_at INTO v_table_id, v_session_status, v_expired_at
  FROM qr_sessions WHERE id = p_session_id;

  IF v_table_id IS NULL THEN RETURN FALSE; END IF;
  IF v_session_status != 'active' THEN RETURN FALSE; END IF;
  IF v_expired_at IS NOT NULL AND v_expired_at < NOW() THEN 
    -- เปลี่ยนสถานะ QR Session เป็นหมดอายุเมื่อพ้นกำหนด 2 ชั่วโมง
    UPDATE qr_sessions SET status = 'expired' WHERE id = p_session_id;
    RETURN FALSE; 
  END IF;

  -- ดึงข้อมูลสต็อกปัจจุบันและสถานะการนับสต็อก
  SELECT stock, is_stock_tracked INTO v_current_stock, v_is_stock_tracked 
  FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;

  -- ตรวจเช็คสต็อกเฉพาะเมนูที่เลือกนับสต็อกเท่านั้น
  IF v_is_stock_tracked AND v_current_stock < p_quantity THEN RETURN FALSE; END IF;

  -- ค้นหาหรือสร้างออเดอร์ใหม่ประจำโต๊ะ
  SELECT id INTO v_order_id FROM orders WHERE table_id = v_table_id AND status = 'active' LIMIT 1;
  IF v_order_id IS NULL THEN
    INSERT INTO orders (table_id, qr_session_id, status) VALUES (v_table_id, p_session_id, 'active') RETURNING id INTO v_order_id;
    UPDATE tables SET status = 'occupied' WHERE id = v_table_id;
  END IF;

  -- เพิ่มรายการอาหารในออเดอร์
  INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
  VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

  -- หักสต็อกเฉพาะรายการอาหารที่เลือกนับสต็อก
  IF v_is_stock_tracked THEN
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **ขั้นตอน 1.2: บันทึกประวัติเวอร์ชัน (Commit)**
```bash
git add supabase/migrations/20260718_stock_and_reports.sql
git commit -m "db: add is_stock_tracked column and update order RPCs"
```

---

### ขั้นตอนที่ 2: สร้างคอมโพเนนต์ระบบจัดการสต็อก (Stock Manager)

**ไฟล์ที่เกี่ยวข้อง:**
- สร้างใหม่: `components/StockManager.tsx`

**อินเทอร์เฟซ (Interfaces):**
- ดึงข้อมูลจากตาราง `menu_items` และทำการปรับแก้ไขผ่านคอลัมน์ `stock` และ `is_stock_tracked`
- ส่งออกคอมโพเนนต์ `StockManager`

- [ ] **ขั้นตอน 2.1: เขียนโค้ดคอมโพเนนต์ StockManager.tsx**

สร้างไฟล์ `components/StockManager.tsx`:
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Search, Save, ToggleLeft, ToggleRight, Plus, Minus, Loader2 } from 'lucide-react';

interface MenuItem {
  id: number;
  name: string;
  price: number;
  stock: number;
  is_stock_tracked: boolean;
}

export const StockManager: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchStock = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, price, stock, is_stock_tracked')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setItems(data as MenuItem[]);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'ไม่สามารถดึงข้อมูลสต็อกได้', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStock();
    
    // ติดตามการอัปเดตแบบเรียลไทม์ในตาราง menu_items
    const channel = supabase
      .channel('realtime:menu_stock')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          // ดึงข้อมูลใหม่เงียบๆ ข้างหลัง
          supabase
            .from('menu_items')
            .select('id, name, price, stock, is_stock_tracked')
            .order('id', { ascending: true })
            .then(({ data }) => {
              if (data) setItems(data as MenuItem[]);
            });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleStockChange = (id: number, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + delta);
        return { ...item, stock: newStock };
      }
      return item;
    }));
  };

  const handleStockInputChange = (id: number, val: string) => {
    const parsed = parseInt(val, 10);
    const stockVal = isNaN(parsed) ? 0 : Math.max(0, parsed);
    setItems(prev => prev.map(item => item.id === id ? { ...item, stock: stockVal } : item));
  };

  const handleToggleTracked = (id: number) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_stock_tracked: !item.is_stock_tracked } : item));
  };

  const saveItemChanges = async (item: MenuItem) => {
    try {
      setSavingId(item.id);
      const { error } = await supabase
        .from('menu_items')
        .update({
          stock: item.stock,
          is_stock_tracked: item.is_stock_tracked
        })
        .eq('id', item.id);

      if (error) throw error;
      setMessage({ text: `อัปเดตสต็อก ${item.name} สำเร็จ`, type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: 'ไม่สามารถบันทึกการเปลี่ยนแปลงได้', type: 'error' });
    } finally {
      setSavingId(null);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              ระบบจัดการสต็อกสินค้า (Stock Manager)
            </h2>
            <p className="text-stone-400 text-xs mt-1">อัปเดตจำนวนจานอาหารพร้อมจำหน่ายและสลับโหมดนับสต็อกแบบเรียลไทม์</p>
          </div>
          
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-stone-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="ค้นหาเมนู..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>

        {message && (
          <div className={`p-3.5 rounded-xl border text-xs font-semibold ${
            message.type === 'success' 
              ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-400' 
              : 'bg-red-950/20 border-red-900/40 text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="bg-stone-900/40 border border-stone-850 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 text-stone-400 text-xs font-bold bg-stone-900/80">
                    <th className="py-4 px-6">รายการเมนู</th>
                    <th className="py-4 px-4 text-center">เปิด/ปิด สต็อก</th>
                    <th className="py-4 px-6 text-center">สต็อกจานพร้อมขาย</th>
                    <th className="py-4 px-6 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 text-sm">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-stone-900/20 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-200">{item.name}</div>
                        <div className="text-stone-500 text-xs mt-0.5">{item.price} บาท</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <button
                          onClick={() => handleToggleTracked(item.id)}
                          className="focus:outline-none inline-flex cursor-pointer transition active:scale-95"
                        >
                          {item.is_stock_tracked ? (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs bg-emerald-950/30 border border-emerald-900/40 px-2.5 py-1 rounded-full">
                              <ToggleRight className="w-4 h-4" />
                              <span>นับสต็อก</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-stone-500 font-bold text-xs bg-stone-900/80 border border-stone-800 px-2.5 py-1 rounded-full">
                              <ToggleLeft className="w-4 h-4" />
                              <span>ไม่จำกัด</span>
                            </div>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => handleStockChange(item.id, -1)}
                            disabled={!item.is_stock_tracked}
                            className={`p-1.5 border rounded-lg active:scale-95 transition ${
                              item.is_stock_tracked 
                                ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' 
                                : 'bg-stone-900/30 border-stone-850/50 text-stone-600 cursor-not-allowed'
                            }`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          
                          <input
                            type="number"
                            min="0"
                            value={item.stock}
                            disabled={!item.is_stock_tracked}
                            onChange={e => handleStockInputChange(item.id, e.target.value)}
                            className={`w-16 text-center py-1.5 text-sm font-bold border rounded-lg focus:outline-none ${
                              item.is_stock_tracked 
                                ? 'bg-stone-950 border-stone-800 text-white focus:border-amber-500/50' 
                                : 'bg-stone-900/10 border-stone-900/50 text-stone-600 cursor-not-allowed'
                            }`}
                          />

                          <button
                            onClick={() => handleStockChange(item.id, 1)}
                            disabled={!item.is_stock_tracked}
                            className={`p-1.5 border rounded-lg active:scale-95 transition ${
                              item.is_stock_tracked 
                                ? 'bg-stone-800 border-stone-700 hover:bg-stone-700 text-stone-300' 
                                : 'bg-stone-900/30 border-stone-850/50 text-stone-600 cursor-not-allowed'
                            }`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => saveItemChanges(item)}
                          disabled={savingId === item.id}
                          className="bg-amber-500 hover:bg-amber-600 text-stone-950 disabled:bg-stone-800 disabled:text-stone-500 px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-500/5"
                        >
                          {savingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>บันทึก</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-stone-500 font-medium text-xs">
                        ไม่พบรายการเมนูที่ตรงกับคำค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **ขั้นตอน 2.2: บันทึกประวัติเวอร์ชัน (Commit)**
```bash
git add components/StockManager.tsx
git commit -m "feat: implement StockManager component with real-time sync"
```

---

### ขั้นตอนที่ 3: สร้างหน้าจอแดชบอร์ดรายงานเชิงวิเคราะห์ (Owner Dashboard)

**ไฟล์ที่เกี่ยวข้อง:**
- สร้างใหม่: `components/OwnerDashboard.tsx`

**อินเทอร์เฟซ (Interfaces):**
- โหลดข้อมูลประมวลผลทางสถิตียอดจำหน่าย ยอดเงินสด ยอด PromptPay และประวัติยกเลิกจากตาราง `payments`, `orders`, `order_items`, และ `void_logs`
- ส่งออกคอมโพเนนต์ `OwnerDashboard`

- [ ] **ขั้นตอน 3.1: เขียนโค้ดคอมโพเนนต์ OwnerDashboard.tsx**

สร้างไฟล์ `components/OwnerDashboard.tsx`:
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  TrendingUp, ShoppingBag, Trash2, ShieldAlert, Award, 
  DollarSign, Clock
} from 'lucide-react';

interface VoidLog {
  id: number;
  employee_name: string;
  menu_name: string;
  quantity: number;
  total_amount: number;
  reason: string;
  restored_stock: boolean;
  created_at: string;
}

interface PaymentSummary {
  cashTotal: number;
  promptpayTotal: number;
  netTotal: number;
  orderCount: number;
}

interface ItemSalesCount {
  name: string;
  quantity: number;
  revenue: number;
}

interface HourlySales {
  hour: number;
  amount: number;
}

export const OwnerDashboard: React.FC = () => {
  const [payments, setPayments] = useState<PaymentSummary>({ cashTotal: 0, promptpayTotal: 0, netTotal: 0, orderCount: 0 });
  const [voidLogs, setVoidLogs] = useState<VoidLog[]>([]);
  const [topSellers, setTopSellers] = useState<ItemSalesCount[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySales[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. ดึงยอดจ่ายวันนี้ (อิงเวลา 00:00 น. ของวันปัจจุบัน)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: payData, error: payError } = await supabase
        .from('payments')
        .select('payment_method, net_amount')
        .gte('created_at', todayStart.toISOString());

      if (payError) throw payError;

      let cashTotal = 0;
      let promptpayTotal = 0;
      let netTotal = 0;

      payData?.forEach(p => {
        const amt = parseFloat(p.net_amount as any);
        netTotal += amt;
        if (p.payment_method === 'cash') {
          cashTotal += amt;
        } else if (p.payment_method === 'promptpay') {
          promptpayTotal += amt;
        } else if (p.payment_method === 'mixed') {
          // หาร 50-50 สำหรับเคสจ่ายแบบผสมเพื่อสรุปยอดคร่าวๆ
          cashTotal += amt * 0.5;
          promptpayTotal += amt * 0.5;
        }
      });

      setPayments({
        cashTotal,
        promptpayTotal,
        netTotal,
        orderCount: payData?.length || 0
      });

      // 2. ดึงประวัติ Void Logs ทั้งหมด
      const { data: voidData, error: voidError } = await supabase
        .from('void_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (voidError) throw voidError;
      setVoidLogs((voidData || []) as VoidLog[]);

      // 3. ดึงยอดสั่งอาหารที่เสิร์ฟสำเร็จ (status = 'served') ในวันนี้เพื่อคิดสถิติ
      const { data: salesData, error: salesError } = await supabase
        .from('order_items')
        .select(`
          quantity,
          unit_price,
          discount_applied,
          status,
          created_at,
          menu_items (
            name
          )
        `)
        .eq('status', 'served')
        .gte('created_at', todayStart.toISOString());

      if (salesError) throw salesError;

      const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};
      const hoursMap: { [key: number]: number } = {};
      // ตั้งค่าเริ่มต้นชั่วโมงร้านเปิด (16:00 - 23:00 น.)
      for (let h = 16; h <= 23; h++) {
        hoursMap[h] = 0;
      }

      salesData?.forEach((item: any) => {
        const name = item.menu_items?.name || 'ไม่ทราบชื่อ';
        const qty = item.quantity;
        const rev = (item.unit_price * qty) - item.discount_applied;

        // คำนวณอันดับสินค้า
        if (itemMap[name]) {
          itemMap[name].quantity += qty;
          itemMap[name].revenue += rev;
        } else {
          itemMap[name] = { quantity: qty, revenue: rev };
        }

        // คำนวณยอดขายรายชั่วโมง
        const hour = new Date(item.created_at).getHours();
        if (hour >= 16 && hour <= 23) {
          hoursMap[hour] = (hoursMap[hour] || 0) + rev;
        }
      });

      const topList = Object.keys(itemMap).map(name => ({
        name,
        quantity: itemMap[name].quantity,
        revenue: itemMap[name].revenue
      })).sort((a, b) => b.quantity - a.quantity);

      setTopSellers(topList);

      const hourlyList = Object.keys(hoursMap).map(h => ({
        hour: parseInt(h, 10),
        amount: hoursMap[parseInt(h, 10)]
      })).sort((a, b) => a.hour - b.hour);

      setHourlySales(hourlyList);

    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalWaste = voidLogs
    .filter(log => !log.restored_stock)
    .reduce((sum, log) => sum + parseFloat(log.total_amount as any), 0);

  const maxHourlyAmount = Math.max(...hourlySales.map(h => h.amount), 500);

  return (
    <div className="bg-stone-950 text-white min-h-[calc(100vh-80px)] p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ส่วนหัวรายงาน */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-850 pb-6">
          <div>
            <h2 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              รายงานวิเคราะห์ยอดขายและระบบตรวจสอบ (Owner Dashboard)
            </h2>
            <p className="text-stone-400 text-xs mt-1">วิเคราะห์ข้อมูลยอดขาย รายละเอียดธุรกรรม และประวัติสูญเสียวัตถุดิบ (Void Logs)</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-bold text-stone-300 hover:text-white transition active:scale-95 cursor-pointer"
          >
            รีเฟรชข้อมูลแดชบอร์ด
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* กล่องสรุปสถิติตัวเลข */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ยอดขายสุทธิวันนี้</div>
                  <div className="text-2xl font-black text-white">{payments.netTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-emerald-950/30 text-emerald-400 rounded-xl border border-emerald-900/25">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">สแกนจ่าย PromptPay</div>
                  <div className="text-2xl font-black text-amber-500">{payments.promptpayTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-amber-950/30 text-amber-400 rounded-xl border border-amber-900/25">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">ยอดเงินสดในเก๊ะ</div>
                  <div className="text-2xl font-black text-stone-200">{payments.cashTotal.toLocaleString()} ฿</div>
                </div>
                <div className="p-3 bg-stone-850 text-stone-300 rounded-xl border border-stone-800">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-5 backdrop-blur-md flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-stone-400 text-xs font-medium">จำนวนออเดอร์ปิดบิล</div>
                  <div className="text-2xl font-black text-white">{payments.orderCount} บิล</div>
                </div>
                <div className="p-3 bg-blue-950/30 text-blue-400 rounded-xl border border-blue-900/25">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* กราฟและเมนูขายดี */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* กราฟแท่งยอดขายรายชั่วโมง */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-bold text-stone-200">กราฟยอดขายรายชั่วโมงวันนี้ (16:00 - 23:00 น.)</h3>
                </div>

                <div className="h-64 flex items-end justify-between gap-4 pt-6 px-2 border-b border-stone-800 relative">
                  {hourlySales.map(data => {
                    const pct = (data.amount / maxHourlyAmount) * 100;
                    return (
                      <div key={data.hour} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                        {/* ป้ายแสดงตัวเลขเมื่อโฮเวอร์เมาส์ */}
                        <div className="absolute bottom-full mb-2 bg-stone-950 border border-stone-800 text-stone-200 text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap shadow-xl">
                          {data.amount.toLocaleString()} ฿
                        </div>
                        <div 
                          style={{ height: `${Math.max(4, pct)}%` }}
                          className="w-full bg-gradient-to-t from-amber-600 to-amber-400 group-hover:from-amber-500 group-hover:to-yellow-400 rounded-t transition-all duration-300 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                        />
                        <span className="text-[10px] text-stone-500 font-semibold mt-2">{data.hour}:00</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* การจัดอันดับสินค้าขายดี */}
              <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  <h3 className="text-sm font-bold text-stone-200">จัดอันดับเมนูขายดีประจำวันนี้</h3>
                </div>

                <div className="space-y-4">
                  {topSellers.slice(0, 5).map((item, idx) => (
                    <div key={item.name} className="flex items-center justify-between border-b border-stone-850 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                          idx === 0 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                          idx === 1 ? 'bg-stone-200/20 text-stone-200 border border-stone-300/20' :
                          'bg-stone-800 text-stone-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-stone-300">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-black text-white">{item.quantity} จาน</div>
                        <div className="text-[10px] text-stone-500 font-semibold">{item.revenue.toLocaleString()} ฿</div>
                      </div>
                    </div>
                  ))}
                  {topSellers.length === 0 && (
                    <div className="text-center py-10 text-stone-500 text-xs font-semibold">
                      ยังไม่มีรายการจำหน่ายในวันนี้
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ตารางแสดงรายงานประวัติการยกเลิกอาหาร (Void logs) */}
            <div className="bg-stone-900/40 border border-stone-850 rounded-2xl p-6 backdrop-blur-md space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h3 className="text-sm font-bold text-stone-200">ประวัติการยกเลิกรายการอาหาร (Void Audit Log)</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-stone-400 font-medium">ยอดสูญเสียวัตถุดิบสะสม:</span>
                  <span className="text-sm font-black text-red-400 bg-red-950/20 border border-red-900/40 px-3 py-1 rounded-xl">
                    {totalWaste.toLocaleString()} ฿
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-stone-400 text-xs font-bold border-b border-stone-800 pb-3">
                      <th className="py-2.5">เวลา</th>
                      <th className="py-2.5">รายการอาหาร</th>
                      <th className="py-2.5 text-center">จำนวน</th>
                      <th className="py-2.5 text-right">มูลค่า</th>
                      <th className="py-2.5">สาเหตุการยกเลิก</th>
                      <th className="py-2.5 text-center">คืนสต็อก</th>
                      <th className="py-2.5">พนักงานผู้ยกเลิก</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-850 text-xs text-stone-300">
                    {voidLogs.map(log => (
                      <tr key={log.id} className="hover:bg-stone-900/10 transition-colors">
                        <td className="py-3 font-semibold text-stone-500">
                          {new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 font-bold text-stone-200">{log.menu_name}</td>
                        <td className="py-3 text-center font-bold">{log.quantity}</td>
                        <td className="py-3 text-right font-black text-stone-100">{log.total_amount} ฿</td>
                        <td className="py-3 text-stone-400">{log.reason}</td>
                        <td className="py-3 text-center">
                          {log.restored_stock ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2 py-0.5 rounded-full">
                              คืนสต็อก
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-red-400 bg-red-950/30 border border-red-900/30 px-2 py-0.5 rounded-full">
                              วัตถุดิบเสียเปล่า
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-medium text-stone-400">{log.employee_name}</td>
                      </tr>
                    ))}
                    {voidLogs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-stone-500 font-medium text-xs">
                          ไม่มีบันทึกประวัติการยกเลิกรายการอาหาร
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
```

- [ ] **ขั้นตอน 3.2: บันทึกประวัติเวอร์ชัน (Commit)**
```bash
git add components/OwnerDashboard.tsx
git commit -m "feat: implement OwnerDashboard analytics view and Void logs table"
```

---

### ขั้นตอนที่ 4: การนำทางและแถบแจ้งเตือนสต็อกด่วนบนคอมโพเนนต์ผังโต๊ะ (Table Map)

**ไฟล์ที่เกี่ยวข้อง:**
- แก้ไข: `components/TableMap.tsx`

**อินเทอร์เฟซ (Interfaces):**
- นำเข้าคอมโพเนนต์: `StockManager` จาก `./StockManager` และ `OwnerDashboard` จาก `./OwnerDashboard`
- แสดงแถบแท็บสวิตช์หน้า และแถบแจ้งเตือนเมื่อสต็อกมีจำนวน ≤ 3

- [ ] **ขั้นตอน 4.1: ปรับแต่ง TableMap.tsx เพื่อรวมการนำทางและ Widget แจ้งเตือนสต็อก**

เป้าหมายจุดที่แก้ไขคือช่วงนำเข้าไฟล์ด้านบน (บรรทัด 1-24):
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { LogOut, RefreshCw, ChefHat, User, Layers, ShoppingBag, Receipt, LayoutDashboard, Settings } from 'lucide-react';
import { POSOrderScreen } from '@/components/POSOrderScreen';
import { CheckoutScreen } from '@/components/CheckoutScreen';
import { StockManager } from '@/components/StockManager';
import { OwnerDashboard } from '@/components/OwnerDashboard';

interface Table {
  id: number;
  status: 'vacant' | 'occupied' | 'checking_out';
  updated_at: string;
}

interface MenuItemAlert {
  id: number;
  name: string;
  stock: number;
}
```

เพิ่ม state ตัวเลือกหน้าแสดงผลด้านในฟังก์ชัน `TableMap` (ประมาณบรรทัด 30):
```tsx
export const TableMap: React.FC = () => {
  const { employee, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tables' | 'stock' | 'dashboard'>('tables');
  const [tables, setTables] = useState<Table[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<MenuItemAlert[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  ...
```

เพิ่มฟังก์ชันดึงการแจ้งเตือนสต็อกต่ำ:
```tsx
  const fetchLowStockAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id, name, stock')
        .eq('is_stock_tracked', true)
        .lte('stock', 3);

      if (error) throw error;
      if (data) setLowStockAlerts(data as MenuItemAlert[]);
    } catch (err) {
      console.error('Error fetching low stock alerts:', err);
    }
  };

  useEffect(() => {
    fetchLowStockAlerts();
    
    // ติดตามการเปลี่ยนแปลงในตาราง menu_items เพื่ออัปเดตแจ้งเตือนเรียลไทม์
    const channel = supabase
      .channel('realtime:low_stock_alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          fetchLowStockAlerts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);
```

เพิ่มแถบนำทาง (Tabs Bar) และส่วนของแถบแสดงรายการสต็อกต่ำ (Alert Widget) ด้านล่าง Header (ประมาณบรรทัด 190):
```tsx
        {/* แถบนำทางในการสลับมุมมอง */}
        <div className="flex border-b border-stone-800/80 mb-6 gap-2">
          <button
            onClick={() => setActiveTab('tables')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer active:scale-98 ${
              activeTab === 'tables' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ผังโต๊ะ (Table Map)</span>
          </button>
          
          <button
            onClick={() => setActiveTab('stock')}
            className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer active:scale-98 ${
              activeTab === 'stock' 
                ? 'border-amber-500 text-amber-500' 
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>จัดการสต็อก (Stock Manager)</span>
          </button>

          {employee?.role === 'owner' && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition cursor-pointer active:scale-98 ${
                activeTab === 'dashboard' 
                  ? 'border-amber-500 text-amber-500' 
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>แดชบอร์ดรายงาน (Dashboard)</span>
            </button>
          )}
        </div>

        {/* แถบการเตือนวัตถุดิบ/สินค้าใกล้หมด (จะแสดงเฉพาะบนหน้าผังโต๊ะ) */}
        {lowStockAlerts.length > 0 && activeTab === 'tables' && (
          <div className="mb-6 bg-red-950/20 border border-red-900/40 rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-red-400 text-xs font-bold">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span>แจ้งเตือนวัตถุดิบ/เมนูใกล้หมด/สินค้าหมดชั่วคราว ({lowStockAlerts.length} เมนู)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.map(alert => (
                <span 
                  key={alert.id} 
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                    alert.stock === 0 
                      ? 'bg-stone-900 border-red-900/50 text-red-400' 
                      : 'bg-amber-950/20 border-amber-900/40 text-amber-400'
                  }`}
                >
                  {alert.name} {alert.stock === 0 ? '(หมดแล้ว)' : `(เหลืออีก ${alert.stock} จาน)`}
                </span>
              ))}
            </div>
          </div>
        )}
```

เปลี่ยนตรรกะการเรนเดอร์บอดี้หลักตามค่า `activeTab`:
```tsx
        {/* เรนเดอร์หน้าตาตามแท็บที่เลือก */}
        {activeTab === 'tables' && (
          <main className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {tables.length === 0 ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-44 rounded-3xl bg-stone-900/40 border border-stone-800/60 animate-pulse flex items-center justify-center">
                  <div className="w-10 h-10 border-2 border-stone-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ))
            ) : (
              tables.map(table => {
                -- โค้ดเรนเดอร์ปุ่มกดผังโต๊ะแบบเดิมที่มีอยู่ --
                ...
              })
            )}
          </main>
        )}

        {activeTab === 'stock' && <StockManager />}
        {activeTab === 'dashboard' && employee?.role === 'owner' && <OwnerDashboard />}
```

- [ ] **ขั้นตอน 4.2: บันทึกการแก้ไข (Commit)**
```bash
git commit -a -m "feat: integrate navbar tabs and low-stock alerts widget to TableMap component"
```

---

## แผนการตรวจสอบและทดสอบคุณภาพ (Verification Plan)

### การทดสอบแบบอัตโนมัติ (Automated Tests)
- รันคำสั่ง `pnpm run build` เพื่อตรวจสอบว่าโค้ดคอมไพล์ผ่าน ไม่มีข้อผิดพลาดของ Typescript หรือปัญหาการนำเข้าไฟล์
```bash
pnpm run build
```

### การตรวจสอบด้วยตนเอง (Manual Verification)
1. **การแก้ไขสต็อก:** ทดสอบแก้ไขจำนวนสต็อกในหน้า Stock Manager และกดบันทึก -> ตรวจสอบในระบบหลังบ้าน (Supabase) ว่ายอดมีการอัปเดตตรงตามที่แก้ไข
2. **การแจ้งเตือนสต็อกต่ำ:** ทดสอบลดระดับสต็อกลงเหลือ ≤ 3 ในระบบ -> ตรวจสอบว่ามีแถบเตือนสีแดง/ส้มขึ้นแจ้งพนักงานบนแท็บผังโต๊ะโดยทันที
3. **การคัดกรองสิทธิ์พนักงาน (Role Security):**
   - ล็อกอินด้วย PIN พนักงานทั่วไป `222222` (staff) -> ตรวจสอบว่าแท็บ **Dashboard** จะถูกซ่อนและเข้าดูไม่ได้
   - ล็อกอินด้วย PIN เจ้าของร้าน `111111` (owner) -> ตรวจสอบว่าแท็บ **Dashboard** แสดงขึ้นมาและกดเข้าชมข้อมูลได้ครบถ้วน
4. **บันทึกประวัติสูญเสียวัตถุดิบ (Void Log):** ทดสอบ Void รายการอาหารจากหน้า POS -> ตรวจสอบว่ารายการ Void ดังกล่าวไปปรากฏในตารางประวัติยกเลิกท้ายหน้า Owner Dashboard เรียลไทม์
