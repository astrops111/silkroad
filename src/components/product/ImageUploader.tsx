"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Loader2, ImageIcon, AlertCircle } from "lucide-react";

/* ---------- Types ---------- */
export interface UploadedFile {
  url: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
}

export interface ImageUploaderProps {
  bucket: string;
  folder: string;
  onUpload: (file: UploadedFile) => void;
  maxFiles?: number;
  existingImages?: { url: string; fileName: string }[];
}

interface FileState {
  id: string;
  file?: File;
  url: string;
  fileName: string;
  uploading: boolean;
  error?: string;
  preview?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/* ---------- Component ---------- */
export default function ImageUploader({
  bucket,
  folder,
  onUpload,
  maxFiles = 10,
  existingImages = [],
}: ImageUploaderProps) {
  const [files, setFiles] = useState<FileState[]>(() =>
    existingImages.map((img, i) => ({
      id: `existing-${i}`,
      url: img.url,
      fileName: img.fileName,
      uploading: false,
    }))
  );
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = files.length < maxFiles;

  /* --- Validation --- */
  const validateFile = useCallback(
    (file: File): string | null => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        return `"${file.name}" is not a supported format. Use JPEG, PNG, or WebP.`;
      }
      if (file.size > MAX_SIZE_BYTES) {
        return `"${file.name}" exceeds 10 MB limit.`;
      }
      return null;
    },
    []
  );

  /* --- Upload a single file --- */
  const uploadFile = useCallback(
    async (fileState: FileState, file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("bucket", bucket);
      formData.append("folder", folder);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || "Upload failed");
        }
        const data: UploadedFile = await res.json();

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, url: data.url, fileName: data.fileName, uploading: false }
              : f
          )
        );
        onUpload(data);
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileState.id
              ? { ...f, uploading: false, error: err instanceof Error ? err.message : "Upload failed" }
              : f
          )
        );
      }
    },
    [bucket, folder, onUpload]
  );

  /* --- Process selected files --- */
  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      setGlobalError(null);
      const arr = Array.from(incoming);
      const remaining = maxFiles - files.length;

      if (arr.length > remaining) {
        setGlobalError(`You can upload ${remaining} more image${remaining !== 1 ? "s" : ""} (max ${maxFiles}).`);
        return;
      }

      const newStates: FileState[] = [];

      for (const file of arr) {
        const validationError = validateFile(file);
        if (validationError) {
          setGlobalError(validationError);
          continue;
        }

        const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const preview = URL.createObjectURL(file);

        const state: FileState = {
          id,
          file,
          url: "",
          fileName: file.name,
          uploading: true,
          preview,
        };

        newStates.push(state);
      }

      if (newStates.length > 0) {
        setFiles((prev) => [...prev, ...newStates]);
        newStates.forEach((s) => {
          if (s.file) uploadFile(s, s.file);
        });
      }
    },
    [files.length, maxFiles, validateFile, uploadFile]
  );

  /* --- Event handlers --- */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
      e.target.value = "";
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="group relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-all"
          style={{
            borderColor: dragActive ? "var(--amber)" : "var(--border-default)",
            background: dragActive ? "var(--amber-glow)" : "var(--surface-secondary)",
          }}
        >
          <div
            className="flex size-12 items-center justify-center rounded-full transition-colors"
            style={{
              background: dragActive ? "var(--amber-glow)" : "var(--surface-tertiary)",
            }}
          >
            <Upload
              className="size-5"
              style={{ color: dragActive ? "var(--amber)" : "var(--text-tertiary)" }}
            />
          </div>
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              JPEG, PNG, or WebP up to 10 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Global error */}
      {globalError && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(208, 69, 69, 0.08)",
            color: "var(--danger)",
          }}
        >
          <AlertCircle className="size-4 shrink-0" />
          {globalError}
        </div>
      )}

      {/* Preview grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative aspect-square overflow-hidden rounded-lg border"
              style={{
                borderColor: f.error ? "var(--danger)" : "var(--border-subtle)",
                background: "var(--surface-secondary)",
              }}
            >
              {/* Image */}
              {(f.preview || f.url) ? (
                <img
                  src={f.preview || f.url}
                  alt={f.fileName}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <ImageIcon
                    className="size-8"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                </div>
              )}

              {/* Upload spinner overlay */}
              {f.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <Loader2
                    className="size-6 animate-spin"
                    style={{ color: "var(--amber)" }}
                  />
                </div>
              )}

              {/* Error overlay */}
              {f.error && (
                <div className="absolute inset-x-0 bottom-0 px-2 py-1.5 text-center text-[10px] font-medium bg-red-50/90"
                  style={{ color: "var(--danger)" }}
                >
                  {f.error}
                </div>
              )}

              {/* Remove button */}
              {!f.uploading && (
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  aria-label={`Remove ${f.fileName}`}
                >
                  <X className="size-3.5" />
                </button>
              )}

              {/* Filename */}
              <div
                className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4 text-[10px] text-white"
              >
                {f.fileName}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Counter */}
      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {files.length} / {maxFiles} images
      </p>
    </div>
  );
}
