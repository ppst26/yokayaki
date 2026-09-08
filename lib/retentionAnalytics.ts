export interface RetentionBucket {
  bills: number;
  net: number;
  points_redeemed: number;
}

export interface MemberVsWalkin {
  member: RetentionBucket;
  walkin: RetentionBucket;
  member_share_pct: number;
}

export interface PromoRoiRow {
  promotion_id: number;
  name: string;
  uses: number;
  discount_total: number;
  sales_with_promo: number;
  roi: number | null;
}

export interface HeatmapCell {
  dow: number;
  hour: number;
  net: number;
  bills: number;
}

export interface RetentionHeatmap {
  hours: number[];
  dows: number[];
  cells: HeatmapCell[];
}

export interface RetentionAnalytics {
  member_vs_walkin: MemberVsWalkin;
  promo_roi: PromoRoiRow[];
  heatmap: RetentionHeatmap;
}

export const HEATMAP_DOW_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'] as const;

function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseBucket(raw: unknown): RetentionBucket {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    bills: Math.floor(num(o.bills)),
    net: num(o.net),
    points_redeemed: Math.floor(num(o.points_redeemed)),
  };
}

/** แปลง JSON จาก get_retention_analytics ให้เป็น typed object */
export function parseRetentionAnalytics(raw: unknown): RetentionAnalytics {
  const root = (raw ?? {}) as Record<string, unknown>;
  const mvw = (root.member_vs_walkin ?? {}) as Record<string, unknown>;
  const heat = (root.heatmap ?? {}) as Record<string, unknown>;

  const promo_roi: PromoRoiRow[] = Array.isArray(root.promo_roi)
    ? root.promo_roi.map((row: unknown) => {
        const r = (row ?? {}) as Record<string, unknown>;
        const discount = num(r.discount_total);
        const sales = num(r.sales_with_promo);
        const roiRaw = r.roi;
        return {
          promotion_id: Math.floor(num(r.promotion_id)),
          name: typeof r.name === 'string' ? r.name : '—',
          uses: Math.floor(num(r.uses)),
          discount_total: discount,
          sales_with_promo: sales,
          roi: roiRaw === null || roiRaw === undefined ? null : num(roiRaw),
        };
      })
    : [];

  const cells: HeatmapCell[] = Array.isArray(heat.cells)
    ? heat.cells.map((c: unknown) => {
        const cell = (c ?? {}) as Record<string, unknown>;
        return {
          dow: Math.floor(num(cell.dow)),
          hour: Math.floor(num(cell.hour)),
          net: num(cell.net),
          bills: Math.floor(num(cell.bills)),
        };
      })
    : [];

  return {
    member_vs_walkin: {
      member: parseBucket(mvw.member),
      walkin: parseBucket(mvw.walkin),
      member_share_pct: num(mvw.member_share_pct),
    },
    promo_roi,
    heatmap: {
      hours: Array.isArray(heat.hours) ? heat.hours.map(num) : Array.from({ length: 24 }, (_, i) => i),
      dows: Array.isArray(heat.dows) ? heat.dows.map(num) : Array.from({ length: 7 }, (_, i) => i),
      cells,
    },
  };
}

/** ความเข้มสี 0–1 จากยอดใน cell เทียบกับยอดสูงสุด */
export function heatmapIntensity(net: number, maxNet: number): number {
  if (maxNet <= 0 || net <= 0) return 0;
  return Math.min(1, net / maxNet);
}

export function heatmapCellMap(cells: HeatmapCell[]): Map<string, HeatmapCell> {
  const map = new Map<string, HeatmapCell>();
  for (const c of cells) {
    map.set(`${c.dow}-${c.hour}`, c);
  }
  return map;
}

/** ชั่วโมงที่มีข้อมูล หรือช่วง 10–22 ถ้ายังว่าง */
export function heatmapDisplayHours(cells: HeatmapCell[]): number[] {
  const hours = [...new Set(cells.map(c => c.hour))].sort((a, b) => a - b);
  if (hours.length === 0) {
    return Array.from({ length: 13 }, (_, i) => i + 10);
  }
  const min = Math.min(...hours);
  const max = Math.max(...hours);
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}
