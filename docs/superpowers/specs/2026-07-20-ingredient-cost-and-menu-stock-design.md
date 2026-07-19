# 📝 เอกสารการออกแบบ: ระบบจัดการต้นทุนวัตถุดิบและสต็อกเมนูอาหาร (Ingredient Cost & Menu Stock Design)

**วันที่:** 2026-07-20  
**สถานะ:** รออนุมัติ (Pending Approval)  
**เป้าหมาย:** ปรับปรุงระบบจัดการสต็อกของ Yokayaki POS จากเดิมที่นับเฉพาะจำนวนจานขายดี มาเป็นระบบบันทึกประวัติจัดซื้อวัตถุดิบรายครั้งเพื่อคำนวณต้นทุน/กำไรสุทธิ และย้ายฟังก์ชันการจัดการสต็อกจานพร้อมจำหน่ายเดิมไปไว้รวมกับหน้าจัดการเมนูอาหาร (Menu Manager) เพื่อความรวดเร็วในการทำงานของพนักงาน

---

## 1. การเปลี่ยนแปลงสถาปัตยกรรมข้อมูล (Database Changes)

### 1.1 ตารางใหม่: `item_ingredients`
ตารางสำหรับเก็บบันทึกประวัติการจัดซื้อวัตถุดิบรายครั้ง เพื่อคำนวณต้นทุนรวมสะสม
```sql
CREATE TABLE item_ingredients (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,                        -- ชื่อวัตถุดิบ (เช่น แซลมอน, หมูสามชั้น, ข้าวญี่ปุ่น)
  quantity DECIMAL(10, 2) NOT NULL,                 -- จำนวนที่จัดซื้อ (รองรับทศนิยม เช่น 1.5)
  unit VARCHAR(50) NOT NULL,                         -- หน่วยของวัตถุดิบ (พิมพ์ระบุเอง เช่น กก., แพ็ค, แผง)
  cost DECIMAL(10, 2) NOT NULL,                      -- ราคารวมของวัตถุดิบที่ซื้อเข้ามาในรอบนั้น
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,  -- วันที่จัดซื้อ
  buyer_name VARCHAR(255) NOT NULL,                  -- ชื่อผู้จัดซื้อ (ดึงจากผู้ใช้ระบบที่กำลังล็อกอิน)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- เปิดใช้งาน RLS (Row Level Security)
ALTER TABLE item_ingredients ENABLE ROW LEVEL SECURITY;

-- นโยบายการสิทธิ์เข้าถึง (Policies) สำหรับหน้าจอ POS
CREATE POLICY "Allow public read access to item_ingredients" ON item_ingredients FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to item_ingredients" ON item_ingredients FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to item_ingredients" ON item_ingredients FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow public delete access to item_ingredients" ON item_ingredients FOR DELETE USING (true);
```

### 1.2 ตารางเดิม: `menu_items`
* **ไม่มีการย้ายหรือเปลี่ยนคอลัมน์**: คอลัมน์ `stock` (INT) และ `is_stock_tracked` (BOOLEAN) ยังคงอยู่ในตาราง `menu_items` เหมือนเดิม เพื่อลดความเสี่ยงในการทำ Migration และรักษาความเสถียรของฟังก์ชันการตัดสต็อกอัตโนมัติในการสั่งออเดอร์และการสั่งผ่าน QR Code

---

## 2. การเปลี่ยนแปลงส่วนติดต่อผู้ใช้ (UI Redesign)

### 2.1 หน้าจอ "จัดการวัตถุดิบ & ต้นทุน" (แทนที่หน้าจัดการสต็อกเดิม)
* **ไฟล์หลัก:** [StockManager.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/StockManager.tsx)
* **ฟังก์ชันและ UI ใหม่:**
  * **Header & Summary Widgets**:
    * การ์ดแสดง **"ต้นทุนวัตถุดิบสะสมทั้งหมด"** 
    * การ์ดแสดง **"ต้นทุนวัตถุดิบสะสมวันนี้"** (Sum of cost where date = today)
  * **ระบบตัวกรอง (Filters)**:
    * ช่องค้นหาวัตถุดิบย้อนหลังตามชื่อ
    * ตัวกรองช่วงเวลา (ดูวันนี้ / สัปดาห์นี้ / เดือนนี้ / ทั้งหมด)
  * **ประวัติการซื้อ (Purchase History Table)**:
    * ตารางแสดงรายการ: วันที่จัดซื้อ | ชื่อวัตถุดิบ | จำนวน | ราคารวม | ผู้ซื้อ | ปุ่มแก้ไขและลบ
  * **ปุ่ม "เพิ่มวัตถุดิบใหม่" (Add Ingredient Modal)**:
    * ช่องกรอก: ชื่อวัตถุดิบ, จำนวนที่ซื้อ, หน่วย, ราคารวม, วันที่ซื้อ (Default เป็นวันนี้)
    * ดึงค่าพนักงานที่ล็อกอินอยู่เข้าช่อง `buyer_name` อัตโนมัติ

### 2.2 หน้าจอ "จัดการเมนูอาหาร" (Menu Manager)
* **ไฟล์หลัก:** [MenuManager.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/MenuManager.tsx)
* **ฟังก์ชันและ UI ใหม่ (Inline Stock Controller)**:
  * ในหน้าตารางรายการเมนูเดิม จะเพิ่มช่องจัดการสต็อกดังนี้:
    * **ปุ่มเปิด/ปิดนับสต็อก**: สามารถกดสลับโหมด (จำกัดสต็อก / ไม่จำกัด) ได้โดยตรงที่ตาราง
    * **เครื่องมือเพิ่มลดสต็อก**: แสดงตัวเลขสต็อกพร้อมปุ่ม `-` และ `+` และอินพุตตัวเลข หากมีการคลิกแก้ไขสต็อก จะเรียกใช้ API อัปเดตไปยัง Supabase ในทันที (แบบ Inline Update) ช่วยประหยัดเวลาการกดเข้า Modal แก้ไข

### 2.3 หน้ารายงาน "รายงาน / Dashboard" (Owner Dashboard)
* **ไฟล์หลัก:** [OwnerDashboard.tsx](file:///c:/Users/PP/Desktop/React/yokayaki/components/OwnerDashboard.tsx)
* **ฟังก์ชันและ UI ใหม่ (หักลบกำไรสุทธิ)**:
  * **การ์ดสรุปเพิ่มเติม**:
    * เพิ่มการ์ด **"ต้นทุนวัตถุดิบวันนี้"**
    * ปรับการ์ดสรุปกำไร เพื่อแสดงสูตร **"กำไรสุทธิวันนี้ (Net Profit)"** = ยอดขายสุทธิวันนี้ - ต้นทุนวัตถุดิบวันนี้ - ยอดสูญเสียวัตถุดิบจากการยกเลิกอาหาร (Void Waste)
  * **การปรับปรุงตารางบันทึกประวัติ**:
    * ลบตาราง "ประวัติการปรับสต็อกเมนูอาหารด้วยมือ" เดิมออก แล้วแทนที่ด้วยตาราง **"ประวัติการซื้อวัตถุดิบวันนี้ (Daily Ingredients Purchases)"** เพื่อให้เจ้าของร้านตรวจสอบรายการที่พนักงานคีย์เข้ามาได้ทันที

---

## 3. แผนการทดสอบระบบ (Verification Plan)

### 3.1 การตรวจสอบฐานข้อมูล
* ตรวจสอบว่าตาราง `item_ingredients` ถูกสร้างและมีนโยบาย RLS ครบถ้วน
* จำลองการเพิ่ม แก้ไข ลบข้อมูลจาก Client

### 3.2 การตรวจสอบ UI & การใช้งานจริง (Manual Verification)
* เข้าหน้า "จัดการวัตถุดิบ" (ใหม่) และทดลองเพิ่มวัตถุดิบ เช่น แซลมอน 1.5 กก. ราคา 350 บาท จากนั้นแก้ไขหน่วยหรือลบรายการ เพื่อดูว่าการ์ดราคารวมวันนี้เปลี่ยนตามแบบ Real-time หรือไม่
* เข้าหน้า "จัดการเมนูอาหาร" และใช้ฟังก์ชัน Inline Stock Controller ในการสลับปุ่มนับสต็อก ปรับเพิ่มสต็อกแบบ Inline แล้วไปทดลองสั่งอาหารในหน้า POS ว่าสต็อกทำงานถูกต้องตามโหมดที่ตั้งไว้หรือไม่
* เข้าหน้า "Dashboard เจ้าของร้าน" ตรวจเช็คว่ายอดขายโดนหักต้นทุนวัตถุดิบวันนี้ออกกลายเป็นกำไรสุทธิที่ถูกต้อง และแสดงรายการจัดซื้อได้อย่างละเอียด
