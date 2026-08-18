'use client';
// Adapted from beui.dev — components/motion/attachment-upload.tsx
// Source: https://beui.dev/r/attachment-upload.json
// Converted from TypeScript (.tsx) to JavaScript (.jsx)
// Tailwind CSS → .au-* classes (globals.css) + inline styles (project CSS vars)
// Audio kind removed — this component is image/file focused

import {
  AlertCircle,
  Check,
  FileImage,
  LoaderCircle,
  RotateCcw,
  Upload,
  X,
} from 'lucide-react';
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from 'motion/react';
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from '@/components/motion/Tooltip';
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from '@/lib/ease';

const ITEM_TRANSITION = { duration: 0.2, ease: EASE_OUT };
const DEFAULT_MAX_FILE_SIZE = 500 * 1024 * 1024;
const UPLOAD_PROGRESS_MS = 900;
const UPLOAD_COMPLETE_HOLD_MS = 1000;
const REMOVE_PENDING_MS = 420;

/* ── Utilities ─────────────────────────────────────────────────── */

function useControllableList({ value, defaultValue, onValueChange }) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? []);
  const controlled = value !== undefined;
  const items = value ?? internalValue;

  const setItems = useCallback(
    (next) => {
      if (!controlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange],
  );

  return [items, setItems];
}

function formatBytes(bytes) {
  if (bytes === undefined || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

function formatMaxSize(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
}

function inferKind(file) {
  if (file.type.startsWith('image/')) return 'image';
  return 'file';
}

function imageSource(item) {
  if (item.kind !== 'image') return undefined;
  return item.previewUrl ?? item.href;
}

/* ── RowAction — animated remove / retry / status ──────────────── */

function RowAction({ label, onClick, state, retryable = false, reduce = false }) {
  if (state === 'uploading') {
    return <span aria-hidden style={{ width: 36, height: 36, flexShrink: 0 }} />;
  }

  if (state === 'complete') {
    return (
      <Tooltip content="Upload selesai" side="top" delay={100}>
        <motion.span
          role="status"
          aria-label={`Upload selesai: ${label}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.75 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={ITEM_TRANSITION}
          className="au-action-btn au-action-btn--success"
        >
          <Check size={16} />
        </motion.span>
      </Tooltip>
    );
  }

  if (state === 'removing') {
    return (
      <Tooltip content="Menghapus..." side="top" delay={100}>
        <span
          role="status"
          aria-label={`Menghapus ${label}`}
          className="au-action-btn au-action-btn--muted"
        >
          <motion.span
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 0.7, ease: 'linear', repeat: Infinity }}
            style={{ display: 'grid', placeItems: 'center' }}
          >
            <LoaderCircle size={16} />
          </motion.span>
        </span>
      </Tooltip>
    );
  }

  if (state === 'failed') {
    if (!retryable) {
      return (
        <Tooltip content="Upload gagal" side="top" delay={100}>
          <span
            role="status"
            aria-label={`Upload gagal: ${label}`}
            className="au-action-btn au-action-btn--error"
          >
            <AlertCircle size={16} />
          </span>
        </Tooltip>
      );
    }
    return (
      <Tooltip content="Coba lagi" side="top" delay={100}>
        <motion.button
          type="button"
          aria-label={`Coba lagi ${label}`}
          onClick={onClick}
          whileTap={reduce ? undefined : { scale: 0.92 }}
          transition={SPRING_PRESS}
          className="au-action-btn au-action-btn--error"
        >
          <RotateCcw size={16} />
        </motion.button>
      </Tooltip>
    );
  }

  return (
    <Tooltip content="Hapus" side="top" delay={100}>
      <motion.button
        type="button"
        aria-label={`Hapus ${label}`}
        onClick={onClick}
        whileTap={reduce ? undefined : { scale: 0.92 }}
        transition={SPRING_PRESS}
        className="au-action-btn"
      >
        <X size={16} />
      </motion.button>
    </Tooltip>
  );
}

/* ── ImageThumbnail — motion layout thumbnail ───────────────────── */

function ImageThumbnail({ item, layoutId, onPreview, reduce }) {
  const src = imageSource(item);

  if (!src) {
    return (
      <span
        aria-hidden
        style={{
          display: 'grid', width: 32, height: 32, flexShrink: 0,
          placeItems: 'center', backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-muted)',
        }}
      >
        <FileImage size={16} />
      </span>
    );
  }

  return (
    <Tooltip
      side="top"
      delay={160}
      wrapperClassName="au-thumb-wrapper"
      content={
        <span style={{ display: 'block', width: 120, padding: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{ height: 76, width: '100%', objectFit: 'cover', display: 'block' }}
          />
          <span style={{ display: 'block', padding: '3px 4px 5px', textAlign: 'center', fontSize: 10, color: 'var(--text-muted)' }}>
            Klik untuk preview
          </span>
        </span>
      }
    >
      <motion.button
        type="button"
        aria-label={`Preview ${item.name}`}
        onClick={(e) => { e.currentTarget.blur(); onPreview(item); }}
        whileTap={reduce ? undefined : { scale: 0.94 }}
        transition={SPRING_PRESS}
        className="au-img-btn"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <motion.img
          layoutId={layoutId}
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          transition={{ layout: SPRING_LAYOUT }}
        />
      </motion.button>
    </Tooltip>
  );
}

/* ── ImagePreviewDialog — fullscreen portal preview ─────────────── */

function ImagePreviewDialog({ item, layoutId, onClose, reduce }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!item) return;
    const prevFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [item, onClose]);

  if (typeof document === 'undefined') return null;

  const src = item ? imageSource(item) : undefined;
  const content = item && src ? (
    <div style={{ pointerEvents: 'none', position: 'fixed', inset: 0, zIndex: 10000 }}>
      <motion.button
        type="button"
        aria-label="Tutup preview"
        tabIndex={-1}
        style={{
          pointerEvents: 'auto', position: 'absolute', inset: 0,
          width: '100%', height: '100%', cursor: 'default',
          backgroundColor: 'rgba(0,0,0,0.52)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: 'none',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={{ duration: reduce ? 0.1 : 0.2, ease: EASE_OUT }}
        onClick={onClose}
      />
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 32,
      }}>
        <motion.div
          role="dialog"
          aria-modal
          aria-label={`Preview: ${item.name}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={ITEM_TRANSITION}
          style={{ pointerEvents: 'auto', position: 'relative' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img
            layoutId={reduce ? undefined : layoutId}
            src={src}
            alt={item.name}
            style={{
              maxHeight: '90vh', maxWidth: '90vw',
              objectFit: 'contain', display: 'block',
              boxShadow: '0 24px 48px rgba(0,0,0,0.45)',
            }}
            transition={{ layout: SPRING_LAYOUT }}
          />
          <motion.button
            ref={closeRef}
            type="button"
            aria-label="Tutup preview"
            onClick={onClose}
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            whileTap={reduce ? undefined : { scale: 0.92 }}
            transition={SPRING_PRESS}
            style={{
              position: 'absolute', top: -12, right: -12,
              width: 36, height: 36, display: 'grid', placeItems: 'center',
              backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '50%', color: 'var(--text-primary)', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.18)', padding: 0,
            }}
          >
            <X size={16} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  ) : null;

  return createPortal(
    reduce ? content : <AnimatePresence>{content}</AnimatePresence>,
    document.body,
  );
}

/* ── AttachmentRow ──────────────────────────────────────────────── */

function AttachmentRow({
  item,
  uploading,
  uploadComplete,
  failed,
  removing,
  arrivalIndex,
  imageLayoutId,
  onImagePreview,
  onRemove,
  onRetry,
  reduce,
}) {
  const size = formatBytes(item.size);
  const actionState = removing
    ? 'removing'
    : uploading
      ? 'uploading'
      : uploadComplete
        ? 'complete'
        : failed
          ? 'failed'
          : 'idle';

  const arrivalDelay = Math.min(Math.max(arrivalIndex, 0), 5) * 0.055;
  const rowTransition =
    !reduce && arrivalIndex >= 0
      ? {
          ...SPRING_LAYOUT,
          delay: arrivalDelay,
          opacity: { duration: 0.16, ease: EASE_OUT, delay: arrivalDelay },
        }
      : ITEM_TRANSITION;

  const showUploadProgress = uploading || uploadComplete;
  const uploadProgress = (
    <motion.span
      role="progressbar"
      aria-label={`Mengupload ${item.name}`}
      className="au-progress"
      initial={{ opacity: 1, scaleX: 0 }}
      animate={{ opacity: 1, scaleX: 1 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: reduce ? 0.1 : UPLOAD_PROGRESS_MS / 1000, ease: EASE_OUT }}
    />
  );

  return (
    <motion.li
      layout={!reduce}
      initial={
        reduce
          ? { opacity: 0 }
          : arrivalIndex >= 0
            ? { opacity: 0, y: -16, scale: 0.985 }
            : { opacity: 0, y: 6 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? undefined : { opacity: 0, y: -4 }}
      transition={rowTransition}
      className="au-row"
    >
      <div className="au-row-inner">
        {failed ? (
          <span aria-hidden className="au-row-failed-bg" />
        ) : null}

        {item.kind === 'image' ? (
          <ImageThumbnail
            item={item}
            layoutId={imageLayoutId}
            onPreview={onImagePreview}
            reduce={reduce}
          />
        ) : (
          <span
            aria-hidden
            style={{
              display: 'grid', width: 28, height: 28, flexShrink: 0,
              placeItems: 'center', color: 'var(--text-muted)',
            }}
          >
            <FileImage size={16} />
          </span>
        )}

        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="au-row-name">{item.name}</span>
          {failed ? (
            <span className="au-row-error">{item.error ?? 'Upload gagal'}</span>
          ) : null}
        </span>
        <span className="au-row-size">{size}</span>

        {reduce
          ? showUploadProgress ? uploadProgress : null
          : <AnimatePresence>{showUploadProgress ? uploadProgress : null}</AnimatePresence>}
      </div>

      <RowAction
        label={item.name}
        onClick={() => {
          if (actionState === 'failed') { onRetry?.(item); return; }
          onRemove(item);
        }}
        state={actionState}
        retryable={onRetry !== undefined}
        reduce={reduce}
      />
    </motion.li>
  );
}

/* ── AttachmentUpload — main export ─────────────────────────────── */

/**
 * AttachmentUpload
 *
 * Drag-and-drop / click-to-browse file uploader with animated upload progress,
 * image thumbnails, shared-layout image preview, and staggered list animations.
 * Adapted from beui.dev for Ephemeris Admin (image-upload focused).
 *
 * @param {object}    props
 * @param {Array}     [props.value]             - Controlled items array.
 * @param {Array}     [props.defaultValue]       - Default items (uncontrolled).
 * @param {Function}  [props.onValueChange]      - Called with updated items.
 * @param {Function}  [props.onFilesAdded]       - Called when files are accepted.
 * @param {Function}  [props.onFilesRejected]    - Called with rejected files + reason.
 * @param {Function}  [props.onRemove]           - Called when an item is removed.
 * @param {Function}  [props.onRetry]            - Called to retry a failed upload.
 * @param {string}    [props.accept]             - File accept MIME string.
 * @param {boolean}   [props.multiple]           - Allow multiple files (default true).
 * @param {number}    [props.maxFiles]           - Max file count (default 12).
 * @param {number}    [props.maxFileSize]        - Max file size in bytes.
 * @param {boolean}   [props.disabled]           - Disable the uploader.
 * @param {string}    [props.title]              - Dropzone title.
 * @param {string}    [props.description]        - Dropzone description.
 * @param {string}    [props.attachmentsLabel]   - Section heading for file list.
 * @param {string}    [props.className]          - Extra class on root div.
 */
export function AttachmentUpload({
  value,
  defaultValue,
  onValueChange,
  onFilesAdded,
  onFilesRejected,
  onRemove,
  onRetry,
  accept,
  multiple = true,
  maxFiles = 12,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  disabled = false,
  title = 'Drag dan drop atau pilih file',
  description,
  attachmentsLabel = 'Lampiran',
  className,
}) {
  const inputId = useId();
  const inputRef = useRef(null);
  const dragDepthRef = useRef(0);
  const ownedUrlsRef = useRef(new Set());
  const lifecycleTimersRef = useRef(new Set());
  const reduce = useReducedMotion() ?? false;
  const [dragging, setDragging] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [uploadingIds, setUploadingIds] = useState(() => new Set());
  const [uploadCompleteIds, setUploadCompleteIds] = useState(() => new Set());
  const [removingIds, setRemovingIds] = useState(() => new Set());
  const [items, setItems] = useControllableList({ value, defaultValue, onValueChange });
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Cleanup blob URLs and timers on unmount
  useEffect(() => () => {
    for (const url of ownedUrlsRef.current) URL.revokeObjectURL(url);
    ownedUrlsRef.current.clear();
    for (const timer of lifecycleTimersRef.current) clearTimeout(timer);
    lifecycleTimersRef.current.clear();
  }, []);

  const maxReached = items.length >= maxFiles;

  const scheduleLifecycle = useCallback((callback, delay) => {
    const timer = setTimeout(() => {
      lifecycleTimersRef.current.delete(timer);
      callback();
    }, delay);
    lifecycleTimersRef.current.add(timer);
  }, []);

  const addFiles = useCallback((incomingFiles) => {
    if (disabled || incomingFiles.length === 0) return;

    const availableSlots = Math.max(0, maxFiles - items.length);
    if (availableSlots === 0) { onFilesRejected?.(incomingFiles, 'max-files'); return; }

    const selectedFiles = incomingFiles.slice(0, multiple ? availableSlots : Math.min(1, availableSlots));
    const oversized = selectedFiles.filter((f) => f.size > maxFileSize);
    const accepted = selectedFiles.filter((f) => f.size <= maxFileSize);

    if (oversized.length > 0) onFilesRejected?.(oversized, 'too-large');
    if (incomingFiles.length > selectedFiles.length) {
      onFilesRejected?.(incomingFiles.slice(selectedFiles.length), 'max-files');
    }

    const added = accepted.map((file, index) => {
      const kind = inferKind(file);
      const objectUrl = URL.createObjectURL(file);
      ownedUrlsRef.current.add(objectUrl);
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name, kind, size: file.size,
        previewUrl: kind === 'image' ? objectUrl : undefined,
        href: objectUrl, file,
      };
    });

    if (added.length === 0) return;
    setItems([...items, ...added]);
    const addedIds = added.map((i) => i.id);
    setUploadingIds((cur) => new Set([...cur, ...addedIds]));
    scheduleLifecycle(() => {
      setUploadingIds((cur) => { const next = new Set(cur); for (const id of addedIds) next.delete(id); return next; });
      setUploadCompleteIds((cur) => new Set([...cur, ...addedIds]));
      scheduleLifecycle(() => {
        setUploadCompleteIds((cur) => { const next = new Set(cur); for (const id of addedIds) next.delete(id); return next; });
      }, UPLOAD_COMPLETE_HOLD_MS);
    }, reduce ? 140 : UPLOAD_PROGRESS_MS);
    onFilesAdded?.(added, accepted);
  }, [disabled, items, maxFileSize, maxFiles, multiple, onFilesAdded, onFilesRejected, reduce, scheduleLifecycle, setItems]);

  const finalizeRemove = useCallback((item) => {
    const ownedUrl = [item.previewUrl, item.href].find(
      (url) => url !== undefined && ownedUrlsRef.current.has(url),
    );
    if (ownedUrl) { URL.revokeObjectURL(ownedUrl); ownedUrlsRef.current.delete(ownedUrl); }
    setPreviewItem((cur) => cur?.id === item.id ? null : cur);
    setUploadingIds((cur) => { const next = new Set(cur); next.delete(item.id); return next; });
    setUploadCompleteIds((cur) => { const next = new Set(cur); next.delete(item.id); return next; });
    setItems(itemsRef.current.filter((e) => e.id !== item.id));
    onRemove?.(item);
  }, [onRemove, setItems]);

  const requestRemove = useCallback((item) => {
    if (removingIds.has(item.id)) return;
    setRemovingIds((cur) => new Set(cur).add(item.id));
    scheduleLifecycle(() => {
      finalizeRemove(item);
      setRemovingIds((cur) => { const next = new Set(cur); next.delete(item.id); return next; });
    }, reduce ? 140 : REMOVE_PENDING_MS);
  }, [finalizeRemove, reduce, removingIds, scheduleLifecycle]);

  const resetDrag = useCallback(() => { dragDepthRef.current = 0; setDragging(false); }, []);
  const closePreview = useCallback(() => setPreviewItem(null), []);

  useEffect(() => {
    if (previewItem && !items.some((i) => i.id === previewItem.id)) setPreviewItem(null);
  }, [items, previewItem]);

  const uploadOrder = Array.from(uploadingIds);
  const previewLayoutId = previewItem ? `attachment-image-${previewItem.id}` : undefined;

  return (
    <LayoutGroup id={inputId}>
      <div className={`au-root${className ? ' ' + className : ''}`}>
        {/* Hidden native file input */}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          aria-label="Upload file"
          accept={accept}
          multiple={multiple}
          disabled={disabled || maxReached}
          tabIndex={-1}
          style={{
            position: 'absolute', width: 1, height: 1, padding: 0,
            margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)',
            whiteSpace: 'nowrap', borderWidth: 0,
          }}
          onChange={(e) => {
            addFiles(Array.from(e.currentTarget.files ?? []));
            e.currentTarget.value = '';
          }}
        />

        {/* Dropzone */}
        <motion.button
          type="button"
          disabled={disabled || maxReached}
          data-dragging={dragging}
          animate={reduce ? undefined : { scale: dragging ? 1.006 : 1 }}
          whileTap={reduce ? undefined : { scale: 0.995 }}
          transition={SPRING_PRESS}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(e) => {
            if (disabled || maxReached) return;
            e.preventDefault(); dragDepthRef.current += 1; setDragging(true);
          }}
          onDragOver={(e) => {
            if (disabled || maxReached) return;
            e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragging(true);
          }}
          onDragLeave={(e) => {
            if (disabled || maxReached) return;
            e.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setDragging(false);
          }}
          onDrop={(e) => {
            if (disabled || maxReached) return;
            e.preventDefault(); resetDrag();
            addFiles(Array.from(e.dataTransfer.files));
          }}
          className="au-dropzone"
        >
          <span className="au-dropzone-inner" aria-hidden />
          <motion.span
            aria-hidden
            animate={reduce ? undefined : { y: dragging ? -4 : 0, scale: dragging ? 1.08 : 1 }}
            transition={ITEM_TRANSITION}
            className="au-upload-icon"
          >
            <Upload size={18} />
          </motion.span>
          <span className="au-dropzone-title">
            {maxReached ? 'Batas file tercapai' : title}
          </span>
          <span className="au-dropzone-desc">
            {maxReached
              ? `${items.length} dari ${maxFiles} file ditambahkan`
              : description ?? `Maks ${formatMaxSize(maxFileSize)}`}
          </span>
        </motion.button>

        {/* Attachment list */}
        {items.length > 0 ? (
          <section className="au-section" aria-labelledby={`${inputId}-attachments`}>
            <h3 id={`${inputId}-attachments`} className="au-section-title">
              {attachmentsLabel}
            </h3>
            <ul className="au-list">
              <AnimatePresence initial={uploadOrder.length > 0}>
                {items.map((item) => (
                  <AttachmentRow
                    key={item.id}
                    item={item}
                    uploading={uploadingIds.has(item.id) || item.status === 'uploading'}
                    uploadComplete={uploadCompleteIds.has(item.id) || item.status === 'complete'}
                    failed={item.status === 'failed'}
                    removing={removingIds.has(item.id)}
                    arrivalIndex={uploadOrder.indexOf(item.id)}
                    imageLayoutId={reduce ? undefined : `attachment-image-${item.id}`}
                    onImagePreview={setPreviewItem}
                    onRemove={requestRemove}
                    onRetry={onRetry}
                    reduce={reduce}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </section>
        ) : null}

        {/* Full-screen image preview portal */}
        <ImagePreviewDialog
          item={previewItem}
          layoutId={reduce ? undefined : previewLayoutId}
          onClose={closePreview}
          reduce={reduce}
        />
      </div>
    </LayoutGroup>
  );
}
