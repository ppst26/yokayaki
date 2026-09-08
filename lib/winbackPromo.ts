export interface WinbackPromoDraft {
  name: string;
  couponCode: string;
  discountPercent: number;
  discountAmount: number;
  discountUnit: 'percent' | 'amount';
  minOrderAmount: number;
  endDate: string;
  dormantDaysMin: number;
  targetMemberCount: number;
  targetSegment: 'dormant';
}

/** สร้าง draft สำหรับ pre-fill PromoManager จากกลุ่ม dormant */
export function buildWinbackPromoDraft(
  dormantDaysMin: number,
  targetMemberCount: number,
): WinbackPromoDraft {
  const end = new Date();
  end.setDate(end.getDate() + 30);

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return {
    name: `Win-back — หายไป ≥${dormantDaysMin} วัน (${targetMemberCount} คน)`,
    couponCode: `BACK${dormantDaysMin}${suffix}`,
    discountPercent: 10,
    discountAmount: 50,
    discountUnit: 'percent',
    minOrderAmount: 300,
    endDate: end.toISOString().slice(0, 10),
    dormantDaysMin,
    targetMemberCount,
    targetSegment: 'dormant',
  };
}

export function formatWinbackNote(draft: WinbackPromoDraft): string {
  return `กลุ่มเป้าหมาย: ลูกค้าหายไป ≥${draft.dormantDaysMin} วัน (${draft.targetMemberCount} คน) — แจกรหัสคูปองให้ลูกค้าเอง`;
}
