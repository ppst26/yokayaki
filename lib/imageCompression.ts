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

  // Browser check
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return file;
  }

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
