import type { MemberRfm, RfmSegment } from '@/lib/memberRfm';
import type { MemberTagCode } from '@/lib/memberTags';
import { memberHasTag, parseMemberTags } from '@/lib/memberTags';
import { parseMemberRfm } from '@/lib/memberRfm';

export type PromoTargetSegment =
  | 'all'
  | 'new'
  | 'regular'
  | 'vip'
  | 'dormant'
  | 'rfm_a'
  | 'rfm_b'
  | 'rfm_c';

export const PROMO_SEGMENT_OPTIONS: {
  value: PromoTargetSegment;
  label: string;
  description: string;
}[] = [
  { value: 'all', label: 'ทุกคน', description: 'ไม่จำกัดกลุ่ม' },
  { value: 'dormant', label: 'ลูกค้าหายไป', description: 'ไม่มา ≥30 วัน' },
  { value: 'vip', label: 'VIP', description: 'ยอดสูงหรือมาบ่อย' },
  { value: 'regular', label: 'ลูกค้าประจำ', description: 'มา ≥2 ครั้ง · active' },
  { value: 'new', label: 'ลูกค้าใหม่', description: 'มา ≤1 ครั้ง · active' },
  { value: 'rfm_a', label: 'RFM กลุ่ม A', description: 'ลูกค้าคุณค่าสูง' },
  { value: 'rfm_b', label: 'RFM กลุ่ม B', description: 'ลูกค้ากลาง' },
  { value: 'rfm_c', label: 'RFM กลุ่ม C', description: 'ต้องดูแล' },
];

export function getPromoSegmentMeta(segment: PromoTargetSegment | null | undefined) {
  if (!segment) return PROMO_SEGMENT_OPTIONS[0];
  return PROMO_SEGMENT_OPTIONS.find(o => o.value === segment) ?? PROMO_SEGMENT_OPTIONS[0];
}

export interface SegmentMemberRow {
  phone_number: string;
  name: string;
  lifetime_spend: number;
  visit_count: number;
  last_visit_at: string | null;
  days_inactive: number;
  tags: MemberTagCode[];
  rfm_segment: RfmSegment | null;
}

export function memberMatchesPromoSegment(
  segment: PromoTargetSegment | null | undefined,
  tags: MemberTagCode[],
  rfm: MemberRfm | null,
): boolean {
  if (!segment || segment === 'all') return true;

  switch (segment) {
    case 'new':
      return memberHasTag(tags, 'new');
    case 'regular':
      return memberHasTag(tags, 'regular');
    case 'vip':
      return memberHasTag(tags, 'vip');
    case 'dormant':
      return memberHasTag(tags, 'dormant');
    case 'rfm_a':
      return rfm?.segment === 'A';
    case 'rfm_b':
      return rfm?.segment === 'B';
    case 'rfm_c':
      return rfm?.segment === 'C';
    default:
      return false;
  }
}

export function parsePromoTargetSegment(raw: unknown): PromoTargetSegment | null {
  if (typeof raw !== 'string') return null;
  return PROMO_SEGMENT_OPTIONS.some(o => o.value === raw) ? (raw as PromoTargetSegment) : null;
}
