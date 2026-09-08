// =============================================================
// ตั้ง CORS ให้ Cloudflare R2 bucket สำหรับ browser PUT (presigned upload)
//
//   node scripts/set-r2-cors.mjs
//   node scripts/set-r2-cors.mjs https://custom-domain.com
//
// ใช้เมื่ออัปโหลดรูปเมนู/โปรได้ Failed to fetch จาก production / origin ใหม่
// =============================================================
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from '@aws-sdk/client-s3';
import { loadEnv, requireEnv } from './_env.mjs';

const env = loadEnv();
requireEnv(env, [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
]);

const extraOrigins = process.argv.slice(2).filter(Boolean);

const origins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://yokayaki.vercel.app',
  ...extraOrigins,
];

if (env.ALLOWED_DEV_ORIGINS) {
  for (const host of env.ALLOWED_DEV_ORIGINS.split(',')
    .map(s => s.trim())
    .filter(Boolean)) {
    origins.push(`http://${host}:3000`);
  }
}

const uniqueOrigins = [...new Set(origins)];

const client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const bucket = env.R2_BUCKET;

console.log('Bucket:', bucket);
console.log('AllowedOrigins:', uniqueOrigins);

await client.send(
  new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: uniqueOrigins,
          AllowedMethods: ['GET', 'PUT', 'HEAD'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['ETag'],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);

const after = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
console.log('✓ CORS อัปเดตแล้ว:');
console.log(JSON.stringify(after.CORSRules, null, 2));
