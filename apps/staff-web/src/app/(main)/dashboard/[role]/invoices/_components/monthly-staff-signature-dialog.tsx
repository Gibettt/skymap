"use client";

import * as React from "react";

import Image from "next/image";
import { Eraser, PenLine, Upload } from "lucide-react";
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

import type { MonthlyInvoiceStaffSignature } from "./types";

type SignatureMode = "draw" | "upload";

const ACCEPTED_SIGNATURE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIGNATURE_FILE_SIZE = 750 * 1024;

function clearCanvas(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");
  if (canvas && context) context.clearRect(0, 0, canvas.width, canvas.height);
}

export function MonthlyStaffSignatureDialog({
  current,
  monthLabel,
  open,
  pending,
  staffName,
  onOpenChange,
  onSave,
}: {
  current: MonthlyInvoiceStaffSignature | null;
  monthLabel: string;
  open: boolean;
  pending: boolean;
  staffName: string;
  onOpenChange: (open: boolean) => void;
  onSave: (signatureDataUrl: string) => Promise<void>;
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = React.useState<SignatureMode>("draw");
  const [hasDrawing, setHasDrawing] = React.useState(false);
  const [uploadedSignature, setUploadedSignature] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setMode(current ? "upload" : "draw");
    setUploadedSignature(current?.signature_data_url ?? null);
    setHasDrawing(false);
    window.requestAnimationFrame(() => clearCanvas(canvasRef.current));
  }, [current, open]);

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
    context.strokeStyle = "#111827";
    context.lineWidth = 5;
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
    if (!ACCEPTED_SIGNATURE_TYPES.has(file.type)) {
      toast.error("Signature must be a PNG, JPG, or WebP image.");
      return;
    }
    if (file.size > MAX_SIGNATURE_FILE_SIZE) {
      toast.error("Signature image must be smaller than 750 KB.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => typeof reader.result === "string" && setUploadedSignature(reader.result));
    reader.addEventListener("error", () => toast.error("Could not read the signature image."));
    reader.readAsDataURL(file);
  }

  async function save() {
    let signatureDataUrl = uploadedSignature;
    if (mode === "draw") {
      if (!hasDrawing || !canvasRef.current) {
        toast.error("Draw your signature before saving.");
        return;
      }
      signatureDataUrl = canvasRef.current.toDataURL("image/png");
    }
    if (!signatureDataUrl) {
      toast.error("Upload a signature image before saving.");
      return;
    }
    await onSave(signatureDataUrl);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{current ? "Update responsible staff signature" : "Responsible staff signature"}</DialogTitle>
          <DialogDescription>
            Sign the {monthLabel} invoice register as the Internal Staff member responsible for this submission.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 rounded-xl border border-cyan-300/15 bg-[#03152e]/60 p-1.5">
          <Button type="button" variant={mode === "draw" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("draw")}>
            <PenLine data-icon="inline-start" /> Draw
          </Button>
          <Button type="button" variant={mode === "upload" ? "default" : "ghost"} className="flex-1" onClick={() => setMode("upload")}>
            <Upload data-icon="inline-start" /> Upload
          </Button>
        </div>

        {mode === "draw" ? (
          <Field>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Draw signature</FieldLabel>
              <Button type="button" size="sm" variant="ghost" disabled={!hasDrawing} onClick={() => { clearCanvas(canvasRef.current); setHasDrawing(false); }}>
                <Eraser data-icon="inline-start" /> Clear
              </Button>
            </div>
            <canvas
              ref={canvasRef}
              width={900}
              height={280}
              aria-label="Responsible staff signature drawing area"
              className="h-44 w-full touch-none rounded-xl border border-cyan-300/25 bg-white shadow-inner sm:h-48"
              onPointerDown={beginDrawing}
              onPointerMove={continueDrawing}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
            />
            <FieldDescription>Use a mouse, stylus, or finger inside the white area.</FieldDescription>
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="monthly-staff-signature-upload">Upload signature</FieldLabel>
            <Input
              id="monthly-staff-signature-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={uploadSignature}
              className="h-10 cursor-pointer border-cyan-300/35 bg-[#071d3d]/90 py-1 text-slate-100 file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-cyan-300/50 file:bg-cyan-950/90 file:px-3 file:py-1 file:font-semibold file:text-cyan-200 file:shadow-sm hover:file:bg-cyan-900 hover:file:text-white"
            />
            <FieldDescription>PNG, JPG, or WebP. Maximum file size 750 KB.</FieldDescription>
            <div className="relative grid h-44 place-items-center overflow-hidden rounded-xl border border-cyan-300/25 bg-white p-3 shadow-inner sm:h-48">
              {uploadedSignature ? (
                <Image unoptimized src={uploadedSignature} alt={`Signature of ${staffName}`} width={600} height={180} className="max-h-full w-auto max-w-full object-contain" />
              ) : (
                <p className="text-center text-slate-500 text-sm">The uploaded signature will appear here.</p>
              )}
            </div>
          </Field>
        )}

        <div className="rounded-xl border border-cyan-300/18 bg-[#03152e]/60 p-3 text-center">
          <p className="text-slate-400 text-xs uppercase tracking-[0.18em]">Responsible Internal Staff</p>
          <p className="mt-1 font-semibold text-white">{staffName}</p>
          <p className="text-slate-400 text-xs">Name is taken automatically from the signed-in account.</p>
        </div>

        <DialogFooter className="gap-2 border-cyan-200/15 border-t pt-4 sm:justify-end">
          <DialogClose asChild>
            <Button
              type="button"
              variant="outline"
              className="!border-cyan-200/35 !bg-[#071d3d] !text-slate-100 hover:!bg-[#0b2a54] hover:!text-white disabled:!text-slate-300 disabled:!opacity-80 font-medium"
              disabled={pending}
            >
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending}
            onClick={save}
            className="!bg-gradient-to-r !from-fuchsia-600 !to-violet-700 !text-white shadow-lg shadow-fuchsia-950/30 hover:!from-fuchsia-500 hover:!to-violet-600 font-medium"
          >
            {pending ? <Spinner data-icon="inline-start" /> : <PenLine data-icon="inline-start" />}
            {pending ? "Saving..." : "Apply staff signature"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
