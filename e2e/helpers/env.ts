import { readFileSync, existsSync } from 'node:fs';

/** อ่าน .env.local สำหรับ Playwright (รันนอก Next.js) */
export function loadEnvLocal(file = '.env.local'): Record<string, string> {
  const env: Record<string, string> = {};
  if (!existsSync(file)) return env;

  const raw = readFileSync(file, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

export function resolveAppEnv(): Record<string, string> {
  const local = loadEnvLocal();
  const get = (key: string, fallback = '') => process.env[key] ?? local[key] ?? fallback;

  let jwtJwk = get('SUPABASE_JWT_SIGNING_JWK');
  const jwkFile = get('SUPABASE_JWT_SIGNING_JWK_FILE');
  if (!jwtJwk && jwkFile && existsSync(jwkFile)) {
    jwtJwk = readFileSync(jwkFile, 'utf8').trim();
  }

  return {
    NEXT_PUBLIC_SUPABASE_URL: get('NEXT_PUBLIC_SUPABASE_URL', 'https://placeholder.supabase.co'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: get('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'placeholder-anon-key'),
    NEXT_PUBLIC_PROMPTPAY_ID: get('NEXT_PUBLIC_PROMPTPAY_ID'),
    SUPABASE_SERVICE_ROLE_KEY: get('SUPABASE_SERVICE_ROLE_KEY', 'placeholder-service-role'),
    SUPABASE_JWT_SECRET: get('SUPABASE_JWT_SECRET', 'placeholder-jwt-secret-min-32-chars-long'),
    SUPABASE_JWT_SIGNING_JWK: jwtJwk,
    TRUSTED_PROXY_HOPS: get('TRUSTED_PROXY_HOPS', '1'),
  };
}

export function isRealSupabaseConfigured(env: Record<string, string>): boolean {
  return !env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');
}
