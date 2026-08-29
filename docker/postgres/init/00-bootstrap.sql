-- =============================================================
-- จำลองสิ่งที่ Supabase มีให้อยู่แล้ว แต่ Postgres เปล่าไม่มี
-- ต้องรันก่อน migration ทุกไฟล์ ไม่งั้น GRANT/REVOKE ที่อ้าง role เหล่านี้จะพัง
-- =============================================================

-- 1. role ทั้ง 4 ตัวของ Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'postgres';
  END IF;
END
$$;

GRANT anon, authenticated, service_role TO authenticator;

-- สิทธิ์ตั้งต้นแบบเดียวกับโปรเจกต์ Supabase ที่เพิ่งสร้าง
-- (migration 20260824 จะ REVOKE ของ anon ทิ้งทั้งหมด — ต้องมีให้ REVOKE ก่อน
--  ไม่งั้นการทดสอบจะ "ผ่าน" เพราะไม่เคยมีสิทธิ์ ไม่ใช่เพราะถูกปิด)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- 2. pgcrypto อยู่ใน schema extensions เหมือน Supabase
--    (ฟังก์ชันในโปรเจกต์ตั้ง search_path = public, extensions ไว้แล้ว)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 3. publication ของ realtime — ให้ 20260730_enable_realtime.sql ได้ทำงานจริง
--    (ไฟล์นั้นกลืน error ทั้งหมดด้วย EXCEPTION WHEN OTHERS THEN NULL = L/F ใน M2
--     ถ้าไม่มี publication มันจะเงียบและเราจะไม่รู้ว่ามันไม่เคยทำงาน)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;
