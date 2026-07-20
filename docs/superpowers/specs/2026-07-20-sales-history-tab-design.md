# Sales History Tab — แท็บประวัติการขาย

> วันที่ออกแบบ: 2026-07-20  
> สถานะ: Draft — รอ User Review

---

## ภาพรวม

เพิ่มแท็บ **"ประวัติ"** ใน TableMap navigation สำหรับ **Staff + Owner** ดูสรุปรายการขายที่ปิดบิลแล้วของวันนี้ (Today Only) พร้อมข้อมูลเมนูที่สั่ง โปรโมชั่นที่ใช้ และรายละเอียดการชำระเงินในแต่ละบิล

---

## ปัญหาที่ต้องแก้

ระบบปัจจุบัน **ไม่ได้เก็บว่าบิลไหนใช้โปรโมชั่นตัวไหน** — `payments.discount_amount` เก็บแค่ยอดส่วนลดรวม ไม่มี reference ถึง `promotions` ดังนั้นต้อง:

1. สร้างตาราง `payment_promotions` (junction table) ผูก payment ↔ promotion
2. แก้ `complete_checkout` RPC ให้รับข้อมูลโปรโมชั่นและบันทึกลงตารางใหม่
3. แก้ `CheckoutScreen.tsx` ให้ส่งข้อมูลโปรโมชั่นไปกับ checkout RPC
4. สร้าง component `SalesHistory.tsx` สำหรับแสดงประวัติ

---

## 1. Database Schema

### ตารางใหม่: `payment_promotions`

```sql
CREATE TABLE IF NOT EXISTS payment_promotions (
  id BIGSERIAL PRIMARY KEY,
  payment_id INT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  promotion_id INT NOT NULL REFERENCES promotions(id) ON DELETE SET NULL,
  promotion_name VARCHAR(100) NOT NULL,     -- Snapshot ชื่อ ณ ตอนที่ใช้ (กันกรณีแก้ชื่อทีหลัง)
  promotion_type VARCHAR(20) NOT NULL,      -- percentage / fixed / buy_x_get_y
  discount_value DECIMAL(10,2) NOT NULL,    -- ยอดส่วนลดที่ได้จากโปรโมชั่นตัวนี้
  free_items JSONB DEFAULT NULL,            -- [{"name":"ซาชิมิ","qty":1}] สำหรับ buy_x_get_y
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**เหตุผลที่เก็บ `promotion_name` เป็น snapshot**: เพราะ owner อาจแก้ชื่อโปรโมชั่นในอนาคต แต่ประวัติบิลเก่าต้องแสดงชื่อที่ใช้จริง ณ ตอนนั้น

**เหตุผลที่ใช้ JSONB สำหรับ `free_items`**: โปรโมชั่น buy_x_get_y อาจฟรีหลายเมนูพร้อมกัน — การเก็บเป็น array of objects ง่ายกว่าสร้าง sub-table อีกชั้น

---

## 2. อัปเดต `complete_checkout` RPC

เพิ่มพารามิเตอร์ `p_applied_promos JSONB DEFAULT '[]'` — รับ array ของ objects:

```json
[
  {
    "promotion_id": 5,
    "promotion_name": "ลด 10% ทั้งบิล",
    "promotion_type": "percentage",
    "discount_value": 78,
    "free_items": null
  },
  {
    "promotion_id": 3,
    "promotion_name": "ซื้อ 3 แถม 1",
    "promotion_type": "buy_x_get_y",
    "discount_value": 120,
    "free_items": [{"name":"เบียร์สดโอกินาว่า","qty":1}]
  }
]
```

ภายใน RPC หลังจาก INSERT payment แล้ว → ลูปใส่ `payment_promotions` ทีละ row

---

## 3. Component: `SalesHistory.tsx`

### มุมมองหลัก — รายชื่อบิลวันนี้

- ดึง `orders` (status = 'completed') JOIN `payments` ที่ `created_at >= วันนี้ 00:00`
- เรียงจากใหม่สุดลงเก่าสุด
- แต่ละ row แสดง:
  - หมายเลขบิล (ORD-{id})
  - หมายเลขโต๊ะ
  - เวลาปิดบิล
  - ยอดสุทธิ
  - ไอคอนวิธีชำระ (💵/📱/🔀)
  - Badge โปรโมชั่น (ถ้ามี)
- แถบสรุปด้านบน:
  - จำนวนบิลทั้งหมด
  - ยอดขายรวมวันนี้
  - ยอดส่วนลดโปรโมชั่นรวม

### มุมมองรายละเอียด — กดเข้าไปในบิล (Modal)

แสดงข้อมูลครบถ้วน:

1. **หัวบิล**: ORD-{id}, โต๊ะ, เวลา, พนักงาน (ถ้าเก็บ)
2. **รายการอาหาร**: ชื่อเมนู, จำนวน, ราคาต่อหน่วย, ยอดรวมรายการ, โน้ตพิเศษ
3. **โปรโมชั่นที่ใช้**: ชื่อโปร, ประเภท (%), มูลค่าส่วนลด, รายการฟรี (ถ้ามี)
4. **สรุปยอด**: ยอดรวม → ส่วนลดโปร → ส่วนลดแต้ม → ยอดสุทธิ
5. **วิธีชำระ**: เงินสด / โอน / ผสม
6. **Loyalty**: แต้มที่ได้ / แต้มที่ใช้

---

## 4. อัปเดต TableMap Navigation

เพิ่ม `'history'` ใน `activeTab` type:

| Role   | แท็บที่เห็น |
|--------|-----------|
| Staff  | ผังโต๊ะ, ครัว, **ประวัติ** |
| Owner  | ผังโต๊ะ, ครัว, สต็อก, เมนู, โปรโมชั่น, **ประวัติ**, Dashboard |

ใช้ไอคอน `Receipt` จาก lucide-react

---

## 5. ไฟล์ที่ต้องสร้าง/แก้ไข

| ไฟล์ | ประเภท | การเปลี่ยนแปลง |
|------|--------|----------------|
| `supabase/migrations/20260720_payment_promotions.sql` | SQL [NEW] | สร้างตาราง + RLS + อัปเดต RPC |
| `components/SalesHistory.tsx` | Component [NEW] | หน้าจอประวัติการขาย |
| `components/CheckoutScreen.tsx` | Component [MODIFY] | ส่ง `appliedPromos` ไปกับ RPC |
| `components/TableMap.tsx` | Component [MODIFY] | เพิ่มแท็บ "ประวัติ" + import |

---

## 6. สิ่งที่ไม่อยู่ใน Scope

- ❌ ดูข้อมูลย้อนหลังข้ามวัน (Date Picker) — จะทำใน phase ถัดไป
- ❌ Export PDF/Excel
- ❌ เปลี่ยนแปลง Dashboard ที่มีอยู่

---

## 7. Design Decisions

1. **Snapshot ชื่อโปรโมชั่น** → กันกรณี owner แก้ชื่อโปร ประวัติเก่ายังแสดงชื่อเดิม
2. **JSONB สำหรับ free_items** → ยืดหยุ่นกว่า sub-table สำหรับข้อมูลที่อ่านอย่างเดียว
3. **ไม่แก้ order_items** → ข้อมูล discount_applied ที่มีอยู่ใน order_items ยังใช้ได้เดิม ตาราง payment_promotions เก็บระดับ payment (ไม่ใช่ระดับ item)
4. **Default `p_applied_promos = '[]'`** → Backward compatible กับ checkout ที่ยังไม่ได้อัปเดต (ไม่พัง)
