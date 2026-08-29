#!/bin/sh
# =============================================================
# รัน migration ทั้งชุดตามลำดับชื่อไฟล์ — หยุดทันทีที่ไฟล์ไหนพัง (ON_ERROR_STOP=1)
#
# ลำดับพึ่งการ sort ชื่อไฟล์ — ไฟล์ที่พึ่ง promotions ใช้ prefix
# 20260720_promotions_* เพื่อเรียงหลัง 20260720_promotions.sql (M2 Sprint A)
# =============================================================
set -e

PSQL="psql -v ON_ERROR_STOP=1 --username $POSTGRES_USER --dbname $POSTGRES_DB --no-psqlrc --quiet"

echo "== run migrations =="
for f in $(ls /migrations/*.sql | sort); do
  echo "  -> $(basename "$f")"
  $PSQL -f "$f"
done

echo "== migrations done =="
