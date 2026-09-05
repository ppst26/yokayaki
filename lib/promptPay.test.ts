import { describe, expect, it } from 'vitest';
import { generatePromptPayQR } from '@/lib/promptPay';

describe('generatePromptPayQR', () => {
  it('แปลงเบอร์ 10 หลักขึ้นต้น 0 เป็น 0066… และมี CRC คงที่', () => {
    const payload = generatePromptPayQR('0812345678', 100);
    expect(payload).toBe(
      '00020101021229370016A0000006770101110213006681234567853037645406100.005802TH5908YOKAYAKI630429B5'
    );
    expect(payload.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  it('เลข 13 หลักไม่ใส่ 0066', () => {
    const payload = generatePromptPayQR('1234567890123', 12.5);
    expect(payload).toBe(
      '00020101021229370016A000000677010111021312345678901235303764540512.505802TH5908YOKAYAKI6304B94F'
    );
    expect(payload.includes('0066')).toBe(false);
  });

  it('มี currency THB และ country TH', () => {
    const payload = generatePromptPayQR('0812345678', 1);
    expect(payload).toContain('5303764');
    expect(payload).toContain('5802TH');
    expect(payload).toContain('5908YOKAYAKI');
  });
});
