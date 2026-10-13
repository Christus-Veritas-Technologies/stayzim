"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { Progress } from "@stayzim/ui/components/progress";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { FACT_LIMITS, FOUNDING_PRICES, LODGE_KINDS, PLAN_PRICES, SETTINGS, TEMPLATES, type LodgeKind, type Setting, type TemplateKey } from "@stayzim/sites";
import { ArrowLeft, ArrowRight, Check, Eye, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { LoadError, LoadingCards, Page, PageHeader, PageSection, Panel } from "@/components/page";
import { api, apiUpload } from "@/lib/api";
import { ImageReadError, photoForm, resizeImage, smallerCopies } from "@/lib/images";
import { PLAN_NAMES } from "@/lib/labels";
import { env } from "@/lib/public-env";
import type { LeadDetail, LeadSite, Plan } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Step = "look" | "place" | "lodge" | "photos";
const STEPS: { key: Step; label: string }[] = [
  { key: "look", label: "Design" },
  { key: "place", label: "Their place" },
  { key: "lodge", label: "Name and WhatsApp" },
  { key: "photos", label: "Photos" },
];

function StepBar({ step }: { step: Step }) {
  const index = STEPS.findIndex((item) => item.key === step);
  return (
    <ol className="flex flex-wrap gap-2">
      {STEPS.map((item, position) => (
        <li
          key={item.key}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold",
            position < index ? "bg-success-wash text-success" : position === index ? "bg-primary text-white" : "bg-surface-2 text-muted",
          )}
        >
          {position < index ? <Check className="size-3.5" /> : <span className="tabular-nums">{position + 1}</span>}
          {item.label}
        </li>
      ))}
    </ol>
  );
}

/** Photos for a site: resized in the browser (with smaller copies), uploaded one after another, as the dashboard does. */
function Photos({ site, leadId }: { site: { slug: string; name: string; url: string }; leadId: string }) {
  const [uploads, setUploads] = useState<{ name: string; progress: number; error?: string; done?: boolean }[]>([]);
  const busy = uploads.some((upload) => !upload.done && !upload.error);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    const start = uploads.length;
    setUploads((current) => [...current, ...list.map((file) => ({ name: file.name, progress: 0 }))]);
    for (const [offset, file] of list.entries()) {
      const index = start + offset;
      const update = (patch: Partial<(typeof uploads)[number]>) => setUploads((current) => current.map((item, position) => (position === index ? { ...item, ...patch } : item)));
      try {
        const image = await resizeImage(file);
        const copies = await smallerCopies(image);
        const result = await apiUpload(`/api/admin/sites/${site.slug}/photos`, photoForm(image, {}, copies), (progress) => update({ progress }));
        if (result.error !== undefined) update({ error: result.error });
        else update({ done: true, progress: 1 });
      } catch (error) {
        update({ error: error instanceof ImageReadError ? error.message : "That photo didn't upload. Try another." });
      }
    }
  }

  return (
    <Panel title={`Photos for ${site.name}`} description="Three good ones are plenty to start: the outside, a room and the view. They go to the gallery; the first is the big photo at the top.">
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-[16px] border-2 border-dashed border-line-2 bg-surface-2 px-4 py-8 text-center transition-colors hover:border-brand">
        <ImagePlus className="size-6 text-brand" />
        <span className="text-[14px] font-semibold">Choose photos</span>
        <span className="text-[12.5px] text-muted">JPG, PNG or WebP. Big photos are made smaller first.</span>
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => void add(event.target.files)} />
      </label>
      {uploads.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {uploads.map((upload, index) => (
            <li key={`${upload.name}-${index}`} className="flex flex-col gap-1 text-[13px]">
              <span className="flex justify-between gap-3">
                <span className="truncate">{upload.name}</span>
                <span className={upload.error ? "text-danger" : upload.done ? "text-success" : "text-muted"}>{upload.error ?? (upload.done ? "Uploaded" : "Uploading")}</span>
              </span>
              {!upload.error ? <Progress value={upload.progress * 100} /> : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <a href={site.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
          See the site
        </a>
        <Link href={`/leads/${leadId}`} className={cn(buttonVariants(), busy && "pointer-events-none opacity-60")}>
          Done
          <ArrowRight />
        </Link>
      </div>
    </Panel>
  );
}

/** The /create steps, done for a lead: design (and so the plan), their place, name and WhatsApp, then photos. */
function NewSite() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const params = useSearchParams();
  const { data: lead, error: loadError, loading, reload } = useApi<LeadDetail>(`/api/admin/leads/${id}`);
  const existing = params.get("site");

  const [step, setStep] = useState<Step>(existing ? "photos" : "look");
  const [tab, setTab] = useState<Plan>("STARTER");
  const [template, setTemplate] = useState<TemplateKey>("starter-veranda");
  const [kind, setKind] = useState<LodgeKind | "">("");
  const [setting, setSetting] = useState<Setting | "">("");
  const [rooms, setRooms] = useState("");
  const [price, setPrice] = useState("");
  const [lodge, setLodge] = useState<{ name: string; town: string; whatsapp: string } | null>(null);
  const [created, setCreated] = useState<LeadSite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingCards />;
  if (loadError || !lead) return <LoadError message={loadError ?? "Try again."} onRetry={reload} />;

  const form = lodge ?? { name: lead.lodgeName ?? "", town: lead.city === "Unknown" ? "" : lead.city, whatsapp: `+${lead.phone}` };
  const picked = TEMPLATES.find((item) => item.key === template)!;
  const sitePhotos = existing ? lead.sites.find((site) => site.slug === existing) : created;

  function previewUrl(key: string) {
    const query = new URLSearchParams({
      name: form.name || lead!.lodgeName || lead!.name,
      ...(form.town ? { town: form.town } : {}),
      ...(kind ? { kind } : {}),
      ...(setting ? { setting } : {}),
      ...(rooms ? { rooms } : {}),
      ...(price ? { price } : {}),
    });
    return `${env.NEXT_PUBLIC_WEB_URL}/preview/sample/${key}?${query}`;
  }

  async function create(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const result = await api<LeadSite>(`/api/admin/leads/${lead!.id}/sites`, {
      method: "POST",
      json: {
        plan: picked.plan,
        template,
        name: form.name.trim(),
        town: form.town.trim() || null,
        whatsapp: form.whatsapp,
        kind: kind || null,
        setting: setting || null,
        roomsHint: rooms ? Number(rooms) : null,
        priceHint: price ? Number(price) : null,
        utmSource: "team",
        utmMedium: "lead",
      },
    });
    setSaving(false);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    toast.success(`${result.data.name} is live at ${result.data.url.replace(/^https?:\/\//, "")}`);
    setCreated(result.data);
    setStep("photos");
  }

  return (
    <Page className="max-w-[920px]">
      <PageHeader
        back={{ label: lead.name, href: `/leads/${lead.id}` }}
        title={existing ? "Photos" : `A site for ${lead.name}`}
        description={existing ? undefined : "The same steps as /create. It stays a free preview, with no timer, until you give it to them."}
      />
      {existing ? null : (
        <PageSection>
          <StepBar step={step} />
        </PageSection>
      )}

      {step === "look" ? (
        <PageSection className="flex flex-col gap-4">
          <Tabs value={tab} onValueChange={(value) => setTab(value as Plan)}>
            <TabsList aria-label="Plans">
              {(Object.keys(PLAN_NAMES) as Plan[]).map((plan) => (
                <TabsTab key={plan} value={plan}>
                  {PLAN_NAMES[plan]}
                  <span className="text-[12px] font-medium opacity-70">${FOUNDING_PRICES[plan]}</span>
                </TabsTab>
              ))}
            </TabsList>
          </Tabs>
          <p className="text-[13px] text-muted">
            {PLAN_NAMES[tab]} is ${FOUNDING_PRICES[tab]} a month at the founding price (normally ${PLAN_PRICES[tab]}). The plan comes with the design.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            {TEMPLATES.filter((item) => item.plan === tab).map((item) => {
              const chosen = item.key === template;
              return (
                <Card key={item.key} className={cn("flex flex-col gap-3 p-4 transition-shadow", chosen && "ring-2 ring-brand")}>
                  <button type="button" onClick={() => setTemplate(item.key as TemplateKey)} className="flex flex-col gap-1 text-left">
                    <span className="flex items-center justify-between">
                      <span className="text-[15px] font-semibold">{item.name}</span>
                      {chosen ? <Badge variant="brand">Picked</Badge> : null}
                    </span>
                    <span className="text-[12.5px] leading-5 text-muted">{item.description}</span>
                  </button>
                  <a href={previewUrl(item.key)} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-auto" })}>
                    <Eye />
                    Preview with their name
                  </a>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep("place")}>
              Next: their place
              <ArrowRight />
            </Button>
          </div>
        </PageSection>
      ) : null}

      {step === "place" ? (
        <PageSection>
          <Panel title="Their place" description="All optional: it shapes the words written for the site and its example rooms.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="What kind of place">
                <NativeSelect value={kind} onChange={(event) => setKind(event.target.value as LodgeKind | "")}>
                  <option value="">Not sure</option>
                  {(Object.keys(LODGE_KINDS) as LodgeKind[]).map((key) => (
                    <option key={key} value={key}>
                      {LODGE_KINDS[key].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Setting">
                <NativeSelect value={setting} onChange={(event) => setSetting(event.target.value as Setting | "")}>
                  <option value="">Not sure</option>
                  {(Object.keys(SETTINGS) as Setting[]).map((key) => (
                    <option key={key} value={key}>
                      {SETTINGS[key].label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Rooms" hint={`1 to ${FACT_LIMITS.roomsMax}`}>
                <Input inputMode="numeric" value={rooms} onChange={(event) => setRooms(event.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="A typical night (USD)">
                <Input inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value.replace(/\D/g, ""))} />
              </Field>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("look")}>
                <ArrowLeft />
                Back
              </Button>
              <Button onClick={() => setStep("lodge")}>
                Next: name and WhatsApp
                <ArrowRight />
              </Button>
            </div>
          </Panel>
        </PageSection>
      ) : null}

      {step === "lodge" ? (
        <PageSection>
          <Panel title="Name and WhatsApp" description={`${picked.name} on ${PLAN_NAMES[picked.plan]}. Guests' Book buttons open a chat with this number.`}>
            <form onSubmit={create} className="flex flex-col gap-4">
              <Field label="Lodge name">
                <Input value={form.name} onChange={(event) => setLodge({ ...form, name: event.target.value })} required minLength={2} maxLength={80} />
              </Field>
              <Field label="Town">
                <Input value={form.town} onChange={(event) => setLodge({ ...form, town: event.target.value })} maxLength={60} />
              </Field>
              <Field label="WhatsApp number" hint="With the country code.">
                <Input value={form.whatsapp} onChange={(event) => setLodge({ ...form, whatsapp: event.target.value })} required inputMode="tel" />
              </Field>
              {error ? <FormMessage>{error}</FormMessage> : null}
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep("place")}>
                  <ArrowLeft />
                  Back
                </Button>
                <Button type="submit" disabled={saving || form.name.trim().length < 2}>
                  {saving ? "Making the site" : "Make the site"}
                </Button>
              </div>
            </form>
          </Panel>
        </PageSection>
      ) : null}

      {step === "photos" && sitePhotos ? (
        <PageSection>
          <Photos site={sitePhotos} leadId={lead.id} />
        </PageSection>
      ) : null}
      {step === "photos" && !sitePhotos ? (
        <PageSection>
          <LoadError message="That site isn't one of this lead's." onRetry={() => router.replace(`/leads/${lead.id}`)} />
        </PageSection>
      ) : null}
    </Page>
  );
}

export default function NewSitePage() {
  return (
    <Suspense fallback={<LoadingCards />}>
      <NewSite />
    </Suspense>
  );
}
