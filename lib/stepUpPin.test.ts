import { describe, it, expect, vi } from 'vitest';
import { voidCompletedBillBodySchema } from './api/schemas';
import { VOID_REASONS } from './voidReasons';

describe('voidCompletedBillBodySchema', () => {
  it('validates a correct payload with standard reasonCode', () => {
    const valid = {
      orderId: 42,
      pin: '123456',
      reasonCode: 'wrong_bill',
      reasonNote: null,
    };
    const parsed = voidCompletedBillBodySchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.orderId).toBe(42);
      expect(parsed.data.pin).toBe('123456');
      expect(parsed.data.reasonCode).toBe('wrong_bill');
    }
  });

  it('rejects invalid PIN (not 6 digits)', () => {
    const invalidPin = {
      orderId: 42,
      pin: '12345', // 5 digits
      reasonCode: 'wrong_bill',
    };
    const parsed = voidCompletedBillBodySchema.safeParse(invalidPin);
    expect(parsed.success).toBe(false);
  });

  it('requires reasonNote when reasonCode is "other"', () => {
    const missingNote = {
      orderId: 42,
      pin: '123456',
      reasonCode: 'other',
      reasonNote: '',
    };
    const parsed = voidCompletedBillBodySchema.safeParse(missingNote);
    expect(parsed.success).toBe(false);

    const withNote = {
      orderId: 42,
      pin: '123456',
      reasonCode: 'other',
      reasonNote: 'ลูกค้าย้ายโต๊ะและคิดเงินซ้ำ',
    };
    const parsedWithNote = voidCompletedBillBodySchema.safeParse(withNote);
    expect(parsedWithNote.success).toBe(true);
  });

  it('rejects invalid reasonCode not in VOID_REASONS', () => {
    const badCode = {
      orderId: 42,
      pin: '123456',
      reasonCode: 'not_a_real_code',
    };
    const parsed = voidCompletedBillBodySchema.safeParse(badCode);
    expect(parsed.success).toBe(false);
  });
});

