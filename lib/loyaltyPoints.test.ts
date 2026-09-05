import { describe, expect, it } from 'vitest';
import { clampPointsRedeem, pointsEarnedFromNet } from '@/lib/loyaltyPoints';

describe('pointsEarnedFromNet', () => {
  it('floors net / 10', () => {
    expect(pointsEarnedFromNet(0)).toBe(0);
    expect(pointsEarnedFromNet(99)).toBe(9);
    expect(pointsEarnedFromNet(100)).toBe(10);
    expect(pointsEarnedFromNet(109)).toBe(10);
  });
});

describe('clampPointsRedeem', () => {
  it('ไม่เกินแต้มสมาชิก / ยอดหลังโปร / ค่าที่ขอ', () => {
    expect(clampPointsRedeem(50, 30, 100)).toBe(30);
    expect(clampPointsRedeem(50, 80, 40)).toBe(40);
    expect(clampPointsRedeem(20, 80, 100)).toBe(20);
  });

  it('ไม่ติดลบและ floor ยอดหลังโปร', () => {
    expect(clampPointsRedeem(-5, 10, 10)).toBe(0);
    expect(clampPointsRedeem(10, 10, 9.9)).toBe(9);
  });
});
