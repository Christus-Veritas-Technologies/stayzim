"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button } from "@stayzim/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@stayzim/ui/components/collapsible";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { InfoTip } from "@stayzim/ui/components/info-tip";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { NumberField } from "@stayzim/ui/components/number-field";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Switch } from "@stayzim/ui/components/switch";
import { Textarea } from "@stayzim/ui/components/textarea";
import { Toggle, ToggleGroup } from "@stayzim/ui/components/toggle";
import { cn } from "@stayzim/ui/lib/utils";
import { ROOM_LIMITS } from "@stayzim/sites";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronDown, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { PhotoDropzone, UploadTile } from "@/components/dashboard/photo-tiles";
import { DiscardChangesDialog } from "@/components/dashboard/unsaved-changes";
import { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { WhyDisabled } from "@/components/why-disabled";
import { AMENITIES, AMENITIES_ON_CARD, AMENITY_KEYS, ROOM_PHOTO_LIMIT, type AmenityKey, type Lodge, type Room } from "@/lib/lodge";
import { OFFLINE_REASON, useOnline } from "@/lib/online";

type RoomDraft = {
  name: string;
  price: string;
  sleeps: number;
  units: number;
  visible: boolean;
  amenities: AmenityKey[];
  description: string;
  beds: string;
  size: string;
};

const EMPTY: RoomDraft = { name: "", price: "", sleeps: 2, units: 1, visible: true, amenities: [], description: "", beds: "", size: "" };

function draftFrom(room: Room | null): RoomDraft {
  return room
    ? {
        name: room.name,
        price: String(room.price),
        sleeps: room.sleeps,
        units: room.units,
        visible: room.visible,
        amenities: room.amenities,
        description: room.description ?? "",
        beds: room.beds ?? "",
        size: room.size === null ? "" : String(room.size),
      }
    : EMPTY;
}

function sameDraft(a: RoomDraft, b: RoomDraft) {
  return (
    a.name === b.name &&
    a.price === b.price &&
    a.sleeps === b.sleeps &&
    a.units === b.units &&
    a.visible === b.visible &&
    a.amenities.join() === b.amenities.join() &&
    a.description === b.description &&
    a.beds === b.beds &&
    a.size === b.size
  );
}

/**
 * Add room / Edit room. A new room is created first, then its photos upload
 * in the same sheet, so the owner sees each one go up. Give it a new `key`
 * each time it opens, so the form starts fresh.
 */
export function RoomSheet({
  open,
  onOpenChange,
  room: editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null: add a new room */
  room: Room | null;
}) {
  const { lodge, saveWith, save } = useLodge();
  const [roomId, setRoomId] = useState<string | null>(editing?.id ?? null);
  const [draft, setDraft] = useState<RoomDraft>(() => draftFrom(editing));
  const [pending, setPending] = useState<File[]>([]);
  const [errors, setErrors] = useState<{ name?: string; price?: string; size?: string }>({});
  const [detailsOpen, setDetailsOpen] = useState(() => Boolean(editing && (editing.description || editing.beds || editing.size)));
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const online = useOnline();
  /** Photos being deleted */
  const [removing, setRemoving] = useState<string[]>([]);

  const room = roomId ? (lodge.rooms.find((entry) => entry.id === roomId) ?? null) : null;
  const photos = room?.photos ?? [];
  const uploads = usePhotoUploads({ roomId: roomId ?? undefined, limit: ROOM_PHOTO_LIMIT, existing: photos.length });

  const isNew = editing === null;
  const created = isNew && roomId !== null;
  const slotsLeft = ROOM_PHOTO_LIMIT - photos.length - uploads.items.length - pending.length;

  function addFiles(files: FileList) {
    if (roomId) {
      uploads.add(files);
      return;
    }
    // Not created yet: hold them, they upload once the room exists
    const picked = [...files].filter((file) => file.type.startsWith("image/")).slice(0, Math.max(0, slotsLeft));
    setPending((current) => [...current, ...picked]);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (created) {
      onOpenChange(false);
      return;
    }
    const price = Number(draft.price);
    const size = draft.size ? Number(draft.size) : null;
    const nextErrors = {
      name: draft.name.trim() ? undefined : "Add the room name",
      price:
        Number.isInteger(price) && price > 0 && price <= ROOM_LIMITS.priceMax ? undefined : "Add the price per night, in whole dollars",
      size: size === null || (size >= ROOM_LIMITS.sizeMin && size <= ROOM_LIMITS.sizeMax) ? undefined : "Check the size in square metres",
    };
    setErrors(nextErrors);
    if (nextErrors.size) setDetailsOpen(true);
    if (nextErrors.name || nextErrors.price || nextErrors.size) return;

    const body = {
      name: draft.name.trim(),
      price,
      sleeps: draft.sleeps,
      units: draft.units,
      visible: draft.visible,
      amenities: draft.amenities,
      description: draft.description.trim() || null,
      beds: draft.beds.trim() || null,
      size,
    };
    setSaving(true);
    setFormError(null);

    if (isNew) {
      const result = await saveWith<{ roomId: string; lodge: Lodge }>("/rooms", "POST", body);
      setSaving(false);
      if (result.error !== undefined) {
        setFormError(result.error);
        return;
      }
      setRoomId(result.data.roomId);
      toast.success("Room added", { description: body.visible ? `${body.name} is on your site.` : `${body.name} is hidden until you show it.` });
      if (pending.length > 0) {
        uploads.add(pending);
        setPending([]);
      } else {
        onOpenChange(false);
      }
      return;
    }

    const error = await save(`/rooms/${editing.id}`, "PATCH", body);
    setSaving(false);
    if (error) {
      setFormError(error);
      return;
    }
    toast.success("Room saved");
    onOpenChange(false);
  }

  const [reordering, setReordering] = useState(false);

  /** Photos save their new order straight away; the first is the cover. */
  async function movePhoto(photoId: string, by: number) {
    if (!roomId) return;
    const ids = photos.map((photo) => photo.id);
    const from = ids.indexOf(photoId);
    const to = from + by;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]!);
    setReordering(true);
    const error = await save("/photos/order", "PUT", { roomId, ids });
    setReordering(false);
    if (error) toast.error(error);
    else if (to === 0) toast.success("Cover photo changed");
  }

  async function removePhoto(photoId: string) {
    setRemoving((current) => [...current, photoId]);
    const error = await save(`/photos/${photoId}`, "DELETE");
    setRemoving((current) => current.filter((id) => id !== photoId));
    if (error) toast.error(error);
  }

  const busyUploading = uploads.items.some((item) => item.status !== "failed");

  // Typed but not saved yet: closing asks first
  const saved = draftFrom(editing);
  const edited = !created && !saving && (!sameDraft(draft, saved) || pending.length > 0);
  const [confirmClose, setConfirmClose] = useState(false);

  function requestClose() {
    if (edited) setConfirmClose(true);
    else onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <SheetContent>
        <form onSubmit={onSubmit} className="flex h-full flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{isNew ? "Add room" : `Edit ${editing.name}`}</SheetTitle>
            <SheetDescription>{created ? "Photos are uploading. You can close this when they're done." : "Name and price are required."}</SheetDescription>
          </SheetHeader>

          <SheetBody className="flex flex-col gap-5">
            <FormMessage>{formError}</FormMessage>

            {/* Locked while saving (so a second tap can't add the room twice) and once it exists */}
            <fieldset disabled={created || saving} className="flex flex-col gap-5 disabled:opacity-60">
              <Field label="Room name" error={errors.name}>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Hillside Rondavel"
                  maxLength={60}
                  autoFocus={isNew}
                />
              </Field>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] gap-3">
                <Field label="Price per night" error={errors.price} hint={errors.price ? undefined : "USD, whole dollars"}>
                  <InputGroup>
                    <InputGroupAddon>$</InputGroupAddon>
                    <InputGroupInput
                      value={draft.price}
                      onChange={(event) => setDraft({ ...draft, price: event.target.value.replace(/[^\d]/g, "") })}
                      inputMode="numeric"
                      placeholder="95"
                    />
                    <InputGroupAddon align="end">/ night</InputGroupAddon>
                  </InputGroup>
                </Field>
                <Field label="Sleeps" help="The most guests this room takes, children included. Guests filter rooms by it.">
                  <NumberField
                    value={draft.sleeps}
                    min={1}
                    max={ROOM_LIMITS.sleepsMax}
                    onValueChange={(value) => setDraft({ ...draft, sleeps: value ?? 1 })}
                  />
                </Field>
              </div>

              <Field
                label="How many of this room do you have?"
                hint="Guests see it once. We use the number for bookings."
                help="Three identical cottages? Add the room once and set 3. Your site shows one card, and the calendar can book all three on the same night."
              >
                <NumberField
                  value={draft.units}
                  min={1}
                  max={ROOM_LIMITS.unitsMax}
                  onValueChange={(value) => setDraft({ ...draft, units: value ?? 1 })}
                  className="max-w-40"
                />
              </Field>

              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="rounded-xl border border-line">
                <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-xl px-3.5 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30">
                  <span className="flex-1 text-[13px] font-semibold text-ink-2">Details</span>
                  <Badge variant="neutral">Optional</Badge>
                  <ChevronDown className={cn("size-4 text-muted-2 transition-transform duration-200 motion-reduce:transition-none", detailsOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="flex flex-col gap-4 px-3.5 pb-3.5">
                    <Field
                      label="Description"
                      action={
                        <span className="text-xs text-muted-2 tabular-nums">
                          {draft.description.length}/{ROOM_LIMITS.description}
                        </span>
                      }
                    >
                      <Textarea
                        value={draft.description}
                        onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                        maxLength={ROOM_LIMITS.description}
                        rows={3}
                        placeholder="A quiet rondavel with a view of the hills, a private veranda and an outdoor shower."
                      />
                    </Field>
                    <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
                      <Field label="Beds">
                        <Input
                          value={draft.beds}
                          onChange={(event) => setDraft({ ...draft, beds: event.target.value })}
                          maxLength={ROOM_LIMITS.beds}
                          placeholder="1 queen + 2 singles"
                        />
                      </Field>
                      <Field label="Size" error={errors.size}>
                        <InputGroup>
                          <InputGroupInput
                            value={draft.size}
                            onChange={(event) => setDraft({ ...draft, size: event.target.value.replace(/[^\d]/g, "").slice(0, 4) })}
                            inputMode="numeric"
                            placeholder="32"
                          />
                          <InputGroupAddon align="end">m²</InputGroupAddon>
                        </InputGroup>
                      </Field>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Field
                label="Amenities"
                help="What's in or with this room. The first few show on its card, and guests can filter rooms by them."
                action={<span className="text-xs text-muted-2">Up to {AMENITIES_ON_CARD} show on the card</span>}
              >
                <ToggleGroup
                  multiple
                  value={draft.amenities}
                  onValueChange={(value) => setDraft({ ...draft, amenities: value as AmenityKey[] })}
                  aria-label="Amenities"
                >
                  {AMENITY_KEYS.map((key) => {
                    const Icon = AMENITIES[key].icon;
                    return (
                      <Toggle key={key} value={key}>
                        <Icon className="group-data-pressed/toggle:hidden" />
                        {AMENITIES[key].label}
                      </Toggle>
                    );
                  })}
                </ToggleGroup>
              </Field>

              <label className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
                    Show on site
                    <InfoTip label="More about Show on site">Turn it off for a room you're not letting for now, like during repairs. It keeps its photos and bookings.</InfoTip>
                  </span>
                  <span className="text-xs text-muted-2">
                    {draft.visible ? "Guests see this room and can book it." : "Hidden rooms stay here. Guests don't see them."}
                  </span>
                </span>
                <Switch checked={draft.visible} onCheckedChange={(visible) => setDraft({ ...draft, visible })} />
              </label>
            </fieldset>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-semibold text-ink-2">Photos</span>
                <span className="text-xs text-muted-2 tabular-nums">
                  {photos.length + uploads.items.length + pending.length} of {ROOM_PHOTO_LIMIT}
                </span>
              </div>
              <PhotoDropzone
                size="sm"
                onFiles={addFiles}
                title="Drag room photos here"
                touchTitle="Add room photos"
                note="Several at once. Resized on your device first."
                action="Upload"
                full={slotsLeft > 0 ? undefined : { limit: ROOM_PHOTO_LIMIT, what: "This room" }}
              />
              <div className="grid grid-cols-3 gap-2 empty:hidden sm:grid-cols-4">
                <AnimatePresence initial={false}>
                  {photos.map((photo, index) => (
                    <motion.div
                      key={photo.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: removing.includes(photo.id) ? 0.5 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      aria-busy={removing.includes(photo.id) || undefined}
                      className={cn("group relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2", removing.includes(photo.id) && "pointer-events-none")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server */}
                      <img src={photo.url} srcSet={photo.srcSet ?? undefined} sizes="160px" alt="" decoding="async" className="size-full object-cover" />
                      {removing.includes(photo.id) ? (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="flex size-7 items-center justify-center rounded-full bg-white/95 text-brand shadow-xs">
                            <Spinner className="size-3.5" label="Removing photo" />
                          </span>
                        </span>
                      ) : null}
                      {index === 0 ? (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">Cover</span>
                      ) : null}
                      {photos.length > 1 ? (
                        <span className="absolute bottom-1 left-1 flex gap-1">
                          <button
                            type="button"
                            onClick={() => movePhoto(photo.id, -1)}
                            disabled={index === 0 || reordering}
                            aria-label={index === 1 ? "Make this the cover" : "Move earlier"}
                            className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-ink disabled:hidden"
                          >
                            <ArrowLeft className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => movePhoto(photo.id, 1)}
                            disabled={index === photos.length - 1 || reordering}
                            aria-label="Move later"
                            className="flex size-8 items-center justify-center rounded-lg bg-white/95 text-slate shadow-xs hover:text-ink disabled:hidden"
                          >
                            <ArrowRight className="size-3.5" />
                          </button>
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-lg bg-white/95 text-muted-2 shadow-xs hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    </motion.div>
                  ))}
                  {pending.map((file, index) => (
                    <motion.div
                      key={`${file.name}-${index}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative aspect-[4/3] overflow-hidden rounded-xl bg-surface-2"
                    >
                      <PendingPreview file={file} />
                      {index === 0 && photos.length === 0 ? (
                        <span className="absolute top-1.5 left-1.5 rounded-md bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">Cover</span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setPending((current) => current.filter((_, position) => position !== index))}
                        aria-label="Remove photo"
                        className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-lg bg-white/95 text-muted-2 shadow-xs hover:text-danger"
                      >
                        <X className="size-3.5" />
                      </button>
                    </motion.div>
                  ))}
                  {uploads.items.map((item) => (
                    <UploadTile key={item.id} item={item} compact onRetry={() => uploads.retry(item.id)} onDismiss={() => uploads.dismiss(item.id)} />
                  ))}
                </AnimatePresence>
              </div>
              {photos.length + pending.length > 1 ? <p className="text-xs text-muted-2">The first one is the cover; use the arrows to change the order.</p> : null}
            </div>
          </SheetBody>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              {created ? "Close" : "Cancel"}
            </Button>
            <WhyDisabled reason={!online && !created && !saving ? OFFLINE_REASON : null}>
              <Button
                type="submit"
                loading={saving || (created && busyUploading)}
                disabled={!online && !created}
                className={cn(created && !busyUploading && "bg-success hover:bg-success")}
              >
                {created ? (busyUploading ? "Uploading photos" : "Done") : isNew ? "Add room" : "Save room"}
              </Button>
            </WhyDisabled>
          </SheetFooter>
        </form>
      </SheetContent>
      <DiscardChangesDialog
        open={confirmClose}
        onKeep={() => setConfirmClose(false)}
        onDiscard={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

/** Local preview of a photo picked before the room exists. */
function PendingPreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element -- local preview
  return url ? <img src={url} alt="" className="size-full object-cover" /> : null;
}
