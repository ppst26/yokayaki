export type RfmSegment = 'A' | 'B' | 'C';

export interface MemberRfm {
  r: number;
  f: number;
  m: number;
  segment: RfmSegment;
  days_inactive: number;
}

export const RFM_SEGMENT_META: Record<
  RfmSegment,
  { label: string; description: string; className: string }
> = {
  A: {
    label: 'กลุ่ม A',
    description: 'ลูกค้าคุณค่าสูง — มาล่าสุด · มาบ่อย · ยอดสูง',
    className:
      'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-900/50',
  },
  B: {
    label: 'กลุ่ม B',
    description: 'ลูกค้ากลาง — มีศักยภาลเติบโต',
    className:
      'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-900/50',
  },
  C: {
    label: 'กลุ่ม C',
    description: 'ลูกค้าต้องดูแล — มาน้อยหรือยอดต่ำ',
    className:
      'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200/80 dark:border-neutral-700/60',
  },
};

export const RFM_SEGMENT_FILTER_OPTIONS: { value: 'all' | RfmSegment; label: string }[] = [
  { value: 'all', label: 'กลุ่มลูกค้าทั้งหมด' },
  { value: 'A', label: 'กลุ่ม A' },
  { value: 'B', label: 'กลุ่ม B' },
  { value: 'C', label: 'กลุ่ม C' },
];

export const DORMANT_DAYS_OPTIONS: { value: 30 | 60 | 90; label: string }[] = [
  { value: 30, label: '≥30 วัน' },
  { value: 60, label: '≥60 วัน' },
  { value: 90, label: '≥90 วัน' },
];

export function parseMemberRfm(raw: unknown): MemberRfm | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const segment = o.segment;
  if (segment !== 'A' && segment !== 'B' && segment !== 'C') return null;

  return {
    r: Number(o.r) || 1,
    f: Number(o.f) || 1,
    m: Number(o.m) || 1,
    segment,
    days_inactive: Number(o.days_inactive) || 0,
  };
}

export function formatRfmScores(rfm: MemberRfm): string {
  return `R${rfm.r} · F${rfm.f} · M${rfm.m}`;
}
