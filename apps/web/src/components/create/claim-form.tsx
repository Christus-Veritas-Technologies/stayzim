"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, PasswordInput } from "@stayzim/ui/components/input";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { GoogleSignIn } from "@/components/auth/google-button";
import { api } from "@/lib/api";
import { authClient, authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-client";
import { metaEvent } from "@/lib/meta-pixel";
import { trackCreateStep } from "@/lib/track";

/** After a claim (here, or back from Google with ?claimed=1): the welcome email, the funnel's last step. */
export async function afterClaim() {
  await api("/api/onboarding/claimed", { method: "POST" });
  trackCreateStep("claim");
  metaEvent("CompleteRegistration", { content_name: "claim" });
}

/**
 * "Claim my site": the guest account from /create gets an email and password
 * (or Google), so the owner can log in from any phone and receive invoices.
 * The site, photos and everything else stay as they are.
 */
export function ClaimForm({ onClaimed }: { onClaimed: (email: string) => void }) {
  const [pending, setPending] = useState<"password" | "google" | null>(null);
  const [error, setError] = useState<{ text: string; exists?: boolean } | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

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
      const exists = signUpError.code === "USER_ALREADY_EXISTS" || signUpError.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL";
      setError({ text: exists ? "There's already a StayZim account with this email." : authErrorMessage(signUpError), exists });
      setPending(null);
      return;
    }
    await afterClaim();
    onClaimed(email);
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={pending !== null} className="flex flex-col gap-3.5">
          {error ? (
            <FormMessage>
              {error.text}{" "}
              {error.exists ? (
                <Link href="/login" className="font-semibold underline">
                  Log in with it instead
                </Link>
              ) : null}
            </FormMessage>
          ) : null}
          <Field label="Your name" error={errors.name}>
            <Input name="name" autoComplete="name" placeholder="Rudo Moyo" required />
          </Field>
          <Field label="Email" error={errors.email} hint="Your invoices and receipts go here.">
            <Input name="email" type="email" autoComplete="email" inputMode="email" placeholder="you@yourlodge.co.zw" required />
          </Field>
          <Field label="Password" error={errors.password} hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
            <PasswordInput name="password" autoComplete="new-password" required />
          </Field>
          <Button type="submit" size="lg" className="mt-1 w-full" loading={pending === "password"}>
            {pending === "password" ? "Saving" : "Claim my site"}
          </Button>
        </fieldset>
      </form>
      <GoogleSignIn
        disabled={pending === "password"}
        onStart={() => setPending("google")}
        callbackPath="/dashboard?claimed=1"
        newUserPath="/dashboard?claimed=1"
        errorPath="/dashboard"
      />
      <p className="text-center text-[12px] leading-[18px] text-muted-2">
        By claiming your site you agree to our{" "}
        <a href="/terms" className="font-semibold text-muted hover:text-ink">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="font-semibold text-muted hover:text-ink">
          Privacy notice
        </a>
        .
      </p>
    </div>
  );
}
