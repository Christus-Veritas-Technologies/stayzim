"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Field, FormError, SubmitButton } from "@/components/auth/form";
import { apiPost, authClient, MIN_PASSWORD_LENGTH } from "@/lib/auth-client";

/** First sign-in: swap the temporary password StayZim sent for the owner's own. */
export default function SetPasswordPage() {
  const router = useRouter();
  const { data: session, isPending: loadingSession, refetch } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingSession) return;
    if (!session) router.replace("/login");
  }, [loadingSession, router, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("current"));
    const newPassword = String(form.get("password"));
    const confirm = String(form.get("confirm"));

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setFieldError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirm) {
      setFieldError("The two passwords don't match.");
      return;
    }

    setPending(true);
    setError(null);
    setFieldError(null);
    const { error: saveError } = await apiPost("/api/account/set-password", { currentPassword, newPassword });
    if (saveError) {
      setError(saveError);
      setPending(false);
      return;
    }
    // The session now says mustChangePassword: false
    await refetch();
    router.replace("/dashboard");
  }

  const firstLogin = session?.user.mustChangePassword ?? true;

  return (
    <>
      <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">
        {firstLogin ? "Choose your own password" : "Change your password"}
      </h1>
      <p className="mt-1.5 text-muted">
        {firstLogin
          ? "You logged in with a temporary password. Choose one only you know before you continue."
          : "You'll be signed out on your other devices."}
      </p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <Field
          label={firstLogin ? "Temporary password" : "Current password"}
          name="current"
          type="password"
          autoComplete="current-password"
          required
        />
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
        <SubmitButton pending={pending}>{pending ? "Saving" : "Save password"}</SubmitButton>
      </form>
    </>
  );
}
