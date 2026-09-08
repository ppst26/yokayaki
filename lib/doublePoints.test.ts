import { describe, expect, it } from 'vitest';
import {
  isDoublePointsActive,
  parseDoublePointsDates,
  sortDoublePointsDates,
  todayInTimezone,
  toggleDoublePointsDate,
} from '@/lib/doublePoints';

describe('parseDoublePointsDates', () => {
  it('filters invalid entries', () => {
    expect(parseDoublePointsDates(['2026-09-09', 'bad', 1, null])).toEqual(['2026-09-09']);
  });
});

describe('todayInTimezone', () => {
  it('returns YYYY-MM-DD in Bangkok', () => {
    const d = new Date('2026-09-08T20:00:00.000Z'); // 03:00 +7 on Sep 9
    expect(todayInTimezone('Asia/Bangkok', d)).toBe('2026-09-09');
  });
});

describe('isDoublePointsActive', () => {
  it('false when disabled', () => {
    expect(isDoublePointsActive(false, ['2026-09-09'], 'Asia/Bangkok')).toBe(false);
  });

  it('true when today is in list', () => {
    const now = new Date('2026-09-09T10:00:00+07:00');
    expect(isDoublePointsActive(true, ['2026-09-08', '2026-09-09'], 'Asia/Bangkok', now)).toBe(
      true,
    );
  });

  it('false when today not in list', () => {
    const now = new Date('2026-09-09T10:00:00+07:00');
    expect(isDoublePointsActive(true, ['2026-09-10'], 'Asia/Bangkok', now)).toBe(false);
  });
});

describe('toggleDoublePointsDate', () => {
  it('adds and removes dates', () => {
    expect(toggleDoublePointsDate([], '2026-09-09')).toEqual(['2026-09-09']);
    expect(toggleDoublePointsDate(['2026-09-09'], '2026-09-09')).toEqual([]);
  });

  it('sorts when adding', () => {
    expect(toggleDoublePointsDate(['2026-09-10'], '2026-09-09')).toEqual([
      '2026-09-09',
      '2026-09-10',
    ]);
  });
});

describe('sortDoublePointsDates', () => {
  it('sorts ascending', () => {
    expect(sortDoublePointsDates(['2026-09-10', '2026-09-01'])).toEqual([
      '2026-09-01',
      '2026-09-10',
    ]);
  });
});
