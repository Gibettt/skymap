"use client";

import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";

import { RefreshCw, Trash2, Upload } from "lucide-react";

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export type PackageImageValue = File | null | undefined;

interface PackageImageFieldProps {
  currentImageUrl?: string | null;
  onChange: (value: PackageImageValue) => void;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Format gambar harus JPG, PNG, atau WEBP.";
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return "Ekstensi gambar harus .jpg, .jpeg, .png, atau .webp.";
  if (file.size > MAX_IMAGE_SIZE) return "Gambar maksimal 2MB.";
  return null;
}

export function PackageImageField({ currentImageUrl, onChange }: PackageImageFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputKey, setInputKey] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cleared, setCleared] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const message = validateImageFile(file);
    if (message) {
      setError(message);
      event.target.value = "";
      return;
    }

    setError(null);
    setCleared(false);
    setSelectedFile(file);
    onChange(file);
  }

  function removeImage() {
    setInputKey((key) => key + 1);
    setError(null);
    setSelectedFile(null);
    setCleared(true);
    onChange(null);
  }

  let visibleUrl: string | null = null;
  if (selectedFile && previewUrl) visibleUrl = previewUrl;
  else if (!cleared) visibleUrl = currentImageUrl ?? null;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>Image</FieldLabel>
      <input
        ref={inputRef}
        key={inputKey}
        id={inputId}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="sr-only"
        onChange={handleFileChange}
      />

      {visibleUrl ? (
        <Attachment className="w-fit">
          <AttachmentMedia variant="image">
            {/* biome-ignore lint/performance/noImgElement: preview may be a local blob URL */}
            <img src={visibleUrl} alt="Package preview" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{selectedFile ? selectedFile.name : "Current image"}</AttachmentTitle>
            <AttachmentDescription>
              {selectedFile ? formatFileSize(selectedFile.size) : "Saved to this package"}
            </AttachmentDescription>
          </AttachmentContent>
          <AttachmentActions>
            <AttachmentAction type="button" aria-label="Change image" onClick={openPicker}>
              <RefreshCw />
            </AttachmentAction>
            <AttachmentAction type="button" variant="destructive" aria-label="Remove image" onClick={removeImage}>
              <Trash2 />
            </AttachmentAction>
          </AttachmentActions>
        </Attachment>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={openPicker}>
          <Upload data-icon="inline-start" />
          Upload image
        </Button>
      )}

      <FieldDescription>JPG, PNG, or WEBP up to 2MB.</FieldDescription>
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  );
}
