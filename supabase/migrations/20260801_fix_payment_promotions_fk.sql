-- =============================================
-- Migration: Fix payment_promotions FK Constraint
-- แก้ไขคอลัมน์ promotion_id ให้เป็น NULLable เพื่อให้ ON DELETE SET NULL ทำงานได้เมื่อลบโปรโมชั่น
-- =============================================

ALTER TABLE payment_promotions ALTER COLUMN promotion_id DROP NOT NULL;
