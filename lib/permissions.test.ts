import { describe, expect, it } from 'vitest';
import { canAccessTab, canReadSales } from '@/lib/permissions';

describe('canAccessTab', () => {
  it('cashier เห็น floor, kitchen, history แต่ไม่เห็น dashboard', () => {
    expect(canAccessTab('cashier', 'floor')).toBe(true);
    expect(canAccessTab('cashier', 'kitchen')).toBe(true);
    expect(canAccessTab('cashier', 'history')).toBe(true);
    expect(canAccessTab('cashier', 'dashboard')).toBe(false);
  });

  it('accountant เห็น history/dashboard ไม่เห็น floor', () => {
    expect(canAccessTab('accountant', 'history')).toBe(true);
    expect(canAccessTab('accountant', 'dashboard')).toBe(true);
    expect(canAccessTab('accountant', 'floor')).toBe(false);
  });

  it('kitchen เห็น kitchen และ history ไม่เห็น floor', () => {
    expect(canAccessTab('kitchen', 'kitchen')).toBe(true);
    expect(canAccessTab('kitchen', 'history')).toBe(true);
    expect(canAccessTab('kitchen', 'floor')).toBe(false);
  });
});

describe('canReadSales', () => {
  it('owner/manager/accountant อ่านยอดขายได้', () => {
    expect(canReadSales('owner')).toBe(true);
    expect(canReadSales('manager')).toBe(true);
    expect(canReadSales('accountant')).toBe(true);
  });

  it('cashier/kitchen ไม่เห็น KPI ยอดขายรวม', () => {
    expect(canReadSales('cashier')).toBe(false);
    expect(canReadSales('kitchen')).toBe(false);
  });
});
