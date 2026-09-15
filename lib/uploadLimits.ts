// Shared upload limits — safe to import from Client Components.
// Server routes import the same values via lib/r2 re-exports.

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024;

// Allows picking raw phone photos before client-side compression
export const CLIENT_RAW_MAX_BYTES = 10 * 1024 * 1024;

export const UPLOAD_ALLOWED_MIMES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const UPLOAD_HELPER_TEXT = 'JPG / PNG / WebP · ย่อขนาดอัตโนมัติ (ไม่เกิน 10 MB)';

export const UPLOAD_ACCEPT = 'image/jpeg,image/png,image/webp';

export function validateUploadFile(file: File): string | null {
  if (!UPLOAD_ALLOWED_MIMES.has(file.type)) {
    return 'ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, WebP)';
  }
  if (file.size > UPLOAD_MAX_BYTES) {
    return 'ไฟล์ใหญ่เกิน 2 MB';
  }
  return null;
}

export function validateRawSelectionFile(file: File): string | null {
  if (!UPLOAD_ALLOWED_MIMES.has(file.type)) {
    return 'ประเภทไฟล์ไม่รองรับ (รองรับ JPG, PNG, WebP)';
  }
  if (file.size > CLIENT_RAW_MAX_BYTES) {
    return 'ไฟล์รูปภาพต้นฉบับใหญ่เกิน 10 MB';
  }
  return null;
}
