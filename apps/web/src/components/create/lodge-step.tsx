"use client";

import { COUNTRIES, ZIMBABWE_TOWNS, type TemplateKey } from "@stayzim/sites";
import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { CreateActions, CreateHeading } from "@/components/create/frame";
import type { CreateFacts } from "@/components/create/place-step";
import { MiniPreview } from "@/components/create/preview";
import { WhatsAppIcon } from "@/components/landing/brand";
import { api } from "@/lib/api";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { dialPrefix, phoneFromInput, PLANS, type Lodge, type PlanKey } from "@/lib/lodge";
import { metaCreateStep, metaEvent } from "@/lib/meta-pixel";
import { signupSource, trackCreateStep } from "@/lib/track";

/** "077 123 4567" is how most people write their number: take the 0 off for them. */
function whatsappDigits(text: string) {
  const local = text.trim().replace(/[\s-]/g, "");
  return phoneFromInput(/^0\d{9}$/.test(local) ? local.slice(1) : text);
}

/** Where the lodge is: the town feeds its copy ("Slow days in Nyanga"). */
export type CreatePlace = { town: string; country: string };

/**
 * Step 3 of 4: the lodge's name, town and WhatsApp number. No email yet: a
 * guest account is made on Next, and the demo goes live straight away in the
 * look picked on step 1, written from what step 2 said about the place. Rooms,
 * the logo and the rest come later, from the dashboard.
 */
export function LodgeStep({
  plan,
  template,
  name,
  onName,
  place,
  onPlace,
  facts,
  signedIn,
  onCreated,
  onBack,
}: {
  plan: PlanKey;
  template: TemplateKey;
  name: string;
  onName: (name: string) => void;
  place: CreatePlace;
  onPlace: (place: CreatePlace) => void;
  facts: CreateFacts;
  /** Already has an account (a guest one or a real one) */
  signedIn: boolean;
  onCreated: (lodge: Lodge | null) => void;
  onBack: () => void;
}) {
  const [whatsapp, setWhatsapp] = useState("");
  const [errors, setErrors] = useState<{ name?: string; whatsapp?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const phone = whatsappDigits(whatsapp);
    const problems = {
      name: name.trim().length < 2 ? "Add your lodge's name." : undefined,
      whatsapp: phone.error ?? (phone.digits ? undefined : "Add the number guests should message to book."),
    };
    setErrors(problems);
    if (problems.name || problems.whatsapp) return;

    setSaving(true);
    setError(null);
    if (!signedIn) {
      const guest = await authClient.signIn.anonymous();
      if (guest.error) {
        setSaving(false);
        setError(authErrorMessage(guest.error));
        return;
      }
    }
    const result = await api<Lodge>("/api/onboarding/lodge", {
      method: "POST",
      json: {
        plan,
        template,
        name: name.trim(),
        town: place.town.trim() || null,
        country: place.country.trim() || null,
        whatsapp: phone.digits,
        ...facts,
        ...signupSource(),
      },
    });
    if (result.data) {
      metaEvent("StartTrial", { value: 0, currency: "USD", predicted_ltv: PLANS[plan].price * 12, content_name: plan.toLowerCase() });
      trackCreateStep("lodge");
      metaCreateStep("lodge");
      onCreated(result.data);
      return;
    }
    // Made one already (back button, a second tab): carry on with it
    if (result.status === 409) {
      onCreated(null);
      return;
    }
    setSaving(false);
    setError(result.error);
  }

  return (
    <>
      <MiniPreview name={name} photos={[]} />
      <CreateHeading title="What's your lodge called?">
        For lodges, guesthouses, B&amp;Bs and holiday homes in Zimbabwe. Your web address is made from the name.
      </CreateHeading>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="flex flex-col gap-5">
          <FormMessage>{error}</FormMessage>
          <Field label="Lodge name" error={errors.name}>
            <Input
              value={name}
              onChange={(event) => onName(event.target.value)}
              placeholder="Mist Valley Lodge"
              autoComplete="organization"
              maxLength={80}
              autoFocus
              className="h-12 text-[16px] sm:h-12 sm:text-[15px]"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:gap-4">
            <Field label="Town or city" hint="Guests search for it, and your site mentions it.">
              <Input
                value={place.town}
                onChange={(event) => onPlace({ ...place, town: event.target.value })}
                placeholder="Nyanga"
                autoComplete="address-level2"
                maxLength={60}
                list="create-towns"
                className="h-12 text-[16px] sm:h-12 sm:text-[15px]"
              />
            </Field>
            <Field label="Country">
              <Input
                value={place.country}
                onChange={(event) => onPlace({ ...place, country: event.target.value })}
                autoComplete="country-name"
                maxLength={60}
                list="create-countries"
                className="h-12 text-[16px] sm:h-12 sm:text-[15px]"
              />
            </Field>
            <datalist id="create-towns">
              {ZIMBABWE_TOWNS.map((town) => (
                <option key={town} value={town} />
              ))}
            </datalist>
            <datalist id="create-countries">
              {COUNTRIES.map((country) => (
                <option key={country} value={country} />
              ))}
            </datalist>
          </div>
          <Field label="WhatsApp number" error={errors.whatsapp} hint="Guests tap Book and message you here.">
            <InputGroup className="h-12 sm:h-12">
              <InputGroupAddon>
                <WhatsAppIcon size={16} color="#1F7A4D" />
                {dialPrefix(whatsapp)}
              </InputGroupAddon>
              <InputGroupInput
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="77 123 4567"
                className="text-[16px] sm:text-[15px]"
              />
            </InputGroup>
          </Field>
        </fieldset>
        <CreateActions onBack={saving ? undefined : onBack} note="Free for 2 days. No card, and no email needed yet.">
          <Button type="submit" size="lg" className="w-full" loading={saving}>
            {saving ? "Making your site" : "Next: add photos"}
            {saving ? null : <ArrowRight />}
          </Button>
        </CreateActions>
        {signedIn ? null : (
          <p className="mt-4 text-center text-[13px] text-muted sm:text-left">
            Already on StayZim?{" "}
            <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
              Log in
            </Link>
          </p>
        )}
      </form>
    </>
  );
}
