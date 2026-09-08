import { describe, expect, it } from 'vitest';
import { memberMatchesPromoSegment } from './promoSegments';

describe('promoSegments', () => {
  it('memberMatchesPromoSegment dormant', () => {
    expect(memberMatchesPromoSegment('dormant', ['dormant'], null)).toBe(true);
    expect(memberMatchesPromoSegment('dormant', ['vip'], null)).toBe(false);
  });

  it('memberMatchesPromoSegment rfm', () => {
    expect(
      memberMatchesPromoSegment('rfm_a', [], {
        r: 5,
        f: 4,
        m: 4,
        segment: 'A',
        days_inactive: 3,
      }),
    ).toBe(true);
  });

  it('all matches everyone', () => {
    expect(memberMatchesPromoSegment('all', [], null)).toBe(true);
  });
});
