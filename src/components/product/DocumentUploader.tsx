"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  X,
  Loader2,
  AlertCircle,
  FileText,
  FileIcon,
  Image as ImageIconLucide,
} from "lucide-react";

export interface UploadedDoc {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface DocState {
  id: string;
  file?: File;
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploading: boolean;
  error?: string;
}

export interface DocumentUploaderProps {
  folder: string;
  onUpload: (doc: UploadedDoc) => void;
  onRemove?: (doc: DocState) => void;
  maxFiles?: number;
  existingDocs?: UploadedDoc[];
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB (documents bucket)

function prettySize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconFor(type: string) {
  if (type.startsWith("image/")) return ImageIconLucide;
  if (type === "application/pdf") return FileText;
  return FileIcon;
}

export default function DocumentUploader({
  folder,
  onUpload,
  onRemove,
  maxFiles = 10,
  existingDocs = [],
}: DocumentUploaderProps) {
  const [docs, setDocs] = useState<DocState[]>(() =>
    existingDocs.map((d, i) => ({
      id: `existing-${i}`,
      url: d.url,
      fileName: d.fileName,
      fileType: d.fileType,
      fileSize: d.fileSize,
      uploading: false,
    }))
  );
  const [dragActive, setDragActive] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const canAddMore = docs.length < maxFiles;

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `"${file.name}" format not supported. Use PDF, Word, Excel, or image.`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" exceeds 50 MB limit.`;
    }
    return null;
  }, []);

  const uploadFile = useCallback(
    async (state: DocState, file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", "documents");
      fd.append("folder", folder);

      try {
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(body || "Upload failed");
        }
        const data = (await res.json()) as UploadedDoc;

        setDocs((prev) =>
          prev.map((d) =>
            d.id === state.id
              ? { ...d, url: data.url, uploading: false }
              : d
          )
        );
        onUpload(data);
      } catch (err) {
        setDocs((prev) =>
          prev.map((d) =>
            d.id === state.id
              ? {
                  ...d,
                  uploading: false,
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : d
          )
        );
      }
    },
    [folder, onUpload]
  );

  const processFiles = useCallback(
    (incoming: FileList | File[]) => {
      setGlobalError(null);
      const arr = Array.from(incoming);
      const remaining = maxFiles - docs.length;

      if (arr.length > remaining) {
        setGlobalError(
          `You can upload ${remaining} more file${remaining !== 1 ? "s" : ""} (max ${maxFiles}).`
        );
        return;
      }

      const newStates: DocState[] = [];
      for (const file of arr) {
        const err = validateFile(file);
        if (err) {
          setGlobalError(err);
          continue;
        }
        newStates.push({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          url: "",
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploading: true,
        });
      }

      if (newStates.length) {
        setDocs((prev) => [...prev, ...newStates]);
        newStates.forEach((s) => s.file && uploadFile(s, s.file));
      }
    },
    [docs.length, maxFiles, validateFile, uploadFile]
  );

  function removeDoc(id: string) {
    const target = docs.find((d) => d.id === id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    if (target && onRemove) onRemove(target);
  }

  return (
    <div className="space-y-3">
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            if (e.dataTransfer.files?.length) processFiles(e.dataTransfer.files);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all"
          style={{
            borderColor: dragActive ? "var(--amber)" : "var(--border-default)",
            background: dragActive
              ? "var(--amber-glow)"
              : "var(--surface-secondary)",
          }}
        >
          <div
            className="flex size-12 items-center justify-center rounded-full"
            style={{
              background: dragActive
                ? "var(--amber-glow)"
                : "var(--surface-tertiary)",
            }}
          >
            <Upload
              className="size-5"
              style={{
                color: dragActive ? "var(--amber)" : "var(--text-tertiary)",
              }}
            />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
              <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                Click to upload
              </span>{" "}
              or drag and drop
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
              PDF, Word, Excel, or image · up to 50 MB
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={(e) => {
              if (e.target.files?.length) {
                processFiles(e.target.files);
                e.target.value = "";
              }
            }}
            className="hidden"
          />
        </div>
      )}

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

      {docs.length > 0 && (
        <ul className="space-y-2">
          {docs.map((d) => {
            const Icon = iconFor(d.fileType);
            return (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: d.error
                    ? "var(--danger)"
                    : "var(--border-subtle)",
                  background: "var(--surface-secondary)",
                }}
              >
                <div
                  className="flex size-9 items-center justify-center rounded-md shrink-0"
                  style={{ background: "var(--surface-tertiary)" }}
                >
                  <Icon
                    className="size-4"
                    style={{ color: "var(--text-secondary)" }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate text-sm font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.fileName}
                    </a>
                  ) : (
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {d.fileName}
                    </p>
                  )}
                  <p
                    className="text-xs"
                    style={{
                      color: d.error ? "var(--danger)" : "var(--text-tertiary)",
                    }}
                  >
                    {d.error
                      ? d.error
                      : d.uploading
                        ? "Uploading…"
                        : prettySize(d.fileSize)}
                  </p>
                </div>
                {d.uploading ? (
                  <Loader2
                    className="size-4 animate-spin shrink-0"
                    style={{ color: "var(--amber)" }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="rounded-md p-1.5 transition-colors hover:bg-[var(--surface-tertiary)] shrink-0"
                    aria-label={`Remove ${d.fileName}`}
                  >
                    <X
                      className="size-4"
                      style={{ color: "var(--text-tertiary)" }}
                    />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {docs.length} / {maxFiles} files
      </p>
    </div>
  );
}
