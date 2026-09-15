# Menu Image Loading & Caching Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Optimize menu and promotion image loading performance on the customer QR ordering portal by adding client-side auto resize/compression before upload, 1-year immutable caching on Cloudflare R2, lazy loading with skeleton shimmer placeholders, and background image preloading.

**Architecture:** 
- A client-side canvas utility (`lib/imageCompression.ts`) shrinks raw camera photos (up to 10MB) down to max 640px WebP (~40–70KB) before presigned upload.
- Cloudflare R2 presigned PUT includes `Cache-Control: public, max-age=31536000, immutable` so browsers and CDN cache images permanently by UUID key.
- A reusable `CustomerImage` component handles lazy loading, async decoding, shimmer skeleton placeholder, and smooth fade-in on load.
- Background preloading warms the browser memory cache for initial category images while customer views the Home tab.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, TailwindCSS v4, HTML5 Canvas API, AWS S3 Client (@aws-sdk/client-s3), Cloudflare R2, Lucide React, Vitest.

## Global Constraints

- Do not break existing R2 upload flow or touch database schemas (`image_url` remains a string URL).
- Do not import `server-only` files from client components.
- Do not add heavy npm dependencies for image compression; use native HTML5 Canvas API.
- Maintain existing dark theme styling in customer portal (`bg-neutral-950`, `border-neutral-800`).
- Ensure all tests pass (`pnpm test:unit` and `pnpm typecheck`).

---

### Task 1: Client-side Image Compression Utility & Unit Tests

**Files:**
- Create: `lib/imageCompression.ts`
- Create: `lib/imageCompression.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface CompressionOptions {
    maxDimension?: number; // default: 640
    quality?: number;      // default: 0.82
  }

  export function calculateTargetDimensions(
    width: number,
    height: number,
    maxDimension: number
  ): { width: number; height: number };

  export function compressImage(
    file: File,
    options?: CompressionOptions
  ): Promise<File>;
  ```

- [ ] **Step 1: Write the failing unit tests for dimension calculation & image compression logic**

Create `lib/imageCompression.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { calculateTargetDimensions } from './imageCompression';

describe('calculateTargetDimensions', () => {
  it('should not scale up images smaller than maxDimension', () => {
    const dims = calculateTargetDimensions(400, 300, 640);
    expect(dims).toEqual({ width: 400, height: 300 });
  });

  it('should scale down landscape images to max width', () => {
    const dims = calculateTargetDimensions(1920, 1080, 640);
    expect(dims.width).toBe(640);
    expect(dims.height).toBe(360);
  });

  it('should scale down portrait images to max height', () => {
    const dims = calculateTargetDimensions(1080, 1920, 640);
    expect(dims.width).toBe(360);
    expect(dims.height).toBe(640);
  });

  it('should scale down square images', () => {
    const dims = calculateTargetDimensions(2000, 2000, 640);
    expect(dims).toEqual({ width: 640, height: 640 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit lib/imageCompression.test.ts`
Expected: FAIL with "Cannot find module './imageCompression'"

- [ ] **Step 3: Implement `lib/imageCompression.ts`**

Create `lib/imageCompression.ts`:
```typescript
export interface CompressionOptions {
  maxDimension?: number;
  quality?: number;
}

const DEFAULT_MAX_DIMENSION = 640;
const DEFAULT_QUALITY = 0.82;

/**
 * Calculates resized dimensions keeping aspect ratio, without upscaling.
 */
export function calculateTargetDimensions(
  width: number,
  height: number,
  maxDimension: number = DEFAULT_MAX_DIMENSION
): { width: number; height: number } {
  if (width <= maxDimension && height <= maxDimension) {
    return { width, height };
  }

  if (width >= height) {
    const scaledHeight = Math.round((height * maxDimension) / width);
    return { width: maxDimension, height: scaledHeight };
  } else {
    const scaledWidth = Math.round((width * maxDimension) / height);
    return { width: scaledWidth, height: maxDimension };
  }
}

/**
 * Resizes and converts image to WebP using native HTML5 Canvas.
 * Accepts JPG, PNG, WebP up to high resolutions and compresses them for web delivery.
 */
export async function compressImage(
  file: File,
  options?: CompressionOptions
): Promise<File> {
  const maxDim = options?.maxDimension ?? DEFAULT_MAX_DIMENSION;
  const quality = options?.quality ?? DEFAULT_QUALITY;

  // If not a supported image MIME, return original
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Use createImageBitmap or Image element
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const { width, height } = calculateTargetDimensions(
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
          maxDim
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file); // fallback to original if canvas context unavailable
          return;
        }

        // High quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            // Generate webp filename
            const originalBase = file.name.replace(/\.[^/.]+$/, '');
            const newFileName = `${originalBase}.webp`;
            const compressedFile = new File([blob], newFileName, {
              type: 'image/webp',
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          'image/webp',
          quality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('ไม่สามารถประมวลผลไฟล์รูปภาพได้'));
    };

    img.src = objectUrl;
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit lib/imageCompression.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/imageCompression.ts lib/imageCompression.test.ts
git commit -m "feat(media): add client-side image compression utility"
```

---

### Task 2: Update Image Upload Field & Selection Limits

**Files:**
- Modify: `lib/uploadLimits.ts`
- Modify: `components/ui/ImageUploadField.tsx`

**Interfaces:**
- Consumes: `compressImage` from `lib/imageCompression.ts`
- Modifies: `validateUploadFile` and `ImageUploadField` upload pipeline

- [ ] **Step 1: Update `lib/uploadLimits.ts` to allow 10MB raw selection**

Update `lib/uploadLimits.ts`:
```typescript
// Shared upload limits — safe to import from Client Components.
// Server routes import the same values via lib/r2 re-exports.

export const UPLOAD_MAX_BYTES = 2 * 1024 * 1024; // 2MB final server limit

// Allows picking raw phone photos before client-side compression
export const CLIENT_RAW_MAX_BYTES = 10 * 1024 * 1024; // 10MB

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
```

- [ ] **Step 2: Update `components/ui/ImageUploadField.tsx` to compress before upload**

In `components/ui/ImageUploadField.tsx`:
Import `validateRawSelectionFile` and `compressImage`:
```typescript
import {
  UPLOAD_ACCEPT,
  UPLOAD_HELPER_TEXT,
  validateRawSelectionFile,
} from '@/lib/uploadLimits';
import { compressImage } from '@/lib/imageCompression';
```

Update `handleFileChange`:
```typescript
  const [compressing, setCompressing] = useState(false);
...
  const isDisabled = disabled || uploading || compressing;
...
  const statusLabel = compressing
    ? 'กำลังปรับแต่งขนาดรูป...'
    : uploading
      ? 'กำลังอัปโหลด...'
      : hasImage
        ? 'อัปโหลดแล้ว'
        : 'ยังไม่มีรูป';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    e.target.value = '';
    if (!rawFile) return;

    const validationError = validateRawSelectionFile(rawFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setCompressing(true);

    let fileToUpload: File;
    try {
      fileToUpload = await compressImage(rawFile);
    } catch {
      fileToUpload = rawFile; // fallback if canvas fails
    } finally {
      setCompressing(false);
    }

    setUploading(true);

    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder,
          contentType: fileToUpload.type,
          contentLength: fileToUpload.size,
        }),
      });

      if (!presignRes.ok) {
        const data = (await presignRes.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(data?.error ?? 'ไม่สามารถขออัปโหลดได้');
      }

      const { uploadUrl, publicUrl } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileToUpload.type,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        body: fileToUpload,
      });

      if (!putRes.ok) {
        throw new Error('อัปโหลดล้มเหลว กรุณาลองใหม่');
      }

      onChange(publicUrl);
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const message =
        raw === 'Failed to fetch'
          ? 'อัปโหลดไม่สำเร็จ (CORS หรือเครือข่าย) — ตรวจ origin ใน R2 หรือรัน node scripts/set-r2-cors.mjs'
          : raw || 'อัปโหลดล้มเหลว กรุณาลองใหม่';
      setError(message);
    } finally {
      setUploading(false);
    }
  };
```

- [ ] **Step 3: Run typecheck to verify build & types**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add lib/uploadLimits.ts components/ui/ImageUploadField.tsx
git commit -m "feat(media): compress image on client before requesting presign and upload"
```

---

### Task 3: Add Cache-Control Header on Cloudflare R2

**Files:**
- Modify: `lib/r2.ts`

**Interfaces:**
- Produces: Presigned PUT URL with `CacheControl: 'public, max-age=31536000, immutable'` and signed headers `content-type`, `cache-control`.

- [ ] **Step 1: Update `lib/r2.ts` presignPut function**

In `lib/r2.ts`:
Update `presignPut`:
```typescript
export const R2_CACHE_CONTROL = 'public, max-age=31536000, immutable';

export async function presignPut(params: {
  folder: R2Folder;
  key: string;
  contentType: string;
  contentLength: number;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { bucket } = getR2Config();
  const s3 = getClient();
  const base = getR2PublicBaseUrl();

  // Set CacheControl so R2 serves images with long-term immutable caching
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    CacheControl: R2_CACHE_CONTROL,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 60,
    signableHeaders: new Set(['content-type', 'cache-control']),
  });
  const publicUrl = `${base}/${params.key}`;

  return { uploadUrl, publicUrl, key: params.key };
}
```

- [ ] **Step 2: Run unit tests to ensure no regressions**

Run: `pnpm test:unit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add lib/r2.ts
git commit -m "feat(media): sign Cache-Control header in R2 presigned PUT"
```

---

### Task 4: Create Reusable CustomerImage Component with Skeleton Shimmer

**Files:**
- Create: `components/customer/CustomerImage.tsx`

**Interfaces:**
- Produces:
  ```typescript
  interface CustomerImageProps {
    src?: string | null;
    alt: string;
    className?: string;
    containerClassName?: string;
    fallbackIcon?: React.ReactNode;
    isSoldOut?: boolean;
    aspectRatio?: 'square' | 'video' | 'auto';
  }
  export function CustomerImage(props: CustomerImageProps): React.JSX.Element;
  ```

- [ ] **Step 1: Implement `components/customer/CustomerImage.tsx`**

Create `components/customer/CustomerImage.tsx`:
```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { UtensilsCrossed } from 'lucide-react';

interface CustomerImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  containerClassName?: string;
  fallbackIcon?: React.ReactNode;
  isSoldOut?: boolean;
}

export function CustomerImage({
  src,
  alt,
  className = '',
  containerClassName = '',
  fallbackIcon,
  isSoldOut = false,
}: CustomerImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Reset states if src changes
  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-neutral-900 text-neutral-600 ${containerClassName}`}
      >
        {fallbackIcon || (
          <UtensilsCrossed className="h-8 w-8 opacity-30 text-neutral-500" />
        )}
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full overflow-hidden bg-neutral-800/80 ${containerClassName}`}>
      {/* Skeleton Shimmer Loading Placeholder */}
      {!isLoaded && (
        <div className="absolute inset-0 z-0 animate-pulse bg-neutral-800">
          <div className="h-full w-full bg-gradient-to-r from-transparent via-neutral-700/20 to-transparent" />
        </div>
      )}

      {/* Actual Image with Lazy Loading & Smooth Fade-in */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        } ${isSoldOut ? 'grayscale-[30%] opacity-45' : ''} ${className}`}
      />
    </div>
  );
}
```

- [ ] **Step 2: Run typecheck to verify CustomerImage props and syntax**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/customer/CustomerImage.tsx
git commit -m "feat(customer): create CustomerImage component with lazy loading and skeleton shimmer"
```

---

### Task 5: Integrate CustomerImage & Background Preload in Customer Portal and POS

**Files:**
- Modify: `app/customer/[session_id]/page.tsx`
- Modify: `components/order/MenuGrid.tsx`

**Interfaces:**
- Consumes: `CustomerImage` from `@/components/customer/CustomerImage`

- [ ] **Step 1: Update `app/customer/[session_id]/page.tsx`**

1. Import `CustomerImage`:
   ```typescript
   import { CustomerImage } from '@/components/customer/CustomerImage';
   ```

2. Add background preloader effect for first category:
   ```typescript
   // Preload first batch of menu images in background when on 'home' tab
   useEffect(() => {
     if (activeTab !== 'home' || menuItems.length === 0 || menuCategories.length === 0) return;

     const firstCategory = menuCategories[0];
     const topItems = menuItems
       .filter(item => normalizeCategoryName(item.category) === firstCategory && item.image_url)
       .slice(0, 8);

     if (typeof window === 'undefined') return;

     const preloadImages = () => {
       topItems.forEach(item => {
         if (item.image_url) {
           const img = new Image();
           img.src = item.image_url;
         }
       });
     };

     if ('requestIdleCallback' in window) {
       const handle = (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(preloadImages);
       return () => (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(handle);
     } else {
       const timer = setTimeout(preloadImages, 800);
       return () => clearTimeout(timer);
     }
   }, [activeTab, menuItems, menuCategories]);
   ```

3. Replace menu item image container (around line 647):
   ```tsx
   {/* Top: 1:1 Image */}
   <div className="w-full aspect-square relative overflow-hidden shrink-0 flex items-center justify-center">
     <CustomerImage
       src={item.image_url}
       alt={item.name}
       isSoldOut={isSoldOut}
     />

     {/* Badges on the image */}
     {isSoldOut ? (
       <span className="absolute top-2 right-2 text-[10px] font-bold tracking-wider bg-black/75 backdrop-blur-xs text-rose-500 border border-rose-900/50 px-2 py-0.5 rounded-md shadow-xs z-10">
         SOLD OUT
       </span>
     ) : isLowStock ? (
       <span className="absolute top-2 right-2 text-[10px] font-bold tracking-wider bg-amber-400 text-neutral-950 px-2 py-0.5 rounded-md shadow-xs z-10">
         เหลือ {item.stock}
       </span>
     ) : null}
   </div>
   ```

4. Replace promotion carousel image (around line 560):
   ```tsx
   <div className="w-full aspect-square rounded-xl overflow-hidden relative shadow-xs flex items-center justify-center">
     <CustomerImage
       src={promo.image_url}
       alt={promo.name}
       fallbackIcon={<Tag className="w-12 h-12 opacity-30 text-red-500" />}
     />
     <span className="absolute top-2.5 left-2.5 z-10 px-2.5 py-1 bg-red-600/95 text-white rounded-lg text-xs font-black shadow-xs">
       {promo.type === 'percentage' ? `ลด ${promo.discount_percent}%` : promo.type === 'fixed' ? `ลด ฿${promo.discount_amount}` : 'ซื้อ 2 แถม 1'}
     </span>
     {promo.start_time && (
       <span className="absolute bottom-2.5 left-2.5 z-10 px-2 py-0.5 bg-black/75 backdrop-blur-xs text-[10px] text-neutral-200 font-semibold rounded-lg flex items-center gap-1 shadow-xs">
         <Clock className="w-3 h-3 text-neutral-300" />
         {promo.start_time.substring(0, 5)} - {promo.end_time?.substring(0, 5)}
       </span>
     )}
   </div>
   ```

- [ ] **Step 2: Update `components/order/MenuGrid.tsx` for Staff POS**

In `components/order/MenuGrid.tsx` around line 100:
Add `loading="lazy"` and `decoding="async"`:
```tsx
  {item.image_url ? (
    <img
      src={item.image_url}
      alt={item.name}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-cover transition-transform duration-300 ${
        isOutOfStock ? 'grayscale opacity-55' : 'group-hover:scale-105'
      }`}
    />
  ) : (
```

- [ ] **Step 3: Run typecheck to verify build**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add app/customer/[session_id]/page.tsx components/order/MenuGrid.tsx
git commit -m "feat(customer): integrate CustomerImage and background preloader"
```

---

### Task 6: Verification & Test Suite Run

**Files:** None (testing existing files)

- [ ] **Step 1: Run unit test suite**

Run: `pnpm test:unit`
Expected: PASS all unit tests

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 3: Final check of git status**

Run: `git status`
Expected: Working tree clean, everything committed
