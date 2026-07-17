-- สร้างตาราง stock_logs สำหรับบันทึกประวัติการปรับปรุงสต็อกด้วยมือ
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

-- เปิด RLS
ALTER TABLE stock_logs ENABLE ROW LEVEL SECURITY;

-- อนุญาตให้อ่านและเขียนได้สำหรับ public (POS)
CREATE POLICY "Allow public read access to stock_logs"
ON stock_logs FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to stock_logs"
ON stock_logs FOR INSERT WITH CHECK (true);
