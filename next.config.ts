import type { NextConfig } from "next";

/** Comma-separated hostnames/IPs for LAN dev (QR testing from phone). Set in .env.local */
function allowedDevOriginsFromEnv(): string[] {
  const raw = process.env.ALLOWED_DEV_ORIGINS?.trim();
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

const allowedDevOrigins = allowedDevOriginsFromEnv();

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 && { allowedDevOrigins }),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
        ],
      },
    ];
  },
};

export default nextConfig;
