"use client";

import { FACT_LIMITS, LODGE_KINDS, PRICE_HINTS, SETTINGS, type LodgeKind, type Setting } from "@stayzim/sites";
import { Button } from "@stayzim/ui/components/button";
import { InfoTip } from "@stayzim/ui/components/info-tip";
import { NumberField } from "@stayzim/ui/components/number-field";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Binoculars,
  Building2,
  Check,
  Coffee,
  CookingPot,
  Fish,
  Hotel,
  House,
  Mountain,
  Sofa,
  Tent,
  TreePine,
  Waves,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import { CreateActions, CreateHeading } from "@/components/create/frame";

/** What step 2 asks: the copy and the example rooms are made from these. */
export type CreateFacts = {
  kind: LodgeKind | null;
  setting: Setting | null;
  roomsHint: number;
  priceHint: number | null;
};

export const DEFAULT_FACTS: CreateFacts = { kind: null, setting: null, roomsHint: 4, priceHint: null };

const KIND_ICONS: Record<LodgeKind, LucideIcon> = {
  lodge: TreePine,
  guesthouse: House,
  bnb: Coffee,
  "holiday-home": Sofa,
  camp: Tent,
  hotel: Hotel,
  "self-catering": CookingPot,
};

const SETTING_ICONS: Record<Setting, LucideIcon> = {
  mountains: Mountain,
  lake: Waves,
  bush: Binoculars,
  river: Fish,
  city: Building2,
  farm: Wheat,
};

/** ?kind=&setting=&rooms=&price= from a reload. */
export function factsFromParams(params: URLSearchParams): CreateFacts {
  const kind = params.get("kind");
  const setting = params.get("setting");
  const rooms = Number(params.get("rooms"));
  const price = Number(params.get("price"));
  return {
    kind: kind && kind in LODGE_KINDS ? (kind as LodgeKind) : null,
    setting: setting && setting in SETTINGS ? (setting as Setting) : null,
    roomsHint: Number.isInteger(rooms) && rooms >= 1 && rooms <= FACT_LIMITS.roomsMax ? rooms : DEFAULT_FACTS.roomsHint,
    priceHint: Number.isInteger(price) && price >= FACT_LIMITS.priceMin && price <= FACT_LIMITS.priceMax ? price : null,
  };
}

/** The facts as URL params, so a reload keeps them. */
export function factsParams(facts: CreateFacts) {
  const params = new URLSearchParams();
  if (facts.kind) params.set("kind", facts.kind);
  if (facts.setting) params.set("setting", facts.setting);
  params.set("rooms", String(facts.roomsHint));
  if (facts.priceHint) params.set("price", String(facts.priceHint));
  return params;
}

/** A big one-tap tile with an icon, like the reference designs' option cards. */
function Tile({ icon: Icon, label, hint, selected, onSelect, ringId }: { icon: LucideIcon; label: string; hint?: string; selected: boolean; onSelect: () => void; ringId: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-[86px] flex-col items-start gap-2 rounded-[16px] bg-white p-3 text-left shadow-card transition-shadow outline-none hover:shadow-pop focus-visible:ring-3 focus-visible:ring-ring/30",
      )}
    >
      {selected ? (
        <motion.span
          layoutId={ringId}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="pointer-events-none absolute -inset-[3px] rounded-[19px] border-2 border-brand"
        />
      ) : null}
      <span className={cn("flex size-9 items-center justify-center rounded-xl transition-colors duration-200", selected ? "bg-brand text-white" : "bg-brand-wash text-brand")}>
        <Icon className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={cn("text-[14px] leading-5 font-semibold", selected ? "text-brand-dark" : "text-ink")}>{label}</span>
        {hint ? <span className="text-[12px] leading-4 text-muted-2">{hint}</span> : null}
      </span>
      {selected ? (
        <span className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-brand text-white" aria-hidden="true">
          <Check className="size-3" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}

function Question({ title, hint, help, children }: { title: string; hint?: string; help?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="flex items-center gap-1.5 text-[16px] leading-6 font-semibold text-ink">
          {title}
          {help ? <InfoTip label={`More about: ${title}`}>{help}</InfoTip> : null}
        </h2>
        {hint ? <p className="text-[13px] leading-[19px] text-muted">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Step 2 of 4: what kind of place it is, where, and how big. A few taps; the
 * site's copy is written from them and the example rooms are sized and priced
 * like theirs. Every answer can be changed later from the dashboard.
 */
export function PlaceStep({ facts, onChange, onNext, onBack }: { facts: CreateFacts; onChange: (facts: CreateFacts) => void; onNext: () => void; onBack: () => void }) {
  const set = (patch: Partial<CreateFacts>) => onChange({ ...facts, ...patch });
  return (
    <>
      <CreateHeading title="Tell us about your place">A few taps. We write your site from them, with example rooms you can change later.</CreateHeading>

      <div className="flex flex-col gap-8">
        <Question title="What kind of place is it?" help="It sets the words your site uses: rooms or tents, guests or campers, your hosts or the team.">
          <div role="radiogroup" aria-label="Type of place" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(LODGE_KINDS) as LodgeKind[]).map((key) => (
              <Tile key={key} icon={KIND_ICONS[key]} label={LODGE_KINDS[key].label} selected={facts.kind === key} onSelect={() => set({ kind: key })} ringId="create-kind-ring" />
            ))}
          </div>
        </Question>

        <Question title="Where is it?" hint="The view guests wake up to." help="Your welcome, the things to do and the example photos follow it. You can change it later in Lodge info.">
          <div role="radiogroup" aria-label="Setting" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(Object.keys(SETTINGS) as Setting[]).map((key) => (
              <Tile
                key={key}
                icon={SETTING_ICONS[key]}
                label={SETTINGS[key].label}
                hint={SETTINGS[key].hint}
                selected={facts.setting === key}
                onSelect={() => set({ setting: key })}
                ringId="create-setting-ring"
              />
            ))}
          </div>
        </Question>

        <div className="grid gap-8 sm:grid-cols-2 sm:gap-5">
          <Question title="How many rooms?">
            <NumberField
              value={facts.roomsHint}
              onValueChange={(value) => set({ roomsHint: Math.min(FACT_LIMITS.roomsMax, Math.max(1, Math.round(value ?? 1))) })}
              min={1}
              max={FACT_LIMITS.roomsMax}
              aria-label="How many rooms"
              className="sm:max-w-[200px]"
            />
          </Question>
          <Question title="A typical price a night" help="Roughly what a room costs a night. Your example rooms are priced around it until you add your own.">
            <div role="radiogroup" aria-label="Typical price a night" className="flex flex-wrap gap-2">
              {PRICE_HINTS.map((price, index) => {
                const selected = facts.priceHint === price;
                const last = index === PRICE_HINTS.length - 1;
                return (
                  <button
                    key={price}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => set({ priceHint: price })}
                    className={cn(
                      "h-10 rounded-full border px-4 text-[14px] font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                      selected ? "border-brand bg-brand text-white shadow-brand" : "border-line bg-white text-ink hover:border-brand/50 hover:text-brand-dark",
                    )}
                  >
                    ${price}
                    {last ? "+" : ""}
                  </button>
                );
              })}
            </div>
          </Question>
        </div>
      </div>

      <CreateActions sticky onBack={onBack} note="Not sure? Pick the closest. You can change all of this later.">
        <Button size="lg" className="w-full" onClick={onNext}>
          Next: your lodge
          <ArrowRight />
        </Button>
      </CreateActions>
    </>
  );
}
