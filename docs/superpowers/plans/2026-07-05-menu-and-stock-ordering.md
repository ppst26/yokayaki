# Yokayaki POS: Menu, Stock & Direct Fire Ordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** พัฒนาระบบแสดงผลรายการเมนูอาหาร, ระบบจำลองการสั่งอาหารหักสต็อกทันที (Direct Fire), แจ้งเตือนของเหลือน้อย/หมด และระบบกดยกเลิกรายการ (Void) ที่บันทึกประวัติการสูญเสีย

**Architecture:** ใช้ฐานข้อมูล Supabase ในการหักสต็อกแบบ Transaction (ผ่าน SQL function หรือ Trigger เพื่อความถูกต้องแบบ atomicity ป้องกัน race conditions) และสลับหน้าจอสั่งอาหารจากหน้าผังโต๊ะของ POS

**Tech Stack:** Next.js (App Router), Tailwind CSS, Lucide React, Supabase PostgreSQL

## Global Constraints
- ลอจิกการหักสต็อกเมื่อมีการกดสั่งซื้อ ต้องรันผ่าน SQL Level หรือ Transaction ป้องกันจำนวนติดลบและ Race Conditions
- ป้าย Urgency Badge ต้องแสดงผลเป็นสีส้มเฉพาะเมนูที่มีสต็อกเหลืออยู่ระหว่าง 1 ถึง 3 ชิ้นเท่านั้น
- การกดยกเลิกรายการ (Void) ต้องระบุสาเหตุ และเขียน Log บันทึกทุกครั้ง

---

### Task 1: Menu & Ordering Database Migrations

**Files:**
- Create: `supabase/migrations/20260705_menu_and_ordering.sql`

**Interfaces:**
- Produces: Tables `menu_items`, `orders`, `order_items`, `void_logs` and Postgres functions for stock deduction.

- [ ] **Step 1: Create SQL migration file**
  Create file: `supabase/migrations/20260705_menu_and_ordering.sql`
  ```sql
  -- Create menu_items table
  CREATE TABLE IF NOT EXISTS menu_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create orders table
  CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    table_id INT NOT NULL REFERENCES tables(id),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'voided')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create order_items table
  CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id),
    menu_item_id INT NOT NULL REFERENCES menu_items(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Create void_logs table
  CREATE TABLE IF NOT EXISTS void_logs (
    id SERIAL PRIMARY KEY,
    employee_name VARCHAR(100) NOT NULL,
    menu_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    restored_stock BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- Insert mock menu items
  INSERT INTO menu_items (name, price, stock) VALUES
  ('เบียร์สดโอกินาว่า', 120.00, 10),
  ('ยากิโทริสะโพกไก่ (4 ไม้)', 80.00, 3), -- Will trigger Urgency Badge
  ('แก้มปลาต้มซีอิ๊ว', 250.00, 0); -- Will trigger SOLD OUT

  -- Postgres Function for safe atomic stock deduction and order placement
  CREATE OR REPLACE FUNCTION place_order_item(
    p_table_id INT,
    p_menu_item_id INT,
    p_quantity INT,
    p_unit_price DECIMAL(10, 2)
  ) RETURNS BOOLEAN AS $$
  DECLARE
    v_order_id INT;
    v_current_stock INT;
  BEGIN
    -- Check stock
    SELECT stock INTO v_current_stock FROM menu_items WHERE id = p_menu_item_id FOR UPDATE;
    IF v_current_stock < p_quantity THEN
      RETURN FALSE;
    END IF;

    -- Get or create active order for the table
    SELECT id INTO v_order_id FROM orders WHERE table_id = p_table_id AND status = 'active' LIMIT 1;
    IF v_order_id IS NULL THEN
      INSERT INTO orders (table_id, status) VALUES (p_table_id, 'active') RETURNING id INTO v_order_id;
      -- Set table status to occupied
      UPDATE tables SET status = 'occupied' WHERE id = p_table_id;
    END IF;

    -- Insert order item
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price)
    VALUES (v_order_id, p_menu_item_id, p_quantity, p_unit_price);

    -- Deduct stock
    UPDATE menu_items SET stock = stock - p_quantity WHERE id = p_menu_item_id;

    RETURN TRUE;
  END;
  $$ LANGUAGE plpgsql;
  ```

- [ ] **Step 2: Commit changes**
  Run:
  ```bash
  git add supabase/migrations/20260705_menu_and_ordering.sql
  git commit -m "feat: add DB tables and functions for Menu, Stock, and Ordering"
  ```

---

### Task 2: Order Screen Component & Subsystem Navigation

**Files:**
- Create: `components/POSOrderScreen.tsx`
- Modify: `components/TableMap.tsx`

**Interfaces:**
- Consumes: `tables` state and `employee` info from context.
- Produces: Visual interface for adding items, displaying Cart, and showing Menu Item Stock.

- [ ] **Step 1: Create POSOrderScreen component**
  Create file: `components/POSOrderScreen.tsx`
  ```typescript
  "use client";
  import React, { useState, useEffect } from 'react';
  import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react';

  interface MenuItem {
    id: number;
    name: string;
    price: number;
    stock: number;
  }

  interface CartItem extends MenuItem {
    quantity: number;
  }

  interface POSOrderScreenProps {
    tableId: number;
    onBack: () => void;
  }

  export const POSOrderScreen: React.FC<POSOrderScreenProps> = ({ tableId, onBack }) => {
    const [menuItems, setMenuItems] = useState<MenuItem[]>([
      { id: 1, name: 'เบียร์สดโอกินาว่า', price: 120.00, stock: 10 },
      { id: 2, name: 'ยากิโทริสะโพกไก่ (4 ไม้)', price: 80.00, stock: 3 },
      { id: 3, name: 'แก้มปลาต้มซีอิ๊ว', price: 250.00, stock: 0 },
    ]);
    const [cart, setCart] = useState<CartItem[]>([]);

    const addToCart = (item: MenuItem) => {
      if (item.stock === 0) return;
      setCart(prev => {
        const exist = prev.find(i => i.id === item.id);
        if (exist) {
          if (exist.quantity >= item.stock) return prev;
          return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { ...item, quantity: 1 }];
      });
    };

    const removeFromCart = (id: number) => {
      setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: i.quantity - 1 } : i).filter(i => i.quantity > 0));
    };

    const confirmOrder = () => {
      // Mock order confirm logic
      alert("ออเดอร์ส่งเข้าครัวสำเร็จ! (Direct Fire)");
      setCart([]);
      onBack();
    };

    return (
      <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
        {/* Left: Menu Area */}
        <div className="flex-1 p-6 border-r border-neutral-800">
          <header className="flex items-center gap-4 mb-8">
            <button onClick={onBack} className="p-2 bg-neutral-900 border border-neutral-800 rounded-xl hover:bg-neutral-800">
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">สั่งอาหาร โต๊ะ {tableId}</h1>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {menuItems.map(item => (
              <div key={item.id} className={`p-4 rounded-xl border ${item.stock === 0 ? 'bg-neutral-950 border-neutral-900 opacity-60' : 'bg-neutral-900 border-neutral-800'}`}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <span className="text-amber-500 font-bold">{item.price} บาท</span>
                </div>
                <div className="flex justify-between items-center mt-6">
                  <div>
                    {item.stock === 0 ? (
                      <span className="text-red-500 text-xs font-bold uppercase tracking-wider px-2 py-1 bg-red-950/50 border border-red-900/50 rounded-lg">SOLD OUT</span>
                    ) : item.stock <= 3 ? (
                      <span className="text-orange-500 text-xs font-bold px-2 py-1 bg-orange-950/30 border border-orange-900/30 rounded-lg">ด่วน! เหลือ {item.stock} จาน</span>
                    ) : (
                      <span className="text-neutral-400 text-xs">สต็อก: {item.stock}</span>
                    )}
                  </div>
                  <button
                    disabled={item.stock === 0}
                    onClick={() => addToCart(item)}
                    className="p-2 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-black rounded-lg transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Cart Area */}
        <div className="w-full md:w-96 bg-neutral-950 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold mb-6 border-b border-neutral-800 pb-4">รายการที่เลือก (Cart)</h2>
            {cart.length === 0 ? (
              <p className="text-neutral-500 text-center py-10">ยังไม่มีรายการอาหารในตะกร้า</p>
            ) : (
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b border-neutral-900 pb-3">
                    <div>
                      <h4 className="font-medium text-sm">{item.name}</h4>
                      <p className="text-xs text-neutral-400">{item.price * item.quantity} บาท</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => removeFromCart(item.id)} className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => addToCart(item)} className="p-1 bg-neutral-900 hover:bg-neutral-800 rounded">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-800 pt-6 mt-6">
            <div className="flex justify-between font-semibold text-lg mb-6">
              <span>ยอดรวมทั้งหมด</span>
              <span>{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)} บาท</span>
            </div>
            <button
              disabled={cart.length === 0}
              onClick={confirmOrder}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-neutral-800 text-black font-bold rounded-xl transition"
            >
              สั่งอาหารทันที (Direct Fire)
            </button>
          </div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Step 2: Modify TableMap.tsx to open POSOrderScreen upon clicking a table**
  Modify file: `components/TableMap.tsx`
  - Import `POSOrderScreen`.
  - Add state `selectedTableId: number | null`.
  - If `selectedTableId` is not null, render `<POSOrderScreen tableId={selectedTableId} onBack={() => setSelectedTableId(null)} />` instead of TableMap view.
  - When Table is clicked, instead of toggling state, set `selectedTableId` to the clicked table's ID.

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add components/POSOrderScreen.tsx components/TableMap.tsx
  git commit -m "feat: implement POSOrderScreen UI and integrate navigation with TableMap"
  ```

---

### Task 3: Real-time Supabase Stock Deduction Integration

**Files:**
- Modify: `components/POSOrderScreen.tsx`

**Interfaces:**
- Consumes: `supabase` from `lib/supabase.ts` and DB function `place_order_item`

- [ ] **Step 1: Replace mockup data and confirmOrder with real Supabase calls**
  Modify file: `components/POSOrderScreen.tsx` to:
  * Fetch menu items from Supabase `menu_items` table upon load.
  * In `confirmOrder()`, invoke the database function RPC `place_order_item` for each item in the cart.
  * Update local menu items state using real-time subscription or re-fetching to dynamic updates.

- [ ] **Step 2: Add Void Flow functionality**
  Modify file: `components/POSOrderScreen.tsx` to add a "Void Item" manager for active table orders:
  * Fetch active order items for the table (if table is `occupied`).
  * Display a "ประวัติคำสั่งซื้อปัจจุบัน" list with a "ยกเลิก (Void)" button beside each item.
  * Clicking "Void" opens a dialog/prompt asking for a reason (e.g. 'คีย์ผิด', 'อาหารชำรุด').
  * Perform Void query: insert log into `void_logs`, remove/update `order_items`, and conditionally add back `stock` if reason is 'คีย์ผิด'.

- [ ] **Step 3: Commit changes**
  Run:
  ```bash
  git add components/POSOrderScreen.tsx
  git commit -m "feat: integrate Supabase RPC for safe stock deduction and implement void flow logs"
  ```
