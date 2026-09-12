-- =============================================================
-- เพิ่มโต๊ะ 5–7 ให้ครบผังใหม่ (ทุก org)
-- =============================================================

BEGIN;

INSERT INTO public.tables (org_id, table_number, status)
SELECT o.id, n.table_number, 'vacant'
FROM public.organizations o
CROSS JOIN (VALUES (5), (6), (7)) AS n(table_number)
ON CONFLICT (org_id, table_number) DO NOTHING;

COMMIT;
