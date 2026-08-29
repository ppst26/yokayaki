import { readFileSync } from 'node:fs';

/** อ่าน .env.local แบบง่ายๆ (สคริปต์เหล่านี้รันนอก Next.js จึงไม่มี env loader ให้ใช้) */
export function loadEnv(file = '.env.local') {
  const env = {};
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    throw new Error(`อ่าน ${file} ไม่ได้ — รันสคริปต์นี้จาก root ของโปรเจกต์`);
  }

  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

export function requireEnv(env, keys) {
  const missing = keys.filter(k => !env[k]);
  if (missing.length) {
    throw new Error(`ไม่พบค่าใน .env.local: ${missing.join(', ')}`);
  }
}
