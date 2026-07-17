# Specification: Stock Adjustments Audit Log

ระบบบันทึกประวัติการปรับปรุงสต็อก (Stock Adjustments Log) สำหรับตรวจสอบความถูกต้องและความโปร่งใสในการปรับปรุงวัตถุดิบด้วยมือจากหน้า Stock Manager โดยเฉพาะ

---

## 1. การเปลี่ยนแปลงโครงสร้างฐานข้อมูล (Database Schema)

สร้างตารางใหม่ชื่อ `stock_logs` สำหรับจัดเก็บข้อมูลการเคลื่อนไหวสต็อกจากการทำงานของพนักงานด้วยมือ

```sql
CREATE TABLE stock_logs (
  id BIGSERIAL PRIMARY KEY,
  menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name VARCHAR(255) NOT NULL,
  employee_name VARCHAR(255) NOT NULL,
  old_stock INT NOT NULL,
  new_stock INT NOT NULL,
  change_amount INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- เพิ่มสิทธิ์และ RLS สำหรับการเข้าถึงตาราง stock_logs
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to stock_logs" 
ON stock_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to stock_logs" 
ON stock_logs FOR INSERT WITH CHECK (true);
```

---

## 2. การทำงานฝั่ง Client (Frontend adjustments)

ปรับปรุงในหน้า `StockManager.tsx`:
1. **การดึงข้อมูลและเตรียม State:**
   - เรียกใช้ `useAuth` เพื่อดึงข้อมูลพนักงานปัจจุบัน (`employee?.name`)
   - เก็บข้อมูลสต็อกเริ่มต้นไว้ใน React State เพื่อใช้คำนวณส่วนต่างเมื่อกดปุ่มบันทึก

2. **ตรรกะการเปรียบเทียบและการบันทึก:**
   - เมื่อกด **"บันทึกทั้งหมด"** ระบบจะวนลูปเปรียบเทียบรายการที่มีค่าสต็อกปัจจุบันต่างจากค่าเริ่มต้น
   - คำนวณหา `change_amount` (`new_stock - old_stock`)
   - บันทึกลงตาราง `menu_items` ตามปกติ
   - ถ้าสต็อกเปลี่ยนไป ให้นำรายการที่มีการเคลื่อนไหวนั้น มาเขียนประวัติลงในตาราง `stock_logs` ในแบบ Batch:
     ```typescript
     const logEntries = itemsToUpdate.map(item => ({
       menu_item_id: item.id,
       menu_item_name: item.name,
       employee_name: employee?.name || 'พนักงานภายนอก/ไม่ระบุชื่อ',
       old_stock: item.oldStockValue,
       new_stock: item.stock,
       change_amount: item.stock - item.oldStockValue
     }));
     
     await supabase.from('stock_logs').insert(logEntries);
     ```

---

## 3. การแสดงผลรายงานในหน้า Owner Dashboard

ปรับปรุงหน้า `OwnerDashboard.tsx` เพื่อแสดงรายงานประวัตินี้ในมุมมองของเจ้าของร้าน:
- เพิ่มตาราง **"ประวัติการปรับปรุงสต็อกด้วยมือ (Stock Adjustment Audit Log)"** ถัดลงมาจากตาราง Void Logs
- แสดงคอลัมน์: `เวลาที่ทำ`, `ชื่อเมนู`, `สต็อกเดิม`, `สต็อกใหม่`, `จำนวนที่ปรับปรุง`, `ผู้ดำเนินการ`
- ใช้สีแสดงความเปลี่ยนแปลงเพื่อความชัดเจน (สีเขียวเมื่อปรับเพิ่ม เช่น `+10`, สีแดงเมื่อปรับลด เช่น `-5`)
