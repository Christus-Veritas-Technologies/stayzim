"use client";

import { DEFAULT_TEMPLATE, findTemplate, TEMPLATES, type Template, type TemplateKey } from "@stayzim/sites";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, Eye } from "lucide-react";
import { useEffect, useState } from "react";

import { CreateActions, CreateHeading } from "@/components/create/frame";
import { DEFAULT_THEME } from "@/components/create/preview";
import { PreviewWidthTabs, TemplatePreviewFrame, type PreviewWidth } from "@/components/dashboard/template-preview-frame";
import { TemplateThumb } from "@/components/dashboard/template-thumb";
import { LODGES } from "@/components/landing/content";
import { api } from "@/lib/api";
import { PLANS, type PlanKey } from "@/lib/lodge";

/** A few words each, so the tiles stay small. The design screen has the long descriptions. */
const LOOKS: Record<TemplateKey, string> = {
  "starter-veranda": "Rounded and friendly",
  "starter-rondavel": "One bold photo",
  "starter-shade": "Classic, with a serif",
  "growth-shoreline": "Big photo, date search",
  "growth-wordmark": "Your name, giant",
  "growth-overlap": "Glass and floating cards",
  "pro-escarpment": "Cinematic and editorial",
  "pro-courtyard": "Dark and dramatic",
  "pro-canopy": "Safari camp, from above",
};

/** The landing page's example lodges (made by `seed-demos`), as slugs: the designs are previewed on one of them. */
const EXAMPLE_SLUGS = LODGES.map((lodge) => lodge.domain.split(".")[0]!);

/** ?look= from a reload, else the design of the plan a landing-page link named (?plan=). */
export function lookFromParams(look: string | null, plan: PlanKey): TemplateKey {
  const found = findTemplate(look);
  return found ? (found.key as TemplateKey) : DEFAULT_TEMPLATE[plan];
}

/**
 * An example lodge that's live, to show each design with real rooms and
 * photos: a paid one first (no demo badges), else a demo. Null until one
 * answers, and when none is set up (a fresh install): then there's no Preview.
 */
function useExampleLodge() {
  const [slug, setSlug] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(EXAMPLE_SLUGS.map((candidate) => api<{ status: string; demo?: boolean }>(`/api/sites/${candidate}`))).then((results) => {
      if (cancelled) return;
      const live = results.flatMap((result, index) => (result.data?.status === "LIVE" ? [{ slug: EXAMPLE_SLUGS[index]!, demo: result.data.demo === true }] : []));
      setSlug((live.find((lodge) => !lodge.demo) ?? live[0])?.slug ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return slug;
}

/** A design on the example lodge, phone-sized or full width, and "Use {name}". */
function LookPreview({ slug, template, onClose, onUse }: { slug: string; template: Template | null; onClose: () => void; onUse: (key: TemplateKey) => void }) {
  const [width, setWidth] = useState<PreviewWidth>("phone");
  // Keep the last design while the sheet slides out
  const [shown, setShown] = useState<Template | null>(template);
  useEffect(() => {
    if (template) setShown(template);
  }, [template]);
  const src = shown ? `/preview/${slug}/${shown.key}` : undefined;
  const plan = shown ? PLANS[shown.plan] : null;

  return (
    <Sheet open={template !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[min(1120px,calc(100vw-1rem))]">
        <SheetHeader>
          <SheetTitle>{shown?.name}</SheetTitle>
          <SheetDescription>{shown?.description}</SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-3 bg-surface-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <PreviewWidthTabs value={width} onChange={setWidth} />
            <p className="text-xs text-muted-2">An example lodge. Yours shows your own name, rooms and photos.</p>
          </div>
          <TemplatePreviewFrame src={src} title={`${shown?.name} design preview`} width={width} />
        </SheetBody>
        <SheetFooter className="flex-wrap justify-between">
          <a href={src} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
            Open in a new tab
            <ArrowUpRight />
          </a>
          <div className="flex items-center gap-3">
            {plan ? (
              <span className="hidden text-[12.5px] text-muted-2 sm:inline">
                {plan.name} · ${plan.price}/mo
              </span>
            ) : null}
            <Button
              onClick={() => {
                if (shown) onUse(shown.key as TemplateKey);
                onClose();
              }}
            >
              <Check />
              Use {shown?.name}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Step 1 of 3: the look of the site, shown as the designs themselves, each
 * with a Preview on an example lodge. The plan comes with the design and its
 * price stays small: the point is how the site will look. Everything can be
 * changed later, from Design and Billing.
 */
export function LookStep({ value, onChange, onNext }: { value: TemplateKey; onChange: (key: TemplateKey) => void; onNext: () => void }) {
  const picked = findTemplate(value)!;
  const plan = PLANS[picked.plan];
  const example = useExampleLodge();
  const [previewing, setPreviewing] = useState<Template | null>(null);
  return (
    <>
      <CreateHeading title="First, pick a look">Every design works with your rooms and photos. You can switch any time.</CreateHeading>

      <div role="radiogroup" aria-label="Site design" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {TEMPLATES.map((template) => {
          const selected = template.key === value;
          return (
            <div key={template.key} className="group/look relative">
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange(template.key)}
                className="group relative flex w-full flex-col rounded-[16px] bg-white p-1.5 text-left shadow-card transition-shadow outline-none hover:shadow-pop focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {selected ? (
                  <motion.span
                    layoutId="create-look-ring"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    className="pointer-events-none absolute -inset-[3px] rounded-[19px] border-2 border-brand"
                  />
                ) : null}
                <span className="relative block overflow-hidden rounded-[11px] border border-line-3">
                  <TemplateThumb
                    templateKey={template.key}
                    themeColor={DEFAULT_THEME}
                    heroUrl={null}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04] motion-reduce:transition-none"
                  />
                  {selected ? (
                    <motion.span
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 26 }}
                      className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white shadow-brand ring-2 ring-white"
                      aria-hidden="true"
                    >
                      <Check className="size-3.5" strokeWidth={3} />
                    </motion.span>
                  ) : null}
                </span>
                <span className={cn("truncate px-1.5 pt-2.5 text-[14.5px] font-semibold", selected ? "text-brand-dark" : "text-ink")}>{template.name}</span>
                <span className="flex items-baseline justify-between gap-2 px-1.5 pb-1.5">
                  <span className="truncate text-[12.5px] leading-[18px] text-muted">{LOOKS[template.key]}</span>
                  <span className="shrink-0 text-[11.5px] text-muted-2 tabular-nums">${PLANS[template.plan].price}/mo</span>
                </span>
              </button>
              {/* Beside the tile, not in it: a button can't hold another. Always shown on touch screens */}
              {example ? (
                <button
                  type="button"
                  onClick={() => setPreviewing(template)}
                  aria-label={`Preview ${template.name}`}
                  className="absolute top-3 left-3 inline-flex h-7 items-center justify-center gap-1 rounded-full bg-white/95 text-[12px] max-sm:w-7 sm:px-2.5 font-semibold text-ink shadow-xs transition-[opacity,color] duration-200 outline-none hover:text-brand focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/30 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/look:opacity-100"
                >
                  <Eye className="size-3.5" />
                  <span className="max-sm:hidden">Preview</span>
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {example ? <LookPreview slug={example} template={previewing} onClose={() => setPreviewing(null)} onUse={onChange} /> : null}

      <CreateActions
        sticky
        note={
          <>
            <span className="font-semibold text-ink-2">{picked.name}</span> comes with {plan.name}, ${plan.price} a month once your free 2 days are up.
          </>
        }
      >
        <Button size="lg" className="w-full" onClick={onNext}>
          Next: your lodge
          <ArrowRight />
        </Button>
      </CreateActions>
    </>
  );
}
