"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { apiUpload } from "@/lib/api";
import { ImageReadError, photoForm, resizeImage, smallerCopies } from "@/lib/images";
import type { Lodge, Photo } from "@/lib/lodge";

export type UploadItem = {
  id: string;
  name: string;
  /** Local preview while it uploads */
  previewUrl: string;
  status: "waiting" | "uploading" | "failed";
  /** 0–1 */
  progress: number;
  /** Bytes after resizing */
  size?: number;
  error?: string;
  /** Trying again smaller, after the full-size upload failed on the connection */
  lighter?: boolean;
  file: File;
};

/** The second try on a weak connection: smaller and lighter (still sharp on a phone). */
const LIGHTER = { maxEdge: 1280, quality: 0.7 };

/**
 * Uploads photos one at a time (so each shows progress and a slow connection
 * isn't split many ways), resizing each on the phone first. A photo that fails
 * on the connection tries once more by itself, smaller; after that it stays in
 * the list with Retry.
 */
export function usePhotoUploads({
  roomId,
  limit,
  existing,
  onUploaded,
}: {
  /** Gallery when unset */
  roomId?: string;
  limit: number;
  existing: number;
  onUploaded?: (photo: Photo) => void;
}) {
  const { setLodge } = useLodge();
  const [items, setItems] = useState<UploadItem[]>([]);
  const busy = useRef(false);

  const update = (id: string, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const add = useCallback(
    (files: FileList | File[]) => {
      const photos = [...files].filter((file) => file.type.startsWith("image/"));
      if (photos.length === 0) {
        toast.error("Pick JPG or PNG photos.");
        return;
      }
      const room = Math.max(0, limit - existing - items.length);
      if (photos.length > room) {
        toast.warning(room === 0 ? `That's the most photos here (${limit}).` : `Only ${room} more fit, so we took the first ${room}.`);
      }
      const added = photos.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "waiting" as const,
        progress: 0,
        file,
      }));
      setItems((current) => [...current, ...added]);
    },
    [existing, items.length, limit],
  );

  const retry = (id: string) => update(id, { status: "waiting", progress: 0, error: undefined });

  const dismiss = (id: string) =>
    setItems((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });

  // Work through the queue, one photo at a time
  useEffect(() => {
    if (busy.current) return;
    const next = items.find((item) => item.status === "waiting");
    if (!next) return;
    busy.current = true;
    update(next.id, { status: "uploading", progress: 0 });

    void (async () => {
      try {
        const image = await resizeImage(next.file, next.lighter ? LIGHTER : undefined);
        const copies = await smallerCopies(image);
        update(next.id, { size: image.blob.size + (copies.medium?.blob.size ?? 0) + (copies.small?.blob.size ?? 0) });
        const result = await apiUpload<{ photo: Photo; lodge: Lodge }>(
          "/api/lodge/photos",
          photoForm(image, { roomId }, copies),
          (fraction) => update(next.id, { progress: fraction }),
        );
        if (result.error !== undefined) {
          // Dropped or timed out (slow line, or too big for it): once more, lighter
          const connection = result.status === 0 || result.status === 413 || result.status >= 500;
          if (connection && !next.lighter) update(next.id, { status: "waiting", progress: 0, lighter: true });
          else update(next.id, { status: "failed", error: result.error });
        } else {
          setLodge(result.data.lodge);
          onUploaded?.(result.data.photo);
          URL.revokeObjectURL(next.previewUrl);
          setItems((current) => current.filter((item) => item.id !== next.id));
        }
      } catch (error) {
        update(next.id, {
          status: "failed",
          error: error instanceof ImageReadError ? error.message : "Check your connection and tap Retry.",
        });
      } finally {
        busy.current = false;
        // Nudge the effect to pick up the next waiting photo
        setItems((current) => [...current]);
      }
    })();
  }, [items, onUploaded, roomId, setLodge]);

  return { items, add, retry, dismiss, uploading: items.some((item) => item.status !== "failed") };
}
