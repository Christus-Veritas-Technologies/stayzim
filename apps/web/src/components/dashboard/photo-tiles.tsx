"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { ProgressRing } from "@stayzim/ui/components/progress";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { CircleAlert, CircleCheck, Clock, ImagePlus, RotateCcw, Sparkles, Upload, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import type { UploadItem } from "@/components/dashboard/use-photo-uploads";
import { formatBytes } from "@/lib/format";

/** A photo on its way up: uploading with a ring, waiting its turn, or failed with Retry. */
export function UploadTile({
  item,
  onRetry,
  onDismiss,
  compact = false,
}: {
  item: UploadItem;
  onRetry: () => void;
  onDismiss: () => void;
  compact?: boolean;
}) {
  const failed = item.status === "failed";
  const percent = Math.round(item.progress * 100);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92 }}
      className="flex flex-col gap-2"
    >
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border",
          failed ? "border-danger-line bg-danger-tint" : "border-line bg-surface-2",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the chosen file */}
        <img src={item.previewUrl} alt="" className={cn("absolute inset-0 size-full object-cover", failed ? "opacity-10" : "opacity-35 blur-[2px]")} />
        <div className="relative flex flex-col items-center gap-1.5 px-2 text-center">
          {item.status === "uploading" ? (
            <>
              <ProgressRing value={percent} size={compact ? 36 : 48} label={`Uploading ${item.name}`} className="rounded-full bg-white/80">
                {compact ? null : `${percent}%`}
              </ProgressRing>
              {compact ? null : <span className="text-[13px] font-semibold text-brand-dark">Uploading</span>}
            </>
          ) : item.status === "waiting" ? (
            <>
              <Clock className="size-5 text-muted-2" />
              {compact ? null : <span className="text-[13px] font-semibold text-muted">Waiting</span>}
            </>
          ) : (
            <>
              <CircleAlert className="size-5 text-danger" />
              {compact ? null : (
                <>
                  <span className="text-[13px] font-semibold text-danger">Photo did not upload</span>
                  <span className="text-xs text-muted">{item.error}</span>
                </>
              )}
            </>
          )}
        </div>
        {failed ? (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Remove ${item.name}`}
            className="absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-lg bg-white/90 text-muted-2 shadow-xs hover:text-ink"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      {compact ? (
        failed ? (
          <Button variant="outline" size="xs" onClick={onRetry} className="w-full">
            <RotateCcw />
            Retry
          </Button>
        ) : null
      ) : (
        <div className="flex items-start justify-between gap-2">
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] font-semibold">{item.name}</span>
            <span className={cn("text-xs", failed ? "text-danger" : "text-muted")}>
              {failed ? "Failed" : item.status === "waiting" ? "Next in line" : item.size ? `${formatBytes(item.size)} after resizing` : "Resizing"}
            </span>
          </span>
          {failed ? (
            <Button variant="outline" size="xs" onClick={onRetry}>
              <RotateCcw />
              Retry
            </Button>
          ) : null}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Where photos go in, everywhere in the app: a dashed area to drop photos on
 * from a computer, with Upload photos in it (the whole area opens the picker
 * on a phone). `lg` stands on its own above a grid; `sm` is a row, for sheets
 * and the logo. `full` says why no more can go in.
 */
export function PhotoDropzone({
  onFiles,
  size = "lg",
  multiple = true,
  title = multiple ? "Drag photos here" : "Drag your photo here",
  touchTitle = multiple ? "Add photos from your phone" : "Add a photo from your phone",
  note = "JPG, PNG or WebP. Resized on your device first, so they go up on slow data.",
  action = multiple ? "Upload photos" : "Upload photo",
  tip,
  media,
  full,
  disabled = false,
  busy = false,
  children,
}: {
  onFiles: (files: FileList) => void;
  size?: "lg" | "sm";
  multiple?: boolean;
  title?: string;
  /** The title on touch screens, where nothing is dragged */
  touchTitle?: string;
  note?: ReactNode;
  action?: string;
  /** A small green line to nudge people on: "The outside, a room and the view work best" */
  tip?: ReactNode;
  /** In place of the icon, e.g. the logo as it is now */
  media?: ReactNode;
  /** No room left: { limit, what } */
  full?: { limit: number; what: string };
  disabled?: boolean;
  busy?: boolean;
  /** Extra buttons beside Upload, e.g. Remove */
  children?: ReactNode;
}) {
  const id = useId();
  const [over, setOver] = useState(false);
  const large = size === "lg";

  if (full) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={cn(
          "flex items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-line-2 bg-surface",
          large ? "flex-col px-5 py-7 text-center" : "px-3.5 py-3",
        )}
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-success shadow-xs">
          <CircleCheck className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[14px] font-semibold text-ink-2">
            {full.what} is full · <span className="tabular-nums">{full.limit} of {full.limit}</span>
          </span>
          <span className="text-[12.5px] text-muted">Delete a photo to add another.</span>
        </span>
      </motion.div>
    );
  }

  return (
    <motion.label
      layout
      htmlFor={id}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        if (!disabled && event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
      }}
      aria-disabled={disabled || undefined}
      className={cn(
        "group/drop relative flex cursor-pointer gap-3 rounded-[18px] border-[1.5px] border-dashed transition-colors duration-200 has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/30 aria-disabled:pointer-events-none aria-disabled:opacity-55",
        large ? "flex-col items-center px-5 py-8 text-center sm:py-10" : "flex-wrap items-center px-3.5 py-3 sm:flex-nowrap",
        over ? "border-brand bg-brand-wash" : "border-[#B9DCEA] bg-[#F7FBFD] hover:border-brand hover:bg-brand-wash/70",
      )}
    >
      {media ?? (
        <motion.span
          animate={{ y: over ? -3 : 0, scale: over ? 1.08 : 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 24 }}
          className={cn("flex shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-xs", large ? "size-14" : "size-10 rounded-xl")}
        >
          <ImagePlus className={large ? "size-6" : "size-5"} />
        </motion.span>
      )}
      <span className={cn("flex min-w-0 flex-col", large ? "items-center gap-1" : "flex-1 gap-0.5")}>
        <span className={cn("font-semibold text-ink", large ? "text-[16px]" : "text-[14px]")}>
          <span className="pointer-coarse:hidden">{over ? "Drop to upload" : title}</span>
          <span className="hidden pointer-coarse:inline">{touchTitle}</span>
        </span>
        {note ? <span className={cn("text-muted", large ? "max-w-[340px] text-[13px] leading-[19px]" : "text-[12.5px] leading-[17px]")}>{note}</span> : null}
      </span>
      <span className={cn("flex shrink-0 items-center gap-2", large ? "mt-2 flex-col" : "max-sm:w-full")}>
        <span className={buttonVariants({ size: large ? "lg" : "sm", className: cn("pointer-events-none", !large && "max-sm:flex-1") })} data-loading={busy || undefined}>
          {busy ? <Spinner /> : <Upload />}
          {action}
        </span>
        {tip && large ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success-wash px-2.5 py-1 text-[12px] font-semibold text-success">
            <Sparkles className="size-3.5" />
            {tip}
          </span>
        ) : null}
        {children}
      </span>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        disabled={disabled || busy}
        className="sr-only"
        aria-label={action}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </motion.label>
  );
}
