import { describe, expect, it } from 'vitest';
import { canAccessTab } from '@/lib/permissions';

describe('canAccessTab', () => {
  it('cashier เห็น floor และ kitchen ไม่เห็น history', () => {
    expect(canAccessTab('cashier', 'floor')).toBe(true);
    expect(canAccessTab('cashier', 'kitchen')).toBe(true);
    expect(canAccessTab('cashier', 'history')).toBe(false);
  });

  it('accountant เห็น history/dashboard ไม่เห็น floor', () => {
    expect(canAccessTab('accountant', 'history')).toBe(true);
    expect(canAccessTab('accountant', 'dashboard')).toBe(true);
    expect(canAccessTab('accountant', 'floor')).toBe(false);
  });

  it('kitchen เห็นแค่ kitchen', () => {
    expect(canAccessTab('kitchen', 'kitchen')).toBe(true);
    expect(canAccessTab('kitchen', 'floor')).toBe(false);
  });
});
