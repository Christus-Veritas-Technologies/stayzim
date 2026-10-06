"use client";

import { Button } from "@stayzim/ui/components/button";
import { ProgressRing } from "@stayzim/ui/components/progress";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { CircleAlert, Clock, ImagePlus, RotateCcw, X } from "lucide-react";
import { useRef, useState } from "react";

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

/** Dashed tile that opens the photo picker, and takes photos dropped on it from a computer. */
export function AddPhotosTile({
  onFiles,
  title = "Add photos",
  hint = "Pick several at once",
  note = "JPG or PNG",
  compact = false,
  disabled = false,
}: {
  onFiles: (files: FileList) => void;
  title?: string;
  hint?: string;
  note?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <motion.div layout className="flex flex-col gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
        }}
        className={cn(
          "group flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-brand transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50",
          over ? "border-brand bg-brand-wash" : "border-[#B9DCEA] bg-[#F7FBFD] hover:border-brand hover:bg-brand-wash",
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-white shadow-xs transition-transform group-hover:scale-110">
          <ImagePlus className="size-5" />
        </span>
        {compact ? null : <span className="text-[13.5px] font-semibold">{title}</span>}
      </button>
      {compact ? null : (
        <span className="flex flex-col">
          <span className="text-[13.5px] font-semibold">{hint}</span>
          <span className="text-xs text-muted">{note}</span>
        </span>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-label={title}
        onChange={(event) => {
          if (event.target.files?.length) onFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </motion.div>
  );
}
