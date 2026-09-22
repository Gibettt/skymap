"use client";

import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";

import { ImageIcon, RefreshCw, Trash2, Upload } from "lucide-react";

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

export type ResortProfileImageValue = File | null | undefined;

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return "Image must be JPG, PNG, or WEBP.";
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) return "File extension must be .jpg, .jpeg, .png, or .webp.";
  if (file.size > MAX_IMAGE_SIZE) return "Image must not exceed 2MB.";
  return null;
}

export function ResortProfileImageField({
  currentImageUrl,
  currentFileName,
  value,
  disabled,
  onChange,
}: {
  currentImageUrl?: string | null;
  currentFileName?: string | null;
  value: ResortProfileImageValue;
  disabled?: boolean;
  onChange: (value: ResortProfileImageValue) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputKey, setInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!(value instanceof File)) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

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
    onChange(file);
  }

  function removeImage() {
    setInputKey((key) => key + 1);
    setError(null);
    onChange(null);
  }

  const visibleUrl = value instanceof File ? previewUrl : value === null ? null : currentImageUrl ?? null;

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={inputId}>Cover image</FieldLabel>
      <input
        ref={inputRef}
        key={inputKey}
        id={inputId}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={disabled}
        onChange={handleFileChange}
      />
      {visibleUrl ? (
        <Attachment className="w-full max-w-xl">
          <AttachmentMedia variant="image">
            {/* biome-ignore lint/performance/noImgElement: preview can use a local blob URL */}
            <img src={visibleUrl} alt="Public resort cover preview" />
          </AttachmentMedia>
          <AttachmentContent>
            <AttachmentTitle>{value instanceof File ? value.name : currentFileName || "Current cover image"}</AttachmentTitle>
            <AttachmentDescription>
              {value instanceof File ? formatFileSize(value.size) : "Displayed on the landing page and resort page"}
            </AttachmentDescription>
          </AttachmentContent>
          {!disabled ? (
            <AttachmentActions>
              <AttachmentAction type="button" aria-label="Change cover image" onClick={() => inputRef.current?.click()}>
                <RefreshCw />
              </AttachmentAction>
              <AttachmentAction type="button" variant="destructive" aria-label="Remove cover image" onClick={removeImage}>
                <Trash2 />
              </AttachmentAction>
            </AttachmentActions>
          ) : null}
        </Attachment>
      ) : (
        <Button type="button" variant="outline" size="sm" className="w-full max-w-xl" disabled={disabled} onClick={() => inputRef.current?.click()}>
          {disabled ? <ImageIcon /> : <Upload />} Upload cover image
        </Button>
      )}
      <FieldDescription>JPG, PNG, or WEBP up to 2MB. A 16:10 landscape image works best.</FieldDescription>
      <FieldError errors={error ? [{ message: error }] : undefined} />
    </Field>
  );
}
