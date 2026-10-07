"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { CreateHeading } from "@/components/create/frame";
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

/**
 * Step 1 of 2: the lodge's name and WhatsApp number, nothing else. No email
 * yet: a guest account is made on Next, and the demo goes live straight away.
 * The town, rooms, logo and the rest come later, from the dashboard.
 */
export function LodgeStep({
  plan,
  name,
  onName,
  signedIn,
  onCreated,
}: {
  plan: PlanKey;
  name: string;
  onName: (name: string) => void;
  /** Already has an account (a guest one or a real one) */
  signedIn: boolean;
  onCreated: (lodge: Lodge | null) => void;
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
      json: { plan, name: name.trim(), whatsapp: phone.digits, ...signupSource() },
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
      <CreateHeading title="Let's make your lodge's website">
        For lodges, guesthouses, B&amp;Bs and holiday homes in Zimbabwe. Two quick steps, and it&apos;s live.
      </CreateHeading>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="flex flex-col gap-4">
          <FormMessage>{error}</FormMessage>
          <Field label="Lodge name" error={errors.name}>
            <Input
              value={name}
              onChange={(event) => onName(event.target.value)}
              placeholder="Mist Valley Lodge"
              autoComplete="organization"
              maxLength={80}
              autoFocus
              className="sm:h-11"
            />
          </Field>
          <Field label="WhatsApp number" error={errors.whatsapp} hint="Guests tap Book and message you here.">
            <InputGroup className="sm:h-11">
              <InputGroupAddon>
                <WhatsAppIcon size={15} color="#1F7A4D" />
                {dialPrefix(whatsapp)}
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
          <Button type="submit" size="lg" className="mt-1 w-full" loading={saving}>
            {saving ? "Making your site" : "Next: add photos"}
            {saving ? null : <ArrowRight />}
          </Button>
          <p className="text-center text-[12.5px] leading-[18px] text-muted-2">Free for 2 days. No card, and no email needed yet.</p>
          {signedIn ? null : (
            <p className="text-center text-[13px] text-muted">
              Already on StayZim?{" "}
              <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
                Log in
              </Link>
            </p>
          )}
        </fieldset>
      </form>
    </>
  );
}
