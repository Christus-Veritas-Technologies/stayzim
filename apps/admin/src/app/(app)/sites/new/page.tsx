"use client";

import { foundingOpen, LODGE_KINDS, monthlyPrice, PLAN_PRICES, type LodgeKind } from "@stayzim/sites";
import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { cn } from "@stayzim/ui/lib/utils";
import { Check, ImagePlus, Sparkles, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Page, PageHeader, PageSection, Panel } from "@/components/page";
import { api, apiUpload } from "@/lib/api";
import { ImageReadError, photoForm, resizeImage, smallerCopies, type PhotoCopies, type ResizedImage } from "@/lib/images";
import { PLAN_NAMES } from "@/lib/labels";
import type { LeadDetail, LeadSite, Plan } from "@/lib/types";

const PLANS: Plan[] = ["STARTER", "GROWTH", "PRO"];
const MAX_PHOTOS = 12;

type Picked = { file: File; preview: string };

/**
 * New sites for a client in one go: by default the $15 one and the $30 one, so
 * they can choose. Guest sites (claimed later with Give to lead, or paid with a
 * payment link), with the same photos on each. From a lead (?lead=…) the
 * details are filled in.
 */
function NewSites() {
  const router = useRouter();
  const leadId = useSearchParams().get("lead");
  const founding = foundingOpen(new Date());
  const [form, setForm] = useState({ name: "", town: "", whatsapp: "", contactName: "" });
  const [kind, setKind] = useState<LodgeKind | "">("");
  const [plans, setPlans] = useState<Plan[]>(["STARTER", "GROWTH"]);
  const [photos, setPhotos] = useState<Picked[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  // From a lead: their lodge, town and number
  useEffect(() => {
    if (!leadId) return;
    void api<LeadDetail>(`/api/admin/leads/${leadId}`).then((result) => {
      if (result.error !== undefined) return;
      const lead = result.data;
      setForm((current) => ({
        name: current.name || lead.lodgeName || "",
        town: current.town || lead.city,
        whatsapp: current.whatsapp || `+${lead.phone}`,
        contactName: current.contactName || lead.name,
      }));
    });
  }, [leadId]);

  useEffect(() => () => photos.forEach((photo) => URL.revokeObjectURL(photo.preview)), [photos]);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const toggle = (plan: Plan) => setPlans((current) => (current.includes(plan) ? current.filter((item) => item !== plan) : PLANS.filter((item) => item === plan || current.includes(item))));

  function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    setPhotos((current) => [...current, ...[...files].slice(0, room).map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (plans.length === 0) return setError("Pick at least one site to make.");
    setProgress(plans.length === 1 ? "Making the site" : `Making ${plans.length} sites`);
    const made = await api<{ leadId: string; sites: LeadSite[] }>("/api/admin/sites", {
      method: "POST",
      json: { ...form, contactName: form.contactName || undefined, plans, ...(kind ? { kind } : {}) },
    });
    if (made.error !== undefined) {
      setProgress(null);
      return setError(made.error);
    }

    // Each photo is resized once, then goes to every site's gallery (the first is the big photo at the top)
    const failed: string[] = [];
    for (const [index, photo] of photos.entries()) {
      setProgress(`Adding photo ${index + 1} of ${photos.length}`);
      let image: ResizedImage;
      let copies: PhotoCopies;
      try {
        image = await resizeImage(photo.file);
        copies = await smallerCopies(image);
      } catch (problem) {
        failed.push(problem instanceof ImageReadError ? `${photo.file.name}: ${problem.message}` : photo.file.name);
        continue;
      }
      for (const site of made.data.sites) {
        const result = await apiUpload(`/api/admin/sites/${site.slug}/photos`, photoForm(image, {}, copies));
        if (result.error !== undefined) failed.push(`${photo.file.name} on ${site.slug}: ${result.error}`);
      }
    }

    const names = made.data.sites.map((site) => `${PLAN_NAMES[site.plan]} ($${site.monthlyPrice})`).join(" and ");
    if (failed.length > 0) toast.error(`Made ${names}, but ${failed.length} ${failed.length === 1 ? "photo" : "photos"} didn't upload. Add them from the site's Photos.`);
    else toast.success(`Made ${names}`);
    router.push(`/leads/${made.data.leadId}`);
  }

  const busy = progress !== null;

  return (
    <Page>
      <PageHeader back={leadId ? { label: "Lead", href: `/leads/${leadId}` } : { label: "Sites", href: "/sites" }} title="New sites" description="For a client to choose between: the $15 one and the $30 one, unless you pick otherwise. Guest sites they claim later." />
      <PageSection>
        <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Panel title="The lodge">
            <fieldset disabled={busy} className="flex flex-col gap-4">
              <Field label="Lodge name">
                <Input value={form.name} onChange={set("name")} required maxLength={80} placeholder="Kudu Creek Lodge" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Town or city">
                  <Input value={form.town} onChange={set("town")} required maxLength={60} placeholder="Hwange" />
                </Field>
                <Field label="What kind of place" hint="Optional: it shapes the site's words.">
                  <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as LodgeKind | "")}>
                    <option value="">Not sure</option>
                    {(Object.keys(LODGE_KINDS) as LodgeKind[]).map((key) => (
                      <option key={key} value={key}>
                        {LODGE_KINDS[key].label}
                      </option>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="WhatsApp number" hint="Guests book on it. Their lead is found by it, or made.">
                  <Input value={form.whatsapp} onChange={set("whatsapp")} required inputMode="tel" placeholder="+263 77 123 4567" />
                </Field>
                <Field label="Their name" hint="Optional: the person we talk to.">
                  <Input value={form.contactName} onChange={set("contactName")} maxLength={200} />
                </Field>
              </div>
            </fieldset>
          </Panel>

          <div className="flex flex-col gap-4">
            <Panel title="Sites to make" description={founding ? "At the founding price, theirs for life." : undefined}>
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="Sites to make">
                {PLANS.map((plan) => {
                  const on = plans.includes(plan);
                  return (
                    <button
                      key={plan}
                      type="button"
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => toggle(plan)}
                      className={cn(
                        "relative flex flex-col items-start rounded-xl border px-3 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                        on ? "border-brand bg-brand-wash shadow-[0_0_0_1px_var(--color-brand)]" : "border-input hover:border-[#cfd8dd]",
                      )}
                    >
                      {on ? <Check className="absolute top-2 right-2 size-4 text-brand" /> : null}
                      <span className="text-[13.5px] font-semibold">{PLAN_NAMES[plan]}</span>
                      <span className="font-display text-xl font-semibold tabular-nums">${monthlyPrice(plan, founding)}</span>
                      {founding ? <span className="text-[11.5px] text-muted-2 line-through">${PLAN_PRICES[plan]}</span> : null}
                    </button>
                  );
                })}
              </div>
            </Panel>

            <Panel title="Photos" description="Optional. They go on every site; the first is the big photo at the top. Rooms come later.">
              <label className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border-2 border-dashed border-line-2 bg-surface-2 px-4 py-6 text-center transition-colors hover:border-brand", busy && "pointer-events-none opacity-60")}>
                <ImagePlus className="size-6 text-brand" />
                <span className="text-[14px] font-semibold">Choose photos</span>
                <span className="text-[12.5px] text-muted">JPG, PNG or WebP, up to {MAX_PHOTOS}. Big photos are made smaller first.</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => addPhotos(event.target.files)} />
              </label>
              {photos.length > 0 ? (
                <ul className="grid grid-cols-4 gap-2">
                  {photos.map((photo, index) => (
                    <li key={photo.preview} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- a local preview */}
                      <img src={photo.preview} alt={photo.file.name} className="aspect-square w-full rounded-lg object-cover" />
                      {index === 0 ? <span className="absolute bottom-1 left-1 rounded bg-ink/70 px-1.5 text-[10.5px] font-semibold text-white">Top</span> : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setPhotos((current) => current.filter((item) => item !== photo))}
                        className="absolute top-1 right-1 flex size-6 items-center justify-center rounded-full bg-white/90 text-ink shadow-xs"
                        aria-label={`Remove ${photo.file.name}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Panel>

            {error ? <FormMessage>{error}</FormMessage> : null}
            <Button type="submit" size="lg" disabled={busy || plans.length === 0}>
              <Sparkles />
              {progress ?? (plans.length === 2 ? "Make both sites" : plans.length === 1 ? "Make the site" : `Make ${plans.length} sites`)}
            </Button>
          </div>
        </form>
      </PageSection>
    </Page>
  );
}

export default function NewSitesPage() {
  return (
    <Suspense>
      <NewSites />
    </Suspense>
  );
}
