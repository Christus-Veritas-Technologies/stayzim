"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@stayzim/ui/components/tabs";
import { Textarea } from "@stayzim/ui/components/textarea";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronRight,
  Crosshair,
  FileText,
  ImageIcon,
  Info,
  Link2,
  MapPin,
  Palette,
  Phone,
  Plus,
  Sparkles,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FormSection, type SectionState } from "@/components/dashboard/form-section";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { MapPreview } from "@/components/dashboard/map-preview";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { SitePreview } from "@/components/dashboard/site-preview";
import { WhatsAppIcon } from "@/components/landing/brand";
import { WhyDisabled } from "@/components/why-disabled";
import { api, apiUpload } from "@/lib/api";
import { ImageReadError, LOGO_EDGE, photoForm, resizeImage } from "@/lib/images";
import {
  formatPhone,
  lodgePlace,
  phoneFromInput,
  phoneToInput,
  siteHost,
  siteUrl,
  THEME_COLORS,
  themeColorName,
  type Lodge,
} from "@/lib/lodge";
import { OFFLINE_REASON, useOnline } from "@/lib/online";

const DESCRIPTION_MAX = 300;

/** The form, as typed. Phones and coordinates stay text until saved. */
type Draft = {
  name: string;
  description: string;
  town: string;
  region: string;
  whatsapp: string;
  phone: string;
  email: string;
  mapsUrl: string;
  latitude: string;
  longitude: string;
  themeColor: string;
  heroPhotoId: string | null;
};

function draftFrom(lodge: Lodge): Draft {
  return {
    name: lodge.name,
    description: lodge.description,
    town: lodge.town ?? "",
    region: lodge.region ?? "",
    whatsapp: phoneToInput(lodge.whatsapp),
    phone: phoneToInput(lodge.phone),
    email: lodge.email ?? "",
    mapsUrl: lodge.mapsUrl ?? "",
    latitude: lodge.latitude?.toString() ?? "",
    longitude: lodge.longitude?.toString() ?? "",
    themeColor: lodge.themeColor,
    heroPhotoId: lodge.heroPhotoId,
  };
}

type FieldErrors = Partial<Record<keyof Draft, string>>;

function parseCoordinate(text: string, limit: number) {
  if (!text.trim()) return { value: null };
  const value = Number(text.trim());
  if (!Number.isFinite(value) || Math.abs(value) > limit) return { value: null, error: "Check this number" };
  return { value };
}

/** What PATCH /api/lodge needs: only the fields that changed, and any problems found first. */
function changesFrom(draft: Draft, lodge: Lodge) {
  const errors: FieldErrors = {};
  const whatsapp = phoneFromInput(draft.whatsapp);
  const phone = phoneFromInput(draft.phone);
  const latitude = parseCoordinate(draft.latitude, 90);
  const longitude = parseCoordinate(draft.longitude, 180);
  if (!draft.name.trim()) errors.name = "Add your lodge name";
  if (draft.description.length > DESCRIPTION_MAX) errors.description = `Keep it under ${DESCRIPTION_MAX} characters`;
  if (whatsapp.error) errors.whatsapp = whatsapp.error;
  if (phone.error) errors.phone = phone.error;
  if (draft.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim())) errors.email = "Check the email address";
  if (latitude.error) errors.latitude = latitude.error;
  if (longitude.error) errors.longitude = longitude.error;

  const next = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    town: draft.town.trim() || null,
    region: draft.region.trim() || null,
    whatsapp: whatsapp.error ? lodge.whatsapp : whatsapp.digits,
    phone: phone.error ? lodge.phone : phone.digits,
    email: draft.email.trim() || null,
    mapsUrl: draft.mapsUrl.trim() || null,
    latitude: latitude.error ? lodge.latitude : latitude.value,
    longitude: longitude.error ? lodge.longitude : longitude.value,
    themeColor: draft.themeColor,
    heroPhotoId: draft.heroPhotoId,
  };
  const changes = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => value !== lodge[key as keyof typeof next]),
  ) as Partial<typeof next>;
  return { changes, errors };
}

function sectionState(changed: boolean, filled: boolean): SectionState {
  return changed ? "edited" : filled ? "set" : "empty";
}

export default function LodgeInfoPage() {
  const { lodge, save, setLodge } = useLodge();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(lodge));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState("details");
  const [previewOpen, setPreviewOpen] = useState(false);
  const online = useOnline();
  const { changes } = useMemo(() => changesFrom(draft, lodge), [draft, lodge]);
  const dirty = Object.keys(changes).length > 0 || draft.whatsapp !== phoneToInput(lodge.whatsapp) || draft.phone !== phoneToInput(lodge.phone);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  // Don't lose edits to a stray tap on Back
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function onSave() {
    const result = changesFrom(draft, lodge);
    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0) {
      const first = Object.keys(result.errors)[0] as keyof Draft;
      setTab(["mapsUrl", "latitude", "longitude"].includes(first) ? "location" : "details");
      return;
    }
    setSaving(true);
    setSaveError(null);
    justSaved.current = true;
    const error = await save("", "PATCH", result.changes);
    setSaving(false);
    if (error) {
      justSaved.current = false;
      setSaveError(error);
      return;
    }
    toast.success("Changes saved", {
      description: `They're live on ${siteHost(lodge)}.`,
      action: { label: "View site", onClick: () => window.open(siteUrl(lodge), "_blank", "noreferrer") },
    });
  }

  // After a save, show what the server stored (trimmed text, phone digits); a
  // logo upload also refreshes the lodge but must not wipe edits in progress
  const justSaved = useRef(false);
  useEffect(() => {
    if (!justSaved.current) return;
    justSaved.current = false;
    setDraft(draftFrom(lodge));
  }, [lodge]);

  function onDiscard() {
    setDraft(draftFrom(lodge));
    setErrors({});
    setSaveError(null);
  }

  const heroUrl = lodge.gallery.find((photo) => photo.id === draft.heroPhotoId)?.url ?? lodge.gallery[0]?.url ?? null;
  const preview = {
    name: draft.name,
    place: lodgePlace({ town: draft.town, region: draft.region }),
    description: draft.description,
    themeColor: draft.themeColor,
    logoUrl: lodge.logoUrl,
    heroUrl,
    rooms: lodge.rooms,
  };

  const actions = (
    <>
      <Button variant="outline" onClick={onDiscard} disabled={!dirty || saving}>
        Discard
      </Button>
      <WhyDisabled reason={saving ? null : !online ? OFFLINE_REASON : dirty ? null : "No changes to save"}>
        <Button onClick={onSave} loading={saving} disabled={!dirty || !online}>
          Save changes
        </Button>
      </WhyDisabled>
    </>
  );

  return (
    <Page className="pb-20 lg:pb-0">
      <PageHeader
        sitePage
        back={{ label: "Dashboard", href: "/dashboard" }}
        title="Lodge info"
        description={
          <>
            What guests see on <span className="font-semibold text-ink">{siteHost(lodge)}</span>.
          </>
        }
        actions={<div className="hidden gap-2 lg:flex">{actions}</div>}
      />

      <AnimatePresence>
        {saveError ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <FormMessage>
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Changes did not save.</strong> {saveError} Your edits are still here.
              </span>
            </FormMessage>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <PageSection className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Locked while saving, so nothing typed meanwhile is lost when the saved copy comes back */}
        <fieldset disabled={saving} className="min-w-0">
          <Tabs value={tab} onValueChange={(value) => setTab(String(value))} className="min-w-0">
            <TabsList aria-label="Lodge info">
              <TabsTab value="details">
                <FileText />
                Details
              </TabsTab>
              <TabsTab value="location">
                <MapPin />
                Location
              </TabsTab>
              <TabsTab value="look">
                <Palette />
                Look
              </TabsTab>
            </TabsList>

            <TabsPanel value="details" className="flex flex-col gap-3">
              <FormSection
                icon={Type}
                title="Basics"
                summary="Name and the short intro at the top of your site"
                state={sectionState(
                  ["name", "description", "town", "region"].some((key) => key in changes),
                  Boolean(lodge.name && lodge.description),
                )}
                defaultOpen
              >
                <Field label="Lodge name" error={errors.name}>
                  <Input value={draft.name} onChange={(event) => set("name", event.target.value)} maxLength={80} autoComplete="organization" />
                </Field>
                <Field label="Description" count={{ value: draft.description.length, max: DESCRIPTION_MAX }} error={errors.description}>
                  <Textarea
                    value={draft.description}
                    onChange={(event) => set("description", event.target.value)}
                    placeholder="A quiet stone lodge in the Nyanga hills, 10 minutes from World's View."
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Town">
                    <Input value={draft.town} onChange={(event) => set("town", event.target.value)} placeholder="Nyanga" maxLength={60} />
                  </Field>
                  <Field label="Province">
                    <Input value={draft.region} onChange={(event) => set("region", event.target.value)} placeholder="Manicaland" maxLength={60} />
                  </Field>
                </div>
              </FormSection>

              <FormSection
                icon={Phone}
                title="Contact"
                summary={
                  [lodge.whatsapp && `WhatsApp ${formatPhone(lodge.whatsapp)}`, lodge.phone && `Phone ${formatPhone(lodge.phone)}`]
                    .filter(Boolean)
                    .join(" · ") || "Where Book on WhatsApp sends guests"
                }
                state={sectionState(["whatsapp", "phone", "email"].some((key) => key in changes), Boolean(lodge.whatsapp))}
                defaultOpen={!lodge.whatsapp}
              >
                <Field
                  label="WhatsApp number"
                  error={errors.whatsapp}
                  hint="Every Book on WhatsApp button opens a chat with this number."
                >
                  <InputGroup>
                    <InputGroupAddon>
                      <WhatsAppIcon size={15} color="#1F7A4D" />
                      +263
                    </InputGroupAddon>
                    <InputGroupInput
                      value={draft.whatsapp}
                      onChange={(event) => set("whatsapp", event.target.value)}
                      inputMode="tel"
                      autoComplete="tel-national"
                      placeholder="77 123 4567"
                    />
                  </InputGroup>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone (optional)" error={errors.phone} hint="For guests who'd rather call.">
                    <InputGroup>
                      <InputGroupAddon>+263</InputGroupAddon>
                      <InputGroupInput
                        value={draft.phone}
                        onChange={(event) => set("phone", event.target.value)}
                        inputMode="tel"
                        placeholder="77 123 4567"
                      />
                    </InputGroup>
                  </Field>
                  <Field label="Email (optional)" error={errors.email}>
                    <Input
                      type="email"
                      inputMode="email"
                      value={draft.email}
                      onChange={(event) => set("email", event.target.value)}
                      placeholder="bookings@yourlodge.co.zw"
                    />
                  </Field>
                </div>
              </FormSection>
              <p className="flex items-center gap-2 px-1 text-[12.5px] text-muted-2">
                <Info className="size-3.5" />
                Location and Look have their own tabs, so you only see one part at a time.
              </p>
            </TabsPanel>

            <TabsPanel value="location" className="flex flex-col gap-3">
              <LocationSections draft={draft} set={set} errors={errors} changes={changes} lodge={lodge} />
            </TabsPanel>

            <TabsPanel value="look" className="flex flex-col gap-3">
              <FormSection
                icon={Palette}
                title="Theme colour"
                summary={`${themeColorName(draft.themeColor)} · ${draft.themeColor.toUpperCase()}`}
                state={sectionState("themeColor" in changes, true)}
                defaultOpen
              >
                <div role="radiogroup" aria-label="Theme colour" className="flex flex-wrap items-center gap-2.5">
                  {THEME_COLORS.map((color) => {
                    const selected = draft.themeColor.toLowerCase() === color.value.toLowerCase();
                    return (
                      <button
                        key={color.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={color.name}
                        title={color.name}
                        onClick={() => set("themeColor", color.value)}
                        className={cn(
                          "flex size-9 items-center justify-center rounded-full text-white ring-offset-2 transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/40",
                          selected && "ring-2 ring-ink",
                        )}
                        style={{ backgroundColor: color.value }}
                      >
                        {selected ? <Check className="size-4 animate-in zoom-in-50" strokeWidth={3} /> : null}
                      </button>
                    );
                  })}
                  <label className={buttonVariants({ variant: "outline", size: "sm", className: "relative cursor-pointer" })}>
                    <Plus />
                    Custom
                    <input
                      type="color"
                      value={draft.themeColor}
                      onChange={(event) => set("themeColor", event.target.value.toUpperCase())}
                      className="absolute inset-0 cursor-pointer opacity-0"
                      aria-label="Pick any colour"
                    />
                  </label>
                </div>
                <p className="text-[13px] text-muted-2">Used for headings, prices and links. The WhatsApp button always stays green.</p>
              </FormSection>

              <LogoSection lodge={lodge} onUploaded={setLodge} onRemove={() => save("/logo", "DELETE")} />

              <FormSection
                icon={ImageIcon}
                title="Hero image"
                summary="The big photo at the top of your site"
                state={sectionState("heroPhotoId" in changes, lodge.gallery.length > 0)}
              >
                {lodge.gallery.length === 0 ? (
                  <p className="text-[13.5px] text-muted">
                    Upload photos in{" "}
                    <Link href="/dashboard/gallery" className="font-semibold text-brand hover:text-brand-dark">
                      Gallery
                    </Link>{" "}
                    first, then pick one here.
                  </p>
                ) : (
                  <div role="radiogroup" aria-label="Hero image" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {lodge.gallery.map((photo, index) => {
                      const selected = (draft.heroPhotoId ?? lodge.gallery[0]?.id) === photo.id;
                      return (
                        <button
                          key={photo.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={photo.caption || `Photo ${index + 1}`}
                          onClick={() => set("heroPhotoId", photo.id)}
                          className={cn(
                            "relative aspect-[4/3] overflow-hidden rounded-lg outline-none ring-offset-2 transition focus-visible:ring-3 focus-visible:ring-ring/40",
                            selected ? "ring-2 ring-brand" : "opacity-80 hover:opacity-100",
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server */}
                          <img src={photo.url} alt="" className="size-full object-cover" />
                          {selected ? (
                            <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-brand text-white animate-in zoom-in-50">
                              <Check className="size-3" strokeWidth={3} />
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </FormSection>
            </TabsPanel>
          </Tabs>
        </fieldset>

        <aside className="sticky top-20 hidden flex-col gap-3 xl:flex">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">Preview</span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="size-1.5 rounded-full bg-success" />
              Updates as you edit
            </span>
          </div>
          <SitePreview lodge={preview} />
        </aside>
      </PageSection>

      <PageSection className="xl:hidden">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-card transition-colors hover:bg-surface"
        >
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#C9D9D2,#7C978B)] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-semibold">Preview your site</span>
            <span className="text-xs text-muted">See changes before you save</span>
          </span>
          <ChevronRight className="size-4 text-muted-2" />
        </button>
      </PageSection>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <SheetBody className="bg-surface-2">
            <SitePreview lodge={preview} />
          </SheetBody>
        </SheetContent>
      </Sheet>

      {/* Phones: Save stays in reach above the bottom bar while there are edits */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-[68px] z-30 grid grid-cols-[1fr_2fr] gap-2 border-t border-line-3 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
          >
            {actions}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Page>
  );
}

function LocationSections({
  draft,
  set,
  errors,
  changes,
  lodge,
}: {
  draft: Draft;
  set: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  errors: FieldErrors;
  changes: Record<string, unknown>;
  lodge: Lodge;
}) {
  const [finding, setFinding] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);
  const latitude = draft.latitude.trim() ? Number(draft.latitude) : null;
  const longitude = draft.longitude.trim() ? Number(draft.longitude) : null;
  const located = latitude !== null && longitude !== null && Number.isFinite(latitude) && Number.isFinite(longitude);

  async function findPin() {
    if (!draft.mapsUrl.trim()) {
      setFindError("Paste the link from Share in Google Maps first.");
      return;
    }
    setFinding(true);
    setFindError(null);
    const result = await api<{ latitude: number; longitude: number }>("/api/lodge/map-location", {
      method: "POST",
      json: { url: draft.mapsUrl },
    });
    setFinding(false);
    if (result.error !== undefined) {
      setFindError(result.error);
      return;
    }
    set("latitude", String(result.data.latitude));
    set("longitude", String(result.data.longitude));
  }

  return (
    <>
      <FormSection
        icon={MapPin}
        title="Map pin"
        summary={lodgePlace({ town: draft.town, region: draft.region }) ?? "Where guests find you on the map"}
        state={sectionState("mapsUrl" in changes, Boolean(lodge.mapsUrl || lodge.latitude !== null))}
        defaultOpen
      >
        <Field label="Google Maps link" error={findError ?? undefined} hint="Paste the link from Share in Google Maps.">
          <div className="flex gap-2">
            <InputGroup>
              <InputGroupAddon>
                <Link2 />
              </InputGroupAddon>
              <InputGroupInput
                value={draft.mapsUrl}
                onChange={(event) => set("mapsUrl", event.target.value)}
                inputMode="url"
                placeholder="https://maps.app.goo.gl/…"
              />
            </InputGroup>
            <Button variant="outline" onClick={findPin} loading={finding} className="shrink-0">
              {finding ? null : <Crosshair />}
              Find pin
            </Button>
          </div>
        </Field>
        <MapPreview
          latitude={located ? latitude : null}
          longitude={located ? longitude : null}
          place={lodgePlace({ town: draft.town, region: draft.region })}
        />
      </FormSection>

      <FormSection
        icon={Crosshair}
        title="Coordinates"
        summary={located ? `${draft.latitude}, ${draft.longitude}` : "Filled in from your link, or type them"}
        state={sectionState("latitude" in changes || "longitude" in changes, lodge.latitude !== null)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={errors.latitude}>
            <Input value={draft.latitude} onChange={(event) => set("latitude", event.target.value)} inputMode="decimal" placeholder="-18.2869" />
          </Field>
          <Field label="Longitude" error={errors.longitude}>
            <Input value={draft.longitude} onChange={(event) => set("longitude", event.target.value)} inputMode="decimal" placeholder="32.7414" />
          </Field>
        </div>
      </FormSection>
    </>
  );
}

function LogoSection({
  lodge,
  onUploaded,
  onRemove,
}: {
  lodge: Lodge;
  onUploaded: (lodge: Lodge) => void;
  onRemove: () => Promise<string | null>;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "remove" | null>(null);

  async function upload(file: File) {
    setBusy("upload");
    try {
      const image = await resizeImage(file, { maxEdge: LOGO_EDGE, keepTransparency: true });
      const result = await apiUpload<Lodge>("/api/lodge/logo", photoForm(image));
      if (result.error !== undefined) toast.error(result.error);
      else {
        onUploaded(result.data);
        toast.success("Logo updated");
      }
    } catch (error) {
      toast.error(error instanceof ImageReadError ? error.message : "The logo did not upload. Try again.");
    }
    setBusy(null);
  }

  async function remove() {
    setBusy("remove");
    const error = await onRemove();
    if (error) toast.error(error);
    setBusy(null);
  }

  return (
    <FormSection
      icon={Sparkles}
      title="Logo"
      summary={lodge.logoUrl ? "Shown in the corner of your site" : "Your initials show until you add one"}
      state={lodge.logoUrl ? "set" : "empty"}
    >
      <div className="flex items-center gap-4">
        <Avatar shape="lodge" size="lg" name={lodge.name} src={lodge.logoUrl} color={lodge.themeColor} />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => input.current?.click()} loading={busy === "upload"}>
            {lodge.logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {lodge.logoUrl ? (
            <Button variant="ghost" size="sm" onClick={remove} loading={busy === "remove"}>
              Remove
            </Button>
          ) : null}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          tabIndex={-1}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void upload(file);
          }}
        />
      </div>
      <p className="text-[13px] text-muted-2">A square PNG with a clear background looks best. Saved straight away.</p>
    </FormSection>
  );
}
