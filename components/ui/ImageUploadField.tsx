'use client';

import React, { useRef, useState } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import {
  UPLOAD_ACCEPT,
  UPLOAD_HELPER_TEXT,
  validateUploadFile,
} from '@/lib/uploadLimits';

type Props = {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: 'menu' | 'promo';
  disabled?: boolean;
};

export function ImageUploadField({
  value,
  onChange,
  folder,
  disabled = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = disabled || uploading;
  const hasImage = Boolean(value);

  const statusLabel = uploading
    ? 'กำลังอัปโหลด...'
    : hasImage
      ? 'อัปโหลดแล้ว'
      : 'ยังไม่มีรูป';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validationError = validateUploadFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const presignRes = await fetch('/api/uploads/presign', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder,
          contentType: file.type,
          contentLength: file.size,
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
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!putRes.ok) {
        throw new Error('อัปโหลดล้มเหลว กรุณาลองใหม่');
      }

      onChange(publicUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'อัปโหลดล้มเหลว กรุณาลองใหม่'
      );
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setError(null);
    onChange(null);
  };

  return (
    <div className="flex gap-3">
      <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-neutral-700 dark:bg-neutral-800">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-1 text-slate-400 dark:text-neutral-500">
            <ImageIcon className="h-6 w-6" />
            <span className="text-[10px] font-semibold">ไม่มีรูป</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={`text-xs font-bold ${
            hasImage
              ? 'text-green-600 dark:text-green-400'
              : 'text-slate-500 dark:text-neutral-400'
          }`}
        >
          {statusLabel}
        </p>

        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            className="hidden"
            disabled={isDisabled}
            onChange={handleFileChange}
          />
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            {hasImage ? 'เปลี่ยนรูป' : 'เลือกไฟล์'}
          </button>

          {hasImage && (
            <button
              type="button"
              disabled={isDisabled}
              onClick={handleClear}
              className="cursor-pointer rounded-xl border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
            >
              ลบรูป
            </button>
          )}
        </div>

        <p className="text-[10px] font-semibold text-slate-400 dark:text-neutral-500">
          {UPLOAD_HELPER_TEXT}
        </p>

        {error && (
          <p className="text-[10px] font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
