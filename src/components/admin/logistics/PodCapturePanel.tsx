"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Check, Eraser, Loader2, ScanLine, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { capturePod } from "@/lib/actions/pod";

interface ExistingPod {
  signatureUrl: string | null;
  photoUrl: string | null;
  recipientName: string | null;
  notes: string | null;
  deliveredAt: string | null;
}

interface Props {
  shipmentId: string;
  shipmentStatus: string;
  existing: ExistingPod;
}

export function PodCapturePanel({ shipmentId, shipmentStatus, existing }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasInk, setHasInk] = useState(false);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState(existing.recipientName ?? "");
  const [notes, setNotes] = useState(existing.notes ?? "");
  const [pending, startSubmit] = useTransition();

  const isCaptured = Boolean(existing.signatureUrl || existing.photoUrl);
  const isTerminal = ["delivered", "lost", "damaged", "returned"].includes(shipmentStatus);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Clear to white so the exported PNG isn't transparent.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * e.currentTarget.width,
      y: ((e.clientY - rect.top) / rect.height) * e.currentTarget.height,
    };
  }

  function startStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointFromEvent(e);
    setDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function continueStroke(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointFromEvent(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasInk(true);
  }

  function endStroke() {
    setDrawing(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo exceeds 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function submit(markDelivered: boolean) {
    if (recipientName.trim().length < 2) {
      toast.error("Recipient name is required");
      return;
    }
    if (!hasInk && !photoDataUrl && !existing.signatureUrl && !existing.photoUrl) {
      toast.error("Capture a signature or photo first");
      return;
    }
    const signatureDataUrl = hasInk ? canvasRef.current?.toDataURL("image/png") : undefined;

    startSubmit(async () => {
      const res = await capturePod({
        shipmentId,
        recipientName,
        notes,
        signatureDataUrl,
        photoDataUrl: photoDataUrl ?? undefined,
        markDelivered,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success(markDelivered ? "POD captured — shipment delivered" : "POD saved");
      setPhotoDataUrl(null);
      router.refresh();
    });
  }

  if (isCaptured) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
          <ShieldCheck className="size-4 text-emerald-700" />
          <span className="flex-1">
            POD captured · recipient{" "}
            <span className="font-medium">{existing.recipientName ?? "—"}</span>
            {existing.deliveredAt && (
              <span className="text-emerald-800"> · delivered {new Date(existing.deliveredAt).toLocaleString()}</span>
            )}
          </span>
          <Badge variant="secondary">{shipmentStatus}</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {existing.signatureUrl && (
            <Artefact label="Signature" url={existing.signatureUrl} />
          )}
          {existing.photoUrl && (
            <Artefact label="Photo" url={existing.photoUrl} />
          )}
        </div>
        {existing.notes && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
            {existing.notes}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {isTerminal && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Shipment is in a terminal status ({shipmentStatus}) but no POD has been captured. Capture
          one anyway to complete the audit trail.
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Recipient name (required)">
          <Input
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            placeholder="As signed"
          />
        </Field>
        <Field label="Notes">
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Damage / partial delivery / location detail"
          />
        </Field>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">
              Signature
            </label>
            <Button variant="ghost" size="sm" onClick={clearSignature} disabled={!hasInk}>
              <Eraser className="mr-1 size-3" /> Clear
            </Button>
          </div>
          <canvas
            ref={canvasRef}
            width={500}
            height={180}
            className="w-full touch-none rounded-md border bg-white"
            onPointerDown={startStroke}
            onPointerMove={continueStroke}
            onPointerUp={endStroke}
            onPointerLeave={endStroke}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wide text-muted-foreground">
            Recipient / package photo
          </label>
          <label className="flex h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50">
            <Camera className="size-6" />
            {photoDataUrl ? (
              <img src={photoDataUrl} alt="Captured" className="max-h-[150px] rounded" />
            ) : (
              <span>Click to upload (or use phone camera)</span>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhoto}
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => submit(false)} disabled={pending}>
          {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ScanLine className="mr-1 size-4" />}
          Save POD
        </Button>
        <Button onClick={() => submit(true)} disabled={pending}>
          {pending ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Check className="mr-1 size-4" />}
          Save & mark delivered
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Artefact({ label, url }: { label: string; url: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        <img src={url} alt={label} className="max-h-[200px] w-full rounded border bg-white object-contain" />
      </a>
    </div>
  );
}
