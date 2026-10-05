"use client";

import { MailCheck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Field, FormError, SubmitButton } from "@/components/auth/form";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    if (!email) {
      setError("Enter the email you log in with.");
      return;
    }
    setPending(true);
    setError(null);

    const { error: resetError } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setPending(false);
    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    // Same screen whether or not the email has an account
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <>
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-tint text-brand">
          <MailCheck size={24} strokeWidth={1.5} />
        </span>
        <h1 className="mt-4 font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Check your email</h1>
        <p className="mt-2 text-muted">
          If <strong className="font-semibold text-ink">{sentTo}</strong> has a StayZim account, we sent it a link to choose
          a new password. The link works for 1 hour.
        </p>
        <p className="mt-4 text-sm text-muted-2">
          Nothing after a few minutes? Check your spam folder, or message us on WhatsApp and we&apos;ll help.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md border border-line-2 bg-white font-semibold text-ink hover:border-muted-2"
        >
          Back to log in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Forgot your password?</h1>
      <p className="mt-1.5 text-muted">Enter the email you log in with. We&apos;ll send you a link to choose a new one.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
        <SubmitButton pending={pending}>{pending ? "Sending link" : "Send reset link"}</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand hover:text-brand-dark">
          Back to log in
        </Link>
      </p>
    </>
  );
}
