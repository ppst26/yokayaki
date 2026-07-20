-- Add category column to menu_items
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'อื่นๆ';

-- Update existing menu items with correct categories
UPDATE menu_items SET category = 'เครื่องดื่ม' WHERE name = 'เบียร์สดโอกินาว่า';
UPDATE menu_items SET category = 'ย่าง' WHERE name = 'ยากิโทริสะโพกไก่ (4 ไม้)';
UPDATE menu_items SET category = 'จานหลัก' WHERE name = 'แก้มปลาต้มซีอิ๊ว';
UPDATE menu_items SET category = 'ซาชิมิ' WHERE name = 'ซาชิมิแซลมอน';
UPDATE menu_items SET category = 'เครื่องเคียง' WHERE name = 'ข้าวสวยญี่ปุ่น';

-- Seed new menu items representing the requested categories safely if they do not exist
INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ราเมงโชยุ', 160.00, 20, false, null, 'เส้น', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ราเมงโชยุ');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ยากิโซบะ', 120.00, 15, false, null, 'เส้น', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ยากิโซบะ');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'เทมปุระกุ้ง', 150.00, 10, false, null, 'ของทอด', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'เทมปุระกุ้ง');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ไก่ทอดคาราเกะ', 90.00, 25, false, null, 'ของทอด', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ไก่ทอดคาราเกะ');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ไอศกรีมชาเขียว', 50.00, 30, false, null, 'ของหวาน', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ไอศกรีมชาเขียว');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'โมจิถั่วแดง', 60.00, 15, false, null, 'ของหวาน', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'โมจิถั่วแดง');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'สุกี้ยากี้เนื้อ (หม้อไฟ)', 350.00, 5, false, null, 'หม้อไฟ', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'สุกี้ยากี้เนื้อ (หม้อไฟ)');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'โอเด้งหม้อไฟ', 280.00, 8, false, null, 'หม้อไฟ', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'โอเด้งหม้อไฟ');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ยากิโทริหมูสามชั้น (4 ไม้)', 90.00, 10, false, null, 'ย่าง', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ยากิโทริหมูสามชั้น (4 ไม้)');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'ชาเขียวร้อน (รีฟิล)', 30.00, 999, false, null, 'เครื่องดื่ม', false
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'ชาเขียวร้อน (รีฟิล)');

INSERT INTO menu_items (name, price, stock, is_happy_hour, happy_hour_price, category, is_stock_tracked)
SELECT 'กิมจิ', 40.00, 50, false, null, 'เครื่องเคียง', true
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = 'กิมจิ');
