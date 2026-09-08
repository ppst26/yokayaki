import { describe, expect, it } from 'vitest';
import { buildWinbackPromoDraft, formatWinbackNote } from './winbackPromo';

describe('winbackPromo', () => {
  it('buildWinbackPromoDraft includes dormant context', () => {
    const draft = buildWinbackPromoDraft(60, 5);
    expect(draft.name).toContain('≥60 วัน');
    expect(draft.name).toContain('5 คน');
    expect(draft.couponCode).toMatch(/^BACK60/);
    expect(draft.discountUnit).toBe('percent');
    expect(draft.minOrderAmount).toBe(300);
    expect(draft.targetSegment).toBe('dormant');
  });

  it('formatWinbackNote', () => {
    const draft = buildWinbackPromoDraft(30, 2);
    expect(formatWinbackNote(draft)).toContain('≥30 วัน');
    expect(formatWinbackNote(draft)).toContain('2 คน');
  });
});
