"use client";

import * as React from "react";
import Image from "next/image";
import { Eraser, PenLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const ACCEPTED_SIGNATURE_TYPES: Record<string, true> = {
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
};
const MAX_SIGNATURE_FILE_SIZE = 750 * 1024;

type SignatureMode = "draw" | "upload";

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
}

export function AdminSignatureDialog({
  open,
  pending,
  title = "Admin Approval Signature",
  description = "Sign this monthly invoice register as official Admin approval.",
  signerLabel = "Admin Name / Designation",
  defaultName = "Admin Ephemeris",
  currentSignatureUrl,
  onOpenChange,
  onSave,
  onClear,
}: {
  open: boolean;
  pending: boolean;
  title?: string;
  description?: string;
  signerLabel?: string;
  defaultName?: string;
  currentSignatureUrl: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureDataUrl: string, signerName: string) => Promise<void>;
  onClear?: () => Promise<void>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = React.useState<SignatureMode>("draw");
  const [hasDrawing, setHasDrawing] = React.useState(false);
  const [uploadedSignature, setUploadedSignature] = React.useState<string | null>(null);
  const [signerName, setSignerName] = React.useState(defaultName);

  React.useEffect(() => {
    if (!open) return;
    setSignerName(defaultName);
    setMode(currentSignatureUrl ? "upload" : "draw");
    setUploadedSignature(currentSignatureUrl ?? null);
    setHasDrawing(false);
    window.requestAnimationFrame(() => clearCanvas(canvasRef.current));
  }, [currentSignatureUrl, defaultName, open]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * event.currentTarget.width,
      y: ((event.clientY - bounds.top) / bounds.height) * event.currentTarget.height,
    };
  }

  function beginDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = "#0f172a";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    setHasDrawing(true);
  }

  function continueDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const point = canvasPoint(event);
    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function uploadSignature(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!ACCEPTED_SIGNATURE_TYPES[file.type]) {
      toast.error("Format tanda tangan harus PNG, JPG, atau WebP.");
      return;
    }
    if (file.size > MAX_SIGNATURE_FILE_SIZE) {
      toast.error("Ukuran file tanda tangan maksimal 750 KB.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setUploadedSignature(reader.result);
    });
    reader.addEventListener("error", () => toast.error("Gagal membaca file tanda tangan."));
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    let signatureDataUrl = uploadedSignature;
    if (mode === "draw") {
      if (!hasDrawing || !canvasRef.current) {
        toast.error("Silakan gambar tanda tangan terlebih dahulu.");
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }
    if (!signatureDataUrl) {
      toast.error("Tanda tangan belum tersedia.");
      return;
    }
    await onSave(signatureDataUrl, signerName.trim() || defaultName || "Admin");
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="admin-signer-name">{signerLabel}</FieldLabel>
            <Input
              id="admin-signer-name"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder="e.g. Admin Ephemeris"
            />
          </Field>

          <div className="flex gap-2 rounded-xl border border-violet-500/20 bg-muted/30 p-1.5">
            <Button
              type="button"
              variant={mode === "draw" ? "default" : "ghost"}
              className="flex-1 text-xs"
              size="sm"
              onClick={() => setMode("draw")}
            >
              <PenLine data-icon="inline-start" className="size-3.5" /> Draw Signature
            </Button>
            <Button
              type="button"
              variant={mode === "upload" ? "default" : "ghost"}
              className="flex-1 text-xs"
              size="sm"
              onClick={() => setMode("upload")}
            >
              <Upload data-icon="inline-start" className="size-3.5" /> Upload Signature
            </Button>
          </div>

          {mode === "draw" ? (
            <div className="flex flex-col gap-2">
              <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-border bg-white shadow-inner">
                <canvas
                  ref={canvasRef}
                  width={640}
                  height={220}
                  className="h-44 w-full touch-none cursor-crosshair bg-white"
                  onPointerDown={beginDrawing}
                  onPointerMove={continueDrawing}
                  onPointerUp={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
                {!hasDrawing ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400 text-xs">
                    <PenLine className="size-6 opacity-40" />
                    <span>Sign here (Touch / Mouse)</span>
                  </div>
                ) : null}
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground px-1">
                <span>Use mouse or touch screen.</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    clearCanvas(canvasRef.current);
                    setHasDrawing(false);
                  }}
                >
                  <Eraser data-icon="inline-start" className="size-3" /> Clear
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="relative flex min-h-44 flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-white p-4">
                {uploadedSignature ? (
                  <div className="relative h-36 w-full max-w-sm">
                    <Image
                      unoptimized
                      fill
                      src={uploadedSignature}
                      alt="Uploaded admin signature"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 text-neutral-400 text-xs">
                    <Upload className="size-8 opacity-40" />
                    <span>No signature file uploaded yet</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex h-8 items-center rounded-lg border border-input bg-background px-3 text-xs font-medium hover:bg-muted">
                    <Upload data-icon="inline-start" className="size-3 mr-1.5" /> Choose image file
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={uploadSignature}
                  />
                </label>
                <FieldDescription className="text-right text-[11px]">
                  Transparent PNG recommended. Max 750 KB.
                </FieldDescription>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
          {currentSignatureUrl && onClear ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 sm:mr-auto"
              disabled={pending}
              onClick={onClear}
            >
              <Trash2 data-icon="inline-start" className="size-3.5" /> Remove Signature
            </Button>
          ) : null}
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm" disabled={pending}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            size="sm"
            disabled={pending || (mode === "draw" && !hasDrawing && !uploadedSignature)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white border-0"
            onClick={handleSave}
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Approve &amp; Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
