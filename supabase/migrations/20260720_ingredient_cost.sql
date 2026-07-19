-- สร้างตาราง item_ingredients สำหรับบันทึกประวัติการจัดซื้อวัตถุดิบรายครั้ง
CREATE TABLE IF NOT EXISTS item_ingredients (
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

-- นโยบายสิทธิ์การเข้าถึงสำหรับหน้าจอ POS
DROP POLICY IF EXISTS "Allow public read access to item_ingredients" ON item_ingredients;
CREATE POLICY "Allow public read access to item_ingredients" ON item_ingredients FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert access to item_ingredients" ON item_ingredients;
CREATE POLICY "Allow public insert access to item_ingredients" ON item_ingredients FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update access to item_ingredients" ON item_ingredients;
CREATE POLICY "Allow public update access to item_ingredients" ON item_ingredients FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete access to item_ingredients" ON item_ingredients;
CREATE POLICY "Allow public delete access to item_ingredients" ON item_ingredients FOR DELETE USING (true);
