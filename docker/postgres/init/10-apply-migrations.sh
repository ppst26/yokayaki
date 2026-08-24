#!/bin/sh
# =============================================================
# รัน migration ทั้งชุดตามลำดับ — หยุดทันทีที่ไฟล์ไหนพัง (ON_ERROR_STOP=1)
#
# ⚠️ ลำดับไม่ใช่การ sort ชื่อไฟล์ตรงๆ
#    ไฟล์ 3 ตัวนี้เรียงมา "ก่อน" 20260720_promotions.sql ทั้งที่ต้องใช้ตาราง promotions
#    ที่ไฟล์นั้นเป็นคนสร้าง (เพราะ '_' < 's' ในการเรียงอักษร):
#
#      20260720_payment_promotions.sql
#      20260720_promotion_happy_hour.sql
#      20260720_promotion_menu_item.sql
#
#    → `supabase db reset` บน DB เปล่าจะพังทันทีที่ไฟล์แรกในสามตัวนี้
#      (เอกสาร PosRestuarantSass.md §F ระบุไว้แค่ไฟล์เดียว จริงๆ มีสาม)
#      ที่นี่เลื่อนไปรันหลัง promotions เพื่อให้ทดสอบเรื่องอื่นต่อได้
#      ทางแก้จริงคือเปลี่ยนชื่อไฟล์ให้เรียงถูก แล้วลบส่วนเลื่อนลำดับข้างล่างนี้ทิ้ง (M2)
# =============================================================
set -e

PSQL="psql -v ON_ERROR_STOP=1 --username $POSTGRES_USER --dbname $POSTGRES_DB --no-psqlrc --quiet"

ANCHOR="20260720_promotions.sql"
DEFERRED="20260720_payment_promotions.sql 20260720_promotion_happy_hour.sql 20260720_promotion_menu_item.sql"

apply() {
  echo "  -> $(basename "$1")"
  $PSQL -f "$1"
}

is_deferred() {
  for d in $DEFERRED; do
    if [ "$1" = "$d" ]; then return 0; fi
  done
  return 1
}

echo "== run migrations =="
for f in $(ls /migrations/*.sql | sort); do
  base=$(basename "$f")
  if is_deferred "$base"; then
    continue
  fi

  apply "$f"

  if [ "$base" = "$ANCHOR" ]; then
    echo "  (เลื่อนไฟล์ที่ต้องพึ่ง promotions มารันตรงนี้)"
    for d in $DEFERRED; do
      apply "/migrations/$d"
    done
  fi
done

echo "== migrations done =="
