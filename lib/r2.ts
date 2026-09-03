import 'server-only';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// =============================================================
// Cloudflare R2 (S3-compatible) — server-only
//
// ⚠️ ห้าม import จาก Client Component
// =============================================================

export type R2Folder = 'menu' | 'promo';

export {
  UPLOAD_ALLOWED_MIMES as R2_ALLOWED_MIMES,
  UPLOAD_MAX_BYTES as R2_MAX_UPLOAD_BYTES,
} from '@/lib/uploadLimits';

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

let client: S3Client | null = null;

function getR2PublicBaseUrl(): string {
  const raw = process.env.R2_PUBLIC_BASE_URL;
  if (!raw) {
    throw new Error('[r2] ไม่พบ R2_PUBLIC_BASE_URL');
  }
  return raw.replace(/\/+$/, '');
}

function getR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;

  if (!accountId) throw new Error('[r2] ไม่พบ R2_ACCOUNT_ID');
  if (!accessKeyId) throw new Error('[r2] ไม่พบ R2_ACCESS_KEY_ID');
  if (!secretAccessKey) throw new Error('[r2] ไม่พบ R2_SECRET_ACCESS_KEY');
  if (!bucket) throw new Error('[r2] ไม่พบ R2_BUCKET');

  return { accountId, accessKeyId, secretAccessKey, bucket };
}

function getClient(): S3Client {
  if (client) return client;

  const { accountId, accessKeyId, secretAccessKey } = getR2Config();
  client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return client;
}

export function mimeToExt(contentType: string): string | null {
  return MIME_TO_EXT[contentType] ?? null;
}

export function publicUrlToKey(url: string): string | null {
  const base = getR2PublicBaseUrl();
  if (!url.startsWith(`${base}/`)) return null;
  const key = url.slice(base.length + 1);
  if (!key || key === '/') return null;
  return key;
}

export function isOurPublicUrl(url: string): boolean {
  return publicUrlToKey(url) !== null;
}

export async function presignPut(params: {
  folder: R2Folder;
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { bucket } = getR2Config();
  const s3 = getClient();
  const base = getR2PublicBaseUrl();

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.contentLength,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 60 });
  const publicUrl = `${base}/${params.key}`;

  return { uploadUrl, publicUrl, key: params.key };
}

export async function deleteObjectByUrl(publicUrl: string): Promise<{ ok: true }> {
  const key = publicUrlToKey(publicUrl);
  if (!key) {
    throw new Error('URL ไม่ใช่ของเรา');
  }

  const { bucket } = getR2Config();
  const s3 = getClient();

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return { ok: true };
}
