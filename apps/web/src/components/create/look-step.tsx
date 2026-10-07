"use client";

import { DEFAULT_TEMPLATE, findTemplate, TEMPLATES, type TemplateKey } from "@stayzim/sites";
import { Button } from "@stayzim/ui/components/button";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { CreateActions, CreateHeading } from "@/components/create/frame";
import { DEFAULT_THEME } from "@/components/create/preview";
import { TemplateThumb } from "@/components/dashboard/template-thumb";
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

/** ?look= from a reload, else the design of the plan a landing-page link named (?plan=). */
export function lookFromParams(look: string | null, plan: PlanKey): TemplateKey {
  const found = findTemplate(look);
  return found ? (found.key as TemplateKey) : DEFAULT_TEMPLATE[plan];
}

/**
 * Step 1 of 3: the look of the site, shown as the designs themselves. The
 * plan comes with the design and its price stays small: the point is how the
 * site will look. Everything can be changed later, from Design and Billing.
 */
export function LookStep({ value, onChange, onNext }: { value: TemplateKey; onChange: (key: TemplateKey) => void; onNext: () => void }) {
  const picked = findTemplate(value)!;
  const plan = PLANS[picked.plan];
  return (
    <>
      <CreateHeading title="First, pick a look">Every design works with your rooms and photos. You can switch any time.</CreateHeading>

      <div role="radiogroup" aria-label="Site design" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {TEMPLATES.map((template) => {
          const selected = template.key === value;
          return (
            <button
              key={template.key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(template.key)}
              className="group relative flex flex-col rounded-[16px] bg-white p-1.5 text-left shadow-card transition-shadow outline-none hover:shadow-pop focus-visible:ring-3 focus-visible:ring-ring/30"
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
          );
        })}
      </div>

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
