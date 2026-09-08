import { describe, expect, it } from 'vitest';
import { parseMemberRfm, formatRfmScores } from './memberRfm';

describe('memberRfm', () => {
  it('parseMemberRfm returns valid object', () => {
    const rfm = parseMemberRfm({ r: 4, f: 3, m: 5, segment: 'A', days_inactive: 12 });
    expect(rfm?.segment).toBe('A');
    expect(rfm?.days_inactive).toBe(12);
  });

  it('parseMemberRfm rejects invalid segment', () => {
    expect(parseMemberRfm({ segment: 'X' })).toBeNull();
  });

  it('formatRfmScores', () => {
    expect(formatRfmScores({ r: 5, f: 4, m: 3, segment: 'B', days_inactive: 0 })).toBe(
      'R5 · F4 · M3',
    );
  });
});
