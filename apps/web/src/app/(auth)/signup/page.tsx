"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, PasswordInput } from "@stayzim/ui/components/input";
import { Separator } from "@stayzim/ui/components/separator";
import { Spinner } from "@stayzim/ui/components/spinner";
import { CircleCheck } from "lucide-react";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { GoogleSignIn } from "@/components/auth/google-button";
import { AuthHeading, AuthSection, AuthShell, HaveAnAccount } from "@/components/auth/shell";
import { planFromParam, PlanPicker } from "@/components/plan-picker";
import { authClient, authErrorMessage, MIN_PASSWORD_LENGTH, oauthErrorMessage } from "@/lib/auth-client";
import { metaEvent } from "@/lib/meta-pixel";
import type { PlanKey } from "@/lib/lodge";

const PROMISES = ["Live in 5 minutes", "Free for 2 days", "No card needed"];

/**
 * Sign-up, the first stop from the ads and the landing page (?plan=growth).
 * Name, email and password (or Google), then /start builds the lodge's site.
 */
function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [plan, setPlan] = useState<PlanKey>(() => planFromParam(params.get("plan")));
  const [pending, setPending] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState<string | null>(() => oauthErrorMessage(params.get("error")));
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const { data: session } = authClient.useSession();
  const next = `/start?plan=${plan.toLowerCase()}` as Route;

  // Already signed in (back button, a second tab): carry on where they were
  useEffect(() => {
    if (session && pending === null) router.replace(next);
  }, [router, session, pending, next]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    const problems = {
      name: name.length < 2 ? "Enter your name." : undefined,
      email: /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? undefined : "Enter your email address.",
      password: password.length < MIN_PASSWORD_LENGTH ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined,
    };
    setErrors(problems);
    if (problems.name || problems.email || problems.password) return;

    setPending("password");
    setError(null);
    const { error: signUpError } = await authClient.signUp.email({ name, email, password });
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      setPending(null);
      return;
    }
    metaEvent("CompleteRegistration", { content_name: plan.toLowerCase() });
    router.replace(next);
  }

  if (session && pending === null) {
    return (
      <AuthShell>
        <AuthHeading title="You're signed in">
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4 text-brand" />
            Opening StayZim…
          </span>
        </AuthHeading>
      </AuthShell>
    );
  }

  return (
    <AuthShell mobileFooter={<HaveAnAccount />}>
      <AuthHeading title="Your lodge online in 5 minutes">Your own website with rooms, photos and a Book on WhatsApp button.</AuthHeading>

      <AuthSection>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] font-medium text-slate">
          {PROMISES.map((promise) => (
            <li key={promise} className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-4 text-success" />
              {promise}
            </li>
          ))}
        </ul>
      </AuthSection>

      <AuthSection className="flex flex-col gap-4">
        <form onSubmit={onSubmit} noValidate>
          <fieldset disabled={pending !== null} className="flex flex-col gap-4">
            <FormMessage>{error}</FormMessage>
            <Field label="Plan" hint="Try any plan free for 2 days. You can change it when you pay.">
              <PlanPicker value={plan} onChange={setPlan} disabled={pending !== null} />
            </Field>
            <Field label="Your name" error={errors.name}>
              <Input name="name" autoComplete="name" placeholder="Rudo Moyo" className="sm:h-11" required />
            </Field>
            <Field label="Email" error={errors.email}>
              <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@yourlodge.co.zw" className="sm:h-11" required />
            </Field>
            <Field label="Password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
              <PasswordInput name="password" autoComplete="new-password" className="sm:h-11" required />
            </Field>
            <Button type="submit" size="lg" className="mt-2 w-full" loading={pending === "password"}>
              {pending === "password" ? "Creating your account" : "Create my free demo"}
            </Button>
          </fieldset>
        </form>
        <GoogleSignIn disabled={pending === "password"} onStart={() => setPending("google")} newUserPath={next} errorPath="/signup" />
        <p className="text-center text-[12px] leading-[18px] text-muted-2">
          By signing up you agree to our{" "}
          <a href="/terms" className="font-semibold text-muted hover:text-ink">
            Terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="font-semibold text-muted hover:text-ink">
            Privacy notice
          </a>
          .
        </p>
      </AuthSection>

      <AuthSection className="hidden flex-col gap-5 text-center lg:flex">
        <Separator />
        <HaveAnAccount />
      </AuthSection>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
