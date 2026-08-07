# 🍱 YOKAYAKI POS — Menu & Stock Linkage Specifications (menu.md)

เอกสารนี้อธิบายการทำงานและสเปกการผูกโยงข้อมูลระบบเมนูอาหารและการจัดการสต็อกคงเหลือ (Menu & Stock Management) ของ **YOKAYAKI POS** ทั้งฝั่งผู้จัดการร้าน (Staff/Owner) และหน้าสั่งอาหารของลูกค้าผ่าน QR Code

---

## 📌 1. Overview & System Integration

ระบบเมนูอาหารของ YOKAYAKI POS ออกแบบให้ทำหน้าที่บริหารจัดการรายการอาหาร พร้อมผูกโยงจำนวนสต็อกคงเหลือไปยังหน้าสั่งอาหารแบบเรียลไทม์ (Real-time Stock Linkage)

```
[ MenuManager (ตารางจัดการเมนู) ]
  ├── กำหนด ชื่อ, ราคา, รูปภาพ, หมวดหมู่
  └── ปรับจำนวนสต็อกด่วน (ปุ่ม - / ช่องป้อนจำนวน / ปุ่ม +)
             │
             ▼ (อัปเดตลง Supabase: menu_items.stock)
             │
 ┌───────────┴────────────────────────┐
 │                                    │
 ▼                                    ▼
[ POS Order Screen ]     [ Customer QR Portal ]
 (แสดง Badge 'เหลือ X'      (แสดง Badge 'เหลือ X' 
  มุมขวาบนของ Card)        มุมขวาบนของ Card)
```

---

## 🛠️ 2. In-Table Stock Quantity Control (ตารางรายการเมนูอาหาร)

ในหน้า **จัดการรายการอาหาร (Menu Manager)** เพิ่มคอลัมน์ **"จำนวนสต็อกคงเหลือ"** ในตาราง ให้พนักงาน/เจ้าของร้านปรับจำนวนสต็อกด่วนได้ทันทีโดยไม่ต้องเปิด Modal แก้ไข

### 2.1 UI Component Structure

```tsx
<TableCell className="text-center">
  <div className="flex items-center justify-center gap-1.5">
    {/* ปุ่มลดจำนวน (-1) */}
    <button
      onClick={() => handleQuickStockUpdate(item, -1)}
      disabled={item.stock <= 0}
      className="p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-30 transition border-none shadow-none"
    >
      <Minus className="w-3.5 h-3.5" />
    </button>
    
    {/* ช่องป้อนตัวเลขแบบยืดหยุ่น */}
    <input
      type="number"
      min={0}
      value={item.stock}
      onChange={e => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 0) {
          handleQuickStockUpdate(item, val, true);
        }
      }}
      className="w-14 text-center bg-zinc-100 dark:bg-zinc-800 text-xs font-bold rounded-lg py-1 text-zinc-900 dark:text-zinc-100 border-none focus:outline-none focus:ring-2 focus:ring-red-500/50"
    />
    
    {/* ปุ่มเพิ่มจำนวน (+1) */}
    <button
      onClick={() => handleQuickStockUpdate(item, 1)}
      className="p-1 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition border-none shadow-none"
    >
      <Plus className="w-3.5 h-3.5" />
    </button>
  </div>
</TableCell>
```

### 2.2 Behavior Requirements
1. **Optimistic Updates**: อัปเดต state ตัวเลขบนหน้าจอทันทีเมื่อคลิก เพื่อความลื่นไหลระดับ 60fps
2. **Database Persistence**: บันทึกลงตาราง `menu_items` (คอลัมน์ `stock`) ใน Supabase อัตโนมัติ
3. **Safety Guard**: ห้ามให้สต็อกติดลบ (`Math.max(0, newStock)`) และหากสต็อกเป็น `0` ปุ่มลดจำนวนจะถูกปิดการทำงาน (`disabled`)

---

## 🏷️ 3. Stock Badge Linkage on Order Screens (การแสดง Badge สต็อกในหน้าสั่งอาหาร)

ในหน้าสั่งอาหารของพนักงาน (`POSOrderScreen` / `MenuGrid.tsx`) และหน้าสั่งอาหารของลูกค้า (`CustomerOrderPortal`) แต่ละ Card จะแสดง **Badge เล็กๆ ที่มุมขวาบน** เพื่อระบุจำนวนคงเหลือ

### 3.1 Badge Specifications

| สถานะสินค้า | รูปแบบ Badge (Visual Style) | ข้อความบน Badge | ตำแหน่ง (Position) |
| :--- | :--- | :--- | :--- |
| **มีสินค้าคงเหลือ** (`stock > 0`) | `bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-extrabold px-2.5 py-0.5 rounded-full` | `เหลือ X` | มุมขวาบน (`absolute top-2.5 right-2.5`) |
| **สินค้าหมดสต็อก** (`stock <= 0`) | `bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-full` | `หมด` | มุมขวาบน (`absolute top-2.5 right-2.5`) |

### 3.2 Card Layout Example (Tailwind CSS)

```tsx
<button
  key={item.id}
  disabled={isOutOfStock}
  onClick={() => addToCart(item)}
  className="group relative bg-white dark:bg-zinc-900 rounded-2xl p-4 flex flex-col justify-between text-left border-none shadow-none overflow-hidden"
>
  {/* Badge แสดงสต็อกมุมขวาบน */}
  <div className="absolute top-2.5 right-2.5 z-10">
    {isOutOfStock ? (
      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
        หมด
      </span>
    ) : (
      <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
        เหลือ {item.stock}
      </span>
    )}
  </div>

  {/* รูปภาพและชื่อเมนู */}
  ...
</button>
```

---

## 🗄️ 4. Database Schema & RPC Functions Integration

### 4.1 Schema Definition (`menu_items`)

```sql
CREATE TABLE menu_items (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  stock INT NOT NULL DEFAULT 20,
  is_stock_tracked BOOLEAN NOT NULL DEFAULT true,
  category TEXT NOT NULL DEFAULT 'ทั่วไป',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Stock Deduct & Restore Logic (RPCs)
1. **`place_order_item` (Staff Order)**: เมื่อมีการกดสั่งอาหาร ระบบจะหักจำนวนสต็อกอัตโนมัติหาก `is_stock_tracked = true`
2. **`customer_place_order_item` (Customer Order)**: ตรวจสอบเซสชัน QR และหักสต็อกอย่างปลอดภัย (Atomic Stock Deduction)
3. **`void_order_item` (Void Order)**: เมื่อยกเลิกรายการอาหาร สามารถเลือกคืนจำนวนสต็อก (`p_restore_stock = true`) กลับเข้าคลังได้ทันที

---

## 🎨 5. Design System Alignment

- **Card Styling**: `border-none shadow-none rounded-2xl bg-white dark:bg-zinc-900`
- **Color Theme**: Yokayaki Red Theme (`bg-red-600`, `text-red-600 dark:text-red-400`)
- **Typography**: Noto Sans Thai / Inter (Bold & Black font weights)
