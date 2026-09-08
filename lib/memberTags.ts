export type MemberTagCode = 'new' | 'regular' | 'vip' | 'dormant';

export const MEMBER_TAG_ORDER: MemberTagCode[] = ['vip', 'regular', 'new', 'dormant'];

export const MEMBER_TAG_META: Record<
  MemberTagCode,
  { label: string; className: string }
> = {
  new: {
    label: 'ใหม่',
    className:
      'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-900/50',
  },
  regular: {
    label: 'ประจำ',
    className:
      'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-900/50',
  },
  vip: {
    label: 'VIP',
    className:
      'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-900/50',
  },
  dormant: {
    label: 'หายไป',
    className:
      'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 border-slate-200/80 dark:border-neutral-700/60',
  },
};

export const MEMBER_TAG_FILTER_OPTIONS: { value: 'all' | MemberTagCode; label: string }[] = [
  { value: 'all', label: 'ประเภทลูกค้าทั้งหมด' },
  { value: 'new', label: 'ใหม่' },
  { value: 'regular', label: 'ประจำ' },
  { value: 'vip', label: 'VIP' },
  { value: 'dormant', label: 'หายไป' },
];

export function sortMemberTags(tags: MemberTagCode[]): MemberTagCode[] {
  return MEMBER_TAG_ORDER.filter(t => tags.includes(t));
}

export function parseMemberTags(raw: unknown): MemberTagCode[] {
  if (!Array.isArray(raw)) return [];
  return sortMemberTags(
    raw.filter((t): t is MemberTagCode =>
      t === 'new' || t === 'regular' || t === 'vip' || t === 'dormant',
    ),
  );
}

export function memberHasTag(tags: MemberTagCode[], code: MemberTagCode): boolean {
  return tags.includes(code);
}
