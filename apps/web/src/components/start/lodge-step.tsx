"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import { CircleCheck, CircleX, Globe } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { PlanPicker } from "@/components/plan-picker";
import { StepHeading } from "@/components/start/frame";
import { api } from "@/lib/api";
import { metaEvent } from "@/lib/meta-pixel";
import { phoneFromInput, PLANS, type Lodge, type PlanKey } from "@/lib/lodge";
import { SITES_DOMAIN } from "@/lib/site-host";

type SlugCheck = { slug: string; available: boolean; problem: string | null };

/** "077 123 4567" is how most people write their number: take the 0 off for them. */
function whatsappDigits(text: string) {
  const local = text.trim().replace(/[\s-]/g, "");
  return phoneFromInput(/^0\d{9}$/.test(local) ? local.slice(1) : text);
}

/**
 * Step 1: name, town and WhatsApp number. The web address is suggested from
 * the name as they type, and can be changed. Creates the lodge, live as a demo.
 */
export function LodgeStep({ plan: initialPlan, onCreated }: { plan: PlanKey; onCreated: (lodge: Lodge) => void }) {
  const [plan, setPlan] = useState(initialPlan);
  const [name, setName] = useState("");
  const [town, setTown] = useState("");
  const [region, setRegion] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [slug, setSlug] = useState("");
  const [editingSlug, setEditingSlug] = useState(false);
  const [check, setCheck] = useState<SlugCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; town?: string; whatsapp?: string; slug?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const request = useRef(0);

  // Suggest an address from the name (and town, when the name is taken), or check the one they typed
  useEffect(() => {
    const query = editingSlug ? `slug=${encodeURIComponent(slug)}` : `name=${encodeURIComponent(name)}&town=${encodeURIComponent(town)}`;
    if ((editingSlug ? slug : name).trim().length < 3) {
      setCheck(null);
      return;
    }
    const id = ++request.current;
    setChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await api<SlugCheck>(`/api/onboarding/slug?${query}`);
      if (id !== request.current) return;
      setChecking(false);
      if (!data) return;
      setCheck(data);
      if (!editingSlug) setSlug(data.slug);
    }, 350);
    return () => clearTimeout(timer);
  }, [editingSlug, name, slug, town]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const phone = whatsappDigits(whatsapp);
    const problems = {
      name: name.trim().length < 2 ? "Add your lodge's name." : undefined,
      town: town.trim().length < 2 ? "Add the town, so guests know where you are." : undefined,
      whatsapp: phone.error ?? (phone.digits ? undefined : "Add the number guests should message to book."),
      slug: check && !check.available ? (check.problem ?? "Pick another address.") : undefined,
    };
    setErrors(problems);
    if (Object.values(problems).some(Boolean) || !slug) return;

    setSaving(true);
    setError(null);
    const result = await api<Lodge>("/api/onboarding/lodge", {
      method: "POST",
      json: { plan, name: name.trim(), town: town.trim(), region: region.trim() || null, whatsapp: phone.digits, slug },
    });
    if (result.data) {
      metaEvent("StartTrial", { value: 0, currency: "USD", predicted_ltv: PLANS[plan].price * 12, content_name: plan.toLowerCase() });
      onCreated(result.data);
      return;
    }
    setSaving(false);
    setError(result.error);
  }

  const status = checking ? "checking" : check === null ? null : check.available ? "free" : "taken";

  return (
    <>
      <StepHeading title="Tell us about your lodge">Your site goes live as soon as you tap Create. Add photos and rooms next.</StepHeading>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <FormMessage>{error}</FormMessage>
          <Field label="Lodge name" error={errors.name}>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Mist Valley Lodge" autoComplete="organization" required />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Town" error={errors.town}>
              <Input value={town} onChange={(event) => setTown(event.target.value)} placeholder="Nyanga" autoComplete="address-level2" required />
            </Field>
            <Field label="Province (optional)">
              <Input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Manicaland" autoComplete="address-level1" />
            </Field>
          </div>
          <Field label="WhatsApp number" error={errors.whatsapp} hint="Guests tap Book on WhatsApp and message this number.">
            <InputGroup>
              <InputGroupAddon>
                <WhatsAppIcon size={15} color="#1F7A4D" />
                +263
              </InputGroupAddon>
              <InputGroupInput
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="77 123 4567"
              />
            </InputGroup>
          </Field>

          <Field
            label="Your web address"
            error={errors.slug}
            action={
              <button
                type="button"
                onClick={() => setEditingSlug((value) => !value)}
                className="-my-2.5 py-2.5 text-[13px] font-semibold text-brand hover:text-brand-dark"
              >
                {editingSlug ? "Use the suggestion" : "Change"}
              </button>
            }
          >
            {editingSlug ? (
              <InputGroup>
                <InputGroupInput
                  value={slug}
                  onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={40}
                  aria-label="Web address"
                />
                <InputGroupAddon align="end" className="text-muted">.{SITES_DOMAIN}</InputGroupAddon>
              </InputGroup>
            ) : (
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-line bg-surface-2 px-3 text-[14px]">
                <Globe className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 truncate">
                  {slug ? (
                    <>
                      <strong className="font-semibold text-ink">{slug}</strong>
                      <span className="text-muted">.{SITES_DOMAIN}</span>
                    </>
                  ) : (
                    <span className="text-muted-2">Appears as you type the name</span>
                  )}
                </span>
              </div>
            )}
            {status ? (
              <span
                className={cn("mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium", status === "taken" ? "text-danger" : status === "free" ? "text-success" : "text-muted")}
                aria-live="polite"
              >
                {status === "checking" ? <Spinner className="size-3.5" /> : status === "free" ? <CircleCheck className="size-3.5" /> : <CircleX className="size-3.5" />}
                {status === "checking" ? "Checking…" : status === "free" ? "It's yours" : (check?.problem ?? "Taken")}
              </span>
            ) : null}
          </Field>

          <Field label="Plan" hint="Free for 2 days on any plan. You pay only to keep the site live after that.">
            <PlanPicker value={plan} onChange={setPlan} disabled={saving} />
          </Field>

          <Button type="submit" size="lg" className="mt-2 w-full" loading={saving} disabled={checking && !slug}>
            {saving ? "Creating your site" : "Create my site"}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
