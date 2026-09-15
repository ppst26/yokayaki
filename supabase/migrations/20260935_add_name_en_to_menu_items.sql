-- =============================================================
-- Migration: Add name_en (English Name) to menu_items table
-- =============================================================

BEGIN;

ALTER TABLE public.menu_items
ADD COLUMN IF NOT EXISTS name_en TEXT DEFAULT NULL;

-- Seed English names for common Japanese/Izakaya dishes in Yokayaki
UPDATE public.menu_items SET name_en = 'Kimchi' WHERE name = 'กิมจิ';
UPDATE public.menu_items SET name_en = 'Gyoza' WHERE name IN ('เกี้ยวซ่า', 'เกี๊ยวซ่า');
UPDATE public.menu_items SET name_en = 'Chicken Karaage' WHERE name IN ('ไก่คาราเกะ', 'ไก่คาราอาเกะ');
UPDATE public.menu_items SET name_en = 'Tako Wasabi' WHERE name = 'ทาโกะวาซาบิ';
UPDATE public.menu_items SET name_en = 'Edamame' WHERE name IN ('ถั่วแระญี่ปุ่น', 'ถั่วแระ');
UPDATE public.menu_items SET name_en = 'French Fries' WHERE name IN ('เฟรนซ์ฟาย', 'เฟรนช์ฟราย');
UPDATE public.menu_items SET name_en = 'Takoyaki' WHERE name = 'ทาโกะยากิ';
UPDATE public.menu_items SET name_en = 'Seaweed Salad' WHERE name = 'ยำสาหร่าย';
UPDATE public.menu_items SET name_en = 'Salmon Spicy Salad' WHERE name IN ('ยำแซลมอน', 'ยำแซลมอล', 'ยำแซลม่อน');
UPDATE public.menu_items SET name_en = 'Salmon Salad' WHERE name IN ('สลัดแซลมอน', 'สลัดแซลม่อน', 'สลัดแซลมอล');
UPDATE public.menu_items SET name_en = 'Tofu Salad' WHERE name = 'สลัดเต้าหู้';
UPDATE public.menu_items SET name_en = 'Cold Tofu' WHERE name IN ('เต้าหู้เย็น', 'เต้าหู้');
UPDATE public.menu_items SET name_en = 'Unagi Don' WHERE name IN ('ข้าวหน้าปลาไหล', 'ข้าวหน้าปลาไหลล้น');
UPDATE public.menu_items SET name_en = 'Gyudon (Beef Rice Bowl)' WHERE name = 'ข้าวหน้าเนื้อ';
UPDATE public.menu_items SET name_en = 'Butadon (Pork Rice Bowl)' WHERE name = 'ข้าวหน้าหมู';
UPDATE public.menu_items SET name_en = 'Salmon Don' WHERE name = 'ข้าวหน้าแซลมอน';
UPDATE public.menu_items SET name_en = 'Aburi Salmon Don' WHERE name = 'ข้าวหน้าแซลมอนเบริน';
UPDATE public.menu_items SET name_en = 'Yakisoba' WHERE name = 'ยากิโซบะ';
UPDATE public.menu_items SET name_en = 'Udon' WHERE name = 'อูด้ง';
UPDATE public.menu_items SET name_en = 'Pork Udon' WHERE name = 'อุด้งหมูสไลด์';
UPDATE public.menu_items SET name_en = 'Beef Udon' WHERE name = 'อุด้งเนื้อสไลด์';
UPDATE public.menu_items SET name_en = 'Onigiri' WHERE name = 'ข้าวปั้น';
UPDATE public.menu_items SET name_en = 'Tuna Onigiri' WHERE name = 'ข้าวปั้นทูน่า';
UPDATE public.menu_items SET name_en = 'Japanese Rice' WHERE name IN ('ข้าวเปล่า', 'ข้าวสวยญี่ปุ่น');
UPDATE public.menu_items SET name_en = 'Salmon Sashimi' WHERE name IN ('แซลมอนซาซิมิ', 'แซลม่อลซาซิมิ', 'ซาซิมิแซลมอน');
UPDATE public.menu_items SET name_en = 'Salmon Sushi' WHERE name IN ('ซูชิแซลมอน', 'ซูชิแซลม่อน');
UPDATE public.menu_items SET name_en = 'Tamagoyaki Sushi' WHERE name = 'ซูชิไข่หวาน';
UPDATE public.menu_items SET name_en = 'Ebiko Sushi' WHERE name IN ('ซูซิไข้กุ้ง', 'ซูชิไข่กุ้ง');
UPDATE public.menu_items SET name_en = 'Salmon Roll' WHERE name IN ('ซูชิแซลม่อลโรล', 'แซลม่อลโรล', 'แซลมอนโรล');
UPDATE public.menu_items SET name_en = 'California Roll' WHERE name = 'แคลิฟอร์เนียโรล';
UPDATE public.menu_items SET name_en = 'Aburi Salmon Roll' WHERE name = 'แซลมอนเบิร์นโรล';
UPDATE public.menu_items SET name_en = 'Tamagoyaki (Sweet Egg)' WHERE name = 'ไข่หวาน';
UPDATE public.menu_items SET name_en = 'Grilled Chicken Wings' WHERE name = 'ปีกไก่';
UPDATE public.menu_items SET name_en = 'Grilled Chicken Liver' WHERE name = 'ตับไก่ย่าง';
UPDATE public.menu_items SET name_en = 'Grilled Pork Belly' WHERE name IN ('หมูสามชั้นย่าง', 'หมูสามชั้นพันเห็ด');
UPDATE public.menu_items SET name_en = 'Grilled Beef' WHERE name = 'เนื้อย่าง';
UPDATE public.menu_items SET name_en = 'Water' WHERE name = 'น้ำ';

COMMIT;
