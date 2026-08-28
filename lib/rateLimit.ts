import 'server-only';

// =============================================================
// Rate limiting ฝั่ง server (M1/D6) — in-memory per process
//
// ไม่พึ่ง header ที่ client ปลอมได้ (ใช้ clientKeyFrom จาก lib/session)
// สำหรับ multi-instance production ควรย้ายไป Redis/Upstash ใน M7
// =============================================================

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// ล้าง bucket หมดอายุเป็นระยะ กัน memory leak
const SWEEP_INTERVAL_MS = 5 * 60 * 1000;
let lastSweep = Date.now();

function sweepExpired() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

export interface RateLimitConfig {
  /** คีย์รวม เช่น `login:${clientKey}` */
  key: string;
  max: number;
  windowMs: number;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  sweepExpired();
  const now = Date.now();
  const bucket = buckets.get(config.key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(config.key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  if (bucket.count >= config.max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: 'คำขอมากเกินไป กรุณารอก่อน', retryAfterSec },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSec) },
    }
  );
}

/** ใช้ใน route: ถ้าเกิน limit คืน Response 429 */
export function enforceRateLimit(config: RateLimitConfig): Response | null {
  const result = checkRateLimit(config);
  if (!result.allowed) return rateLimitResponse(result.retryAfterSec);
  return null;
}
