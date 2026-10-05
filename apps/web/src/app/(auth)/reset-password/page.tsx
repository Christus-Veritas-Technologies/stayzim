"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { Field, FormError, SubmitButton } from "@/components/auth/form";
import { authClient, authErrorMessage, MIN_PASSWORD_LENGTH } from "@/lib/auth-client";

/**
 * Opened from the reset email. better-auth checks the link first, then
 * redirects here with `?token=…`, or `?error=INVALID_TOKEN` if it expired.
 */
function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const linkError = params.get("error");

  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setFieldError("The two passwords don't match.");
      return;
    }

    setPending(true);
    setError(null);
    setFieldError(null);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token ?? "" });
    setPending(false);

    if (resetError) {
      setError(authErrorMessage(resetError));
      return;
    }
    setDone(true);
  }

  if (!token || linkError) {
    return (
      <>
        <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">This link has expired</h1>
        <p className="mt-2 text-muted">
          Reset links work for 1 hour and only once. Ask for a new one and use the newest email.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand font-semibold text-white hover:bg-brand-dark"
        >
          Send a new link
        </Link>
      </>
    );
  }

  if (done) {
    return (
      <>
        <span className="flex size-12 items-center justify-center rounded-full bg-[#E3F2EA] text-[#1F7A4D]">
          <CircleCheck size={24} strokeWidth={1.5} />
        </span>
        <h1 className="mt-4 font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Password changed</h1>
        <p className="mt-2 text-muted">You were signed out on every device. Log in with your new password.</p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-brand font-semibold text-white hover:bg-brand-dark"
        >
          Log in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Choose a new password</h1>
      <p className="mt-1.5 text-muted">You&apos;ll use it to log in from now on.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
          error={fieldError ?? undefined}
          required
        />
        <Field label="Type it again" name="confirm" type="password" autoComplete="new-password" required />
        <SubmitButton pending={pending}>{pending ? "Saving" : "Save new password"}</SubmitButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  // useSearchParams needs a Suspense boundary to be statically rendered
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
