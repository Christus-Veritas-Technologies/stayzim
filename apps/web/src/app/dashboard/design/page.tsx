"use client";

import {
  DEFAULT_TEMPLATE,
  fillCopy,
  findTemplate,
  HERO_LIMITS,
  PLANS_LABEL,
  TEMPLATES,
  templateAllowed,
  type MotionLevel,
  type Plan,
  type Template,
} from "@stayzim/sites";
import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@stayzim/ui/components/card";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { Textarea } from "@stayzim/ui/components/textarea";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, ChevronRight, Eye, Info, Lock, Monitor, RotateCcw, Smartphone, Sparkles, Type } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { RequestChangeHint } from "@/components/dashboard/request-change-hint";
import { SitePreview } from "@/components/dashboard/site-preview";
import { TemplateThumb } from "@/components/dashboard/template-thumb";
import { UnsavedChangesGuard } from "@/components/dashboard/unsaved-changes";
import { WhatsAppIcon } from "@/components/landing/brand";
import { Appear, Item, riseIn } from "@/components/motion";
import { WhyDisabled } from "@/components/why-disabled";
import { lodgePlace, PLANS, siteHost, siteUrl, type Lodge } from "@/lib/lodge";
import { OFFLINE_REASON, useOnline } from "@/lib/online";
import { stayzimChatUrl } from "@/lib/whatsapp";

const PLAN_ORDER: Plan[] = ["STARTER", "GROWTH", "PRO"];

const PLAN_BADGE: Record<Plan, "neutral" | "brand" | "purple"> = { STARTER: "neutral", GROWTH: "brand", PRO: "purple" };

const MOTION_LABEL: Record<MotionLevel, string> = { none: "Still", subtle: "Subtle motion", rich: "Rich motion" };

function upgradeUrl(lodge: Lodge, template: Template) {
  const plan = PLANS[template.plan];
  return stayzimChatUrl(
    `Hi StayZim, I'd like to move ${lodge.name} to the ${plan.name} plan ($${plan.price}/month) to use the ${template.name} template.`,
  );
}

export default function DesignPage() {
  const { lodge } = useLodge();
  const live = findTemplate(lodge.siteTemplate) ?? findTemplate(DEFAULT_TEMPLATE[lodge.plan])!;
  const chosen = findTemplate(lodge.template);
  const [previewing, setPreviewing] = useState<Template | null>(null);

  return (
    <Page className="pb-20 lg:pb-0">
      <PageHeader
        sitePage
        back={{ label: "My site", href: "/dashboard/site" }}
        title="Design"
        description={
          <>
            How <span className="font-semibold text-ink">{siteHost(lodge)}</span> looks, and the words at the top.
          </>
        }
      />

      {chosen && chosen.key !== live.key ? (
        <PageSection>
          <FormMessage tone="info" className="items-center">
            <Info className="size-4 shrink-0" />
            <span className="flex-1">
              Your plan doesn&apos;t include <strong className="font-semibold">{chosen.name}</strong>, so your site shows{" "}
              <strong className="font-semibold">{live.name}</strong> for now.
            </span>
            <a
              href={upgradeUrl(lodge, chosen)}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: "accent", size: "sm", className: "shrink-0" })}
            >
              Upgrade to {PLANS_LABEL[chosen.plan]}
            </a>
          </FormMessage>
        </PageSection>
      ) : null}

      <HeroText lodge={lodge} live={live} />

      <PageSection className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-lg leading-6 font-semibold tracking-[-0.01em]">Templates</h2>
            <p className="text-[13.5px] text-muted">
              Your site uses <span className="font-semibold text-ink">{live.name}</span>. Tap a template to preview it with your lodge.
            </p>
          </div>
          <Badge variant={PLAN_BADGE[lodge.plan]}>{PLANS[lodge.plan].name} plan</Badge>
        </div>

        {PLAN_ORDER.map((plan) => (
          <TemplateGroup key={plan} plan={plan} lodge={lodge} liveKey={live.key} onPreview={setPreviewing} />
        ))}
        <RequestChangeHint className="px-1" />
      </PageSection>

      <PreviewSheet lodge={lodge} template={previewing} liveKey={live.key} onClose={() => setPreviewing(null)} />
    </Page>
  );
}

function TemplateGroup({
  plan,
  lodge,
  liveKey,
  onPreview,
}: {
  plan: Plan;
  lodge: Lodge;
  liveKey: string;
  onPreview: (template: Template) => void;
}) {
  const templates = TEMPLATES.filter((template) => template.plan === plan);
  const included = templateAllowed({ plan }, lodge.plan);
  return (
    <section className="flex flex-col gap-3" aria-label={`${PLANS_LABEL[plan]} templates`}>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{PLANS_LABEL[plan]}</span>
        <span className="text-xs text-muted-2">{included ? "Included in your plan" : `Comes with ${PLANS_LABEL[plan]}`}</span>
      </div>
      <Appear className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" stagger={0.06}>
        {templates.map((template) => (
          <Item key={template.key} variants={riseIn}>
            <TemplateCard template={template} lodge={lodge} live={template.key === liveKey} onPreview={() => onPreview(template)} />
          </Item>
        ))}
      </Appear>
    </section>
  );
}

function TemplateCard({ template, lodge, live, onPreview }: { template: Template; lodge: Lodge; live: boolean; onPreview: () => void }) {
  const locked = !templateAllowed(template, lodge.plan);
  return (
    <div className="relative flex h-full flex-col rounded-[20px] bg-white p-2.5 shadow-card">
      {live ? (
        <motion.span
          layoutId="live-template-ring"
          transition={{ type: "spring", stiffness: 400, damping: 34 }}
          className="pointer-events-none absolute -inset-[3px] rounded-[23px] border-2 border-brand"
        />
      ) : null}

      <button
        type="button"
        onClick={onPreview}
        aria-label={`Preview ${template.name}`}
        className="group/thumb relative block overflow-hidden rounded-[14px] border border-line-3 outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <TemplateThumb
          templateKey={template.key}
          themeColor={lodge.themeColor}
          heroUrl={lodge.heroUrl}
          className={cn(
            "transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/thumb:scale-[1.03] motion-reduce:transition-none",
            locked && "opacity-60 grayscale-[35%]",
          )}
        />
        <span className="absolute inset-0 flex items-center justify-center bg-ink/0 opacity-0 transition-all duration-200 group-hover/thumb:bg-ink/25 group-hover/thumb:opacity-100 group-focus-visible/thumb:opacity-100">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold text-ink shadow-xs">
            <Eye className="size-4" />
            Preview
          </span>
        </span>
        {locked ? (
          <span className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/95 text-purple shadow-xs">
            <Lock className="size-3.5" />
          </span>
        ) : null}
      </button>

      <div className="flex flex-1 flex-col gap-1 px-1.5 pt-3 pb-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-semibold">{template.name}</span>
          {live ? (
            <Badge variant="success" status>
              Live
            </Badge>
          ) : locked ? (
            <Badge variant="purple">
              <Lock />
              {PLANS_LABEL[template.plan]}
            </Badge>
          ) : (
            <Badge variant={PLAN_BADGE[template.plan]}>{PLANS_LABEL[template.plan]}</Badge>
          )}
        </div>
        <p className="text-[13px] leading-[18px] text-muted">{template.description}</p>
        <p className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs text-muted-2">
          <Sparkles className="size-3.5" />
          {MOTION_LABEL[template.motion]}
        </p>
      </div>

      <div className="flex gap-2 px-1.5 pt-2 pb-1">
        <Button variant="outline" size="sm" className="flex-1" onClick={onPreview}>
          <Eye />
          Preview
        </Button>
        {locked ? (
          <a
            href={upgradeUrl(lodge, template)}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "accent", size: "sm", className: "flex-1" })}
          >
            Upgrade to {PLANS_LABEL[template.plan]}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function HeroText({ lodge, live }: { lodge: Lodge; live: Template }) {
  const { save } = useLodge();
  const online = useOnline();
  const [headline, setHeadline] = useState(lodge.heroHeadline ?? "");
  const [subline, setSubline] = useState(lodge.heroSubline ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const place = lodgePlace(lodge);
  const defaults = {
    headline: fillCopy(live.defaults.headline, { name: lodge.name, place }),
    subline: fillCopy(live.defaults.subline, { name: lodge.name, place }),
  };
  const dirty = headline.trim() !== (lodge.heroHeadline ?? "") || subline.trim() !== (lodge.heroSubline ?? "");
  const custom = Boolean(headline.trim() || subline.trim());

  // Show what the server stored once a save comes back
  const justSaved = useRef(false);
  useEffect(() => {
    if (!justSaved.current) return;
    justSaved.current = false;
    setHeadline(lodge.heroHeadline ?? "");
    setSubline(lodge.heroSubline ?? "");
  }, [lodge.heroHeadline, lodge.heroSubline]);

  async function onSave() {
    setSaving(true);
    setError(null);
    justSaved.current = true;
    // An empty string goes back to the template's own text
    const saveError = await save("", "PATCH", { heroHeadline: headline.trim(), heroSubline: subline.trim() });
    setSaving(false);
    if (saveError) {
      justSaved.current = false;
      setError(saveError);
      return;
    }
    toast.success("Hero text saved", {
      description: `It's live on ${siteHost(lodge)}.`,
      action: { label: "View site", onClick: () => window.open(siteUrl(lodge), "_blank", "noreferrer") },
    });
  }

  function onDiscard() {
    setHeadline(lodge.heroHeadline ?? "");
    setSubline(lodge.heroSubline ?? "");
    setError(null);
  }

  const preview = {
    name: lodge.name,
    place,
    description: lodge.description,
    themeColor: lodge.themeColor,
    logoUrl: lodge.logoUrl,
    heroUrl: lodge.heroUrl,
    rooms: lodge.rooms,
    headline: headline.trim() || defaults.headline,
    subline: subline.trim() || defaults.subline,
  };

  const actions = (
    <>
      <Button variant="outline" onClick={onDiscard} disabled={!dirty || saving}>
        Discard
      </Button>
      <WhyDisabled reason={saving ? null : !online ? OFFLINE_REASON : dirty ? null : "No changes to save"}>
        <Button onClick={onSave} loading={saving} disabled={!dirty || !online}>
          Save hero text
        </Button>
      </WhyDisabled>
    </>
  );

  return (
    <PageSection className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="min-w-0">
        <CardHeader>
          <span className="flex size-9 items-center justify-center rounded-[10px] bg-brand-wash text-brand">
            <Type className="size-[18px]" />
          </span>
          <div className="flex min-w-0 flex-col">
            <CardTitle>Hero text</CardTitle>
            <CardDescription>The big words at the top of your site. Leave them empty to use the {live.name} template&apos;s.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <fieldset disabled={saving} className="flex min-w-0 flex-col gap-4">
            <AnimatePresence>
              {error ? (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <FormMessage>
                    <Info className="mt-0.5 size-4 shrink-0" />
                    <span>
                      <strong className="font-semibold">Hero text did not save.</strong> {error}
                    </span>
                  </FormMessage>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <Field label="Headline" count={{ value: headline.length, max: HERO_LIMITS.headline }}>
              <Input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={HERO_LIMITS.headline} placeholder={defaults.headline} />
            </Field>
            <Field
              label="Line under it"
              count={{ value: subline.length, max: HERO_LIMITS.subline }}
              hint="Short and warm works best: what's special, and that guests book on WhatsApp."
            >
              <Textarea
                value={subline}
                onChange={(event) => setSubline(event.target.value)}
                maxLength={HERO_LIMITS.subline}
                placeholder={defaults.subline}
                className="min-h-20"
              />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <AnimatePresence initial={false}>
                {custom ? (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2"
                      onClick={() => {
                        setHeadline("");
                        setSubline("");
                      }}
                    >
                      <RotateCcw />
                      Reset to template text
                    </Button>
                  </motion.span>
                ) : (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[13px] text-muted-2"
                  >
                    Showing the {live.name} template&apos;s text.
                  </motion.span>
                )}
              </AnimatePresence>
              <div className="hidden gap-2 lg:flex">{actions}</div>
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <aside className="sticky top-20 hidden flex-col gap-3 xl:flex">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold">Preview</span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-success" />
            Updates as you type
          </span>
        </div>
        <SitePreview lodge={preview} />
      </aside>

      <button
        type="button"
        onClick={() => setPreviewOpen(true)}
        className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-card transition-colors hover:bg-surface xl:hidden"
      >
        <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#C9D9D2,#7C978B)] text-white">
          <Sparkles className="size-4" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[14px] font-semibold">Preview the hero</span>
          <span className="text-xs text-muted">See the words before you save</span>
        </span>
        <ChevronRight className="size-4 text-muted-2" />
      </button>

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

      <UnsavedChangesGuard when={dirty && !saving} />

      {/* Phones: Save stays in reach above the bottom bar while there are edits */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-[calc(64px+max(0.5rem,env(safe-area-inset-bottom)))] z-30 grid grid-cols-[1fr_2fr] gap-2 border-t border-line-3 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
          >
            {actions}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </PageSection>
  );
}

function PreviewSheet({
  lodge,
  template,
  liveKey,
  onClose,
}: {
  lodge: Lodge;
  template: Template | null;
  liveKey: string;
  onClose: () => void;
}) {
  const { save } = useLodge();
  const online = useOnline();
  const [width, setWidth] = useState<"phone" | "desktop">("phone");
  const [loaded, setLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  // Keep the last template while the sheet slides out
  const [shown, setShown] = useState<Template | null>(template);
  useEffect(() => {
    if (template) {
      setShown(template);
      setLoaded(false);
    }
  }, [template]);

  const locked = shown ? !templateAllowed(shown, lodge.plan) : false;
  const live = shown?.key === liveKey;
  const reason = !shown
    ? null
    : live
      ? "Your site already uses this template"
      : locked
        ? `Comes with ${PLANS_LABEL[shown.plan]}`
        : !online
          ? OFFLINE_REASON
          : null;

  async function apply() {
    if (!shown) return;
    const previous = liveKey;
    setApplying(true);
    const error = await save("", "PATCH", { template: shown.key });
    setApplying(false);
    if (error) {
      toast.error(error);
      return;
    }
    onClose();
    const applied = shown;
    toast.success("Template changed", {
      description: `${siteHost(lodge)} now uses ${applied.name}.`,
      action: {
        label: "Undo",
        onClick: async () => {
          const undoError = await save("", "PATCH", { template: previous });
          if (undoError) toast.error(undoError);
          else toast.success(`Back to ${findTemplate(previous)?.name ?? "your last template"}`);
        },
      },
    });
  }

  const src = shown ? `/preview/${lodge.slug}/${shown.key}` : undefined;

  return (
    <Sheet open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[min(1120px,calc(100vw-1rem))]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {shown?.name}
            {shown ? (
              live ? (
                <Badge variant="success" status>
                  Live
                </Badge>
              ) : (
                <Badge variant={PLAN_BADGE[shown.plan]}>{PLANS_LABEL[shown.plan]}</Badge>
              )
            ) : null}
          </SheetTitle>
          <SheetDescription>{shown ? `${shown.description} ${MOTION_LABEL[shown.motion]}.` : null}</SheetDescription>
        </SheetHeader>

        <SheetBody className="flex flex-col gap-3 bg-surface-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs value={width} onValueChange={(value) => setWidth(value as "phone" | "desktop")} className="hidden sm:flex">
              <TabsList aria-label="Preview size">
                <TabsTab value="phone">
                  <Smartphone />
                  Phone
                </TabsTab>
                <TabsTab value="desktop">
                  <Monitor />
                  Desktop
                </TabsTab>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-2">Your saved lodge info, rooms and photos. Visits here aren&apos;t counted.</p>
          </div>

          <div className="relative flex min-h-[460px] flex-1 justify-center">
            <motion.div
              animate={{ width: width === "phone" ? 390 : "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 32 }}
              className={cn(
                "relative h-full max-w-full overflow-hidden bg-white shadow-card",
                width === "phone" ? "rounded-[30px] border-[6px] border-ink" : "rounded-[14px] border border-line",
              )}
            >
              {src ? (
                <iframe
                  key={src}
                  src={src}
                  title={`${shown?.name} template preview`}
                  onLoad={() => setLoaded(true)}
                  className="size-full min-h-[448px] border-0"
                />
              ) : null}
              <AnimatePresence>
                {loaded ? null : (
                  <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-[13px] text-muted"
                  >
                    <Spinner className="size-5 text-brand" />
                    Building the preview
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </SheetBody>

        <SheetFooter className="flex-wrap justify-between">
          <a
            href={src}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}
          >
            Open in a new tab
            <ArrowUpRight />
          </a>
          <div className="flex items-center gap-2">
            {shown && locked ? (
              <a
                href={upgradeUrl(lodge, shown)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "accent" })}
              >
                <WhatsAppIcon size={15} color="#FFFFFF" />
                Upgrade to {PLANS_LABEL[shown.plan]}
              </a>
            ) : null}
            <WhyDisabled reason={applying ? null : reason}>
              <Button onClick={apply} loading={applying} disabled={reason !== null}>
                Use this template
              </Button>
            </WhyDisabled>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
