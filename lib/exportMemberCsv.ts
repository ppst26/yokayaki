import type { SegmentMemberRow } from '@/lib/promoSegments';

function escapeCsvCell(value: string | number | null | undefined): string {
  const s = value == null ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildMemberSegmentCsv(rows: SegmentMemberRow[]): string {
  const header = [
    'เบอร์โทร',
    'ชื่อ',
    'ยอดรวม',
    'จำนวนครั้ง',
    'ครั้งล่าสุด',
    'หายไป(วัน)',
    'แท็ก',
    'RFM',
  ];

  const lines = [
    header.join(','),
    ...rows.map(r =>
      [
        escapeCsvCell(r.phone_number),
        escapeCsvCell(r.name),
        escapeCsvCell(r.lifetime_spend),
        escapeCsvCell(r.visit_count),
        escapeCsvCell(r.last_visit_at ?? ''),
        escapeCsvCell(r.days_inactive),
        escapeCsvCell(r.tags.join('|')),
        escapeCsvCell(r.rfm_segment ?? ''),
      ].join(','),
    ),
  ];

  return '\uFEFF' + lines.join('\n');
}

export function downloadCsvFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
