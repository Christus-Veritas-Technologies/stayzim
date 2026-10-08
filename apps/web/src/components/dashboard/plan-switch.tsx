"use client";

import { designFitsPlan, PLAN_ORDER, PLAN_RANK, TEMPLATES, templateAllowed, type Template, type TemplateKey } from "@stayzim/sites";
import { Button } from "@stayzim/ui/components/button";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Eye, Info } from "lucide-react";
import { useState } from "react";

import { TemplateThumb } from "@/components/dashboard/template-thumb";
import { PreviewSheet } from "@/components/preview/preview-sheet";
import { PLANS, type Lodge, type PlanKey } from "@/lib/lodge";
import { planChanges } from "@/lib/plan-changes";
import { siteHost } from "@/lib/site-host";

/** True when paying for `plan` needs a design pick first: the site's design doesn't come with it. */
export function needsDesign(lodge: Lodge, plan: PlanKey) {
  return !designFitsPlan(lodge.template, lodge.plan, plan);
}

/** The designs a plan can use: its own first, then the cheaper plans'. */
function designsFor(plan: PlanKey) {
  return [...TEMPLATES]
    .filter((template) => templateAllowed(template, plan))
    .sort((a, b) => PLAN_RANK[b.plan] - PLAN_RANK[a.plan] || PLAN_ORDER.indexOf(a.plan) - PLAN_ORDER.indexOf(b.plan));
}

/**
 * Moving to a cheaper plan, on the pay card: what changes (nothing is
 * deleted), and when the site's design doesn't come with the new plan, a pick
 * of its designs, each previewed on the owner's own site. The pick goes with
 * the payment and goes live with it; nothing changes until it's paid.
 */
export function PlanSwitch({
  lodge,
  plan,
  design,
  onDesign,
  upcomingBookings = 0,
}: {
  lodge: Lodge;
  plan: PlanKey;
  design: TemplateKey | null;
  onDesign: (key: TemplateKey) => void;
  upcomingBookings?: number;
}) {
  const [previewing, setPreviewing] = useState<Template | null>(null);
  const changes = planChanges(lodge.plan, plan, upcomingBookings);
  const pick = needsDesign(lodge, plan);
  if (changes.length === 0 && !pick) return null;
  const name = PLANS[plan].name;

  return (
    <AnimatePresence initial={false}>
      <motion.div key={plan} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface p-3.5">
          {changes.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-[14px] font-semibold">
                <Info className="size-4 shrink-0 text-brand" />
                What changes on {name}
              </p>
              <ul className="flex flex-col gap-1.5 pl-6 text-[13px] leading-5 text-muted">
                {changes.map((line) => (
                  <li key={line} className="list-disc">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {pick ? (
            <div className="flex flex-col gap-2.5" role="radiogroup" aria-label={`Pick a design for ${name}`}>
              <div>
                <p className="text-[14px] font-semibold">Pick a design for {name}</p>
                <p className="text-[13px] text-muted">Your design doesn&apos;t come with {name}. Pick one that does; it goes live when you pay.</p>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {designsFor(plan).map((template) => {
                  const selected = design === template.key;
                  return (
                    <div key={template.key} className="relative flex flex-col gap-1.5 rounded-[14px] bg-white p-1.5 shadow-xs">
                      {selected ? (
                        <motion.span
                          layoutId="plan-switch-ring"
                          transition={{ type: "spring", stiffness: 420, damping: 34 }}
                          className="pointer-events-none absolute -inset-[2px] rounded-[16px] border-2 border-brand"
                        />
                      ) : null}
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => onDesign(template.key as TemplateKey)}
                        className="group/tile flex flex-col gap-1.5 rounded-[10px] text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                      >
                        <TemplateThumb templateKey={template.key} themeColor={lodge.themeColor} heroUrl={lodge.heroUrl} className="rounded-[10px]" />
                        <span className="flex items-center justify-between gap-1 px-1 text-[13px] font-semibold">
                          {template.name}
                          {selected ? <Check className="size-3.5 text-brand" strokeWidth={3} /> : null}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewing(template)}
                        className={cn("inline-flex items-center gap-1 self-start rounded-md px-1 pb-0.5 text-[12px] font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30")}
                      >
                        <Eye className="size-3.5" />
                        Preview
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
        <PreviewSheet
          preview={
            previewing
              ? { title: previewing.name, description: previewing.description, src: `/preview/${lodge.slug}/${previewing.key}?bare=1`, host: siteHost(lodge), tint: lodge.themeColor }
              : null
          }
          onClose={() => setPreviewing(null)}
          note="Your own site in this design."
          action={
            previewing ? (
              <Button
                onClick={() => {
                  onDesign(previewing.key as TemplateKey);
                  setPreviewing(null);
                }}
              >
                <Check />
                Pick {previewing.name}
              </Button>
            ) : null
          }
        />
      </motion.div>
    </AnimatePresence>
  );
}
