import { describe, expect, it } from 'vitest';
import {
  heatmapDisplayHours,
  heatmapIntensity,
  parseRetentionAnalytics,
} from '@/lib/retentionAnalytics';

describe('parseRetentionAnalytics', () => {
  it('parses member / walkin / promo / heatmap', () => {
    const parsed = parseRetentionAnalytics({
      member_vs_walkin: {
        member: { bills: 2, net: '200.00', points_redeemed: 10 },
        walkin: { bills: 1, net: 100, points_redeemed: 0 },
        member_share_pct: 66.7,
      },
      promo_roi: [
        {
          promotion_id: 1,
          name: 'ลด 50',
          uses: 1,
          discount_total: 50,
          sales_with_promo: 200,
          roi: 4,
        },
      ],
      heatmap: {
        hours: [0, 1],
        dows: [0, 1],
        cells: [{ dow: 0, hour: 12, net: 100, bills: 1 }],
      },
    });

    expect(parsed.member_vs_walkin.member.net).toBe(200);
    expect(parsed.member_vs_walkin.member_share_pct).toBe(66.7);
    expect(parsed.promo_roi[0].roi).toBe(4);
    expect(parsed.heatmap.cells[0].hour).toBe(12);
  });
});

describe('heatmapIntensity', () => {
  it('scales 0–1', () => {
    expect(heatmapIntensity(0, 100)).toBe(0);
    expect(heatmapIntensity(50, 100)).toBe(0.5);
    expect(heatmapIntensity(200, 100)).toBe(1);
  });
});

describe('heatmapDisplayHours', () => {
  it('defaults to 10–22 when empty', () => {
    expect(heatmapDisplayHours([])).toEqual([
      10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22,
    ]);
  });

  it('spans min–max when data exists', () => {
    expect(
      heatmapDisplayHours([
        { dow: 0, hour: 11, net: 1, bills: 1 },
        { dow: 1, hour: 14, net: 1, bills: 1 },
      ]),
    ).toEqual([11, 12, 13, 14]);
  });
});
