"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field, FormError, SubmitButton } from "@/components/auth/form";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);

    const { data, error: signInError } = await authClient.signIn.email({
      email: String(form.get("email")).trim(),
      password: String(form.get("password")),
      // Stay signed in on this phone (30 days)
      rememberMe: true,
    });

    if (signInError || !data) {
      setError(authErrorMessage(signInError));
      setPending(false);
      return;
    }
    // Accounts start with a temporary password; the owner picks their own first
    router.replace(data.user.mustChangePassword ? "/set-password" : "/dashboard");
  }

  return (
    <>
      <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Log in</h1>
      <p className="mt-1.5 text-muted">Manage your lodge site.</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <FormError message={error} />
        <Field label="Email" name="email" type="email" autoComplete="email" inputMode="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <div className="-mt-1 flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-brand hover:text-brand-dark">
            Forgot password?
          </Link>
        </div>
        <SubmitButton pending={pending}>{pending ? "Logging in" : "Log in"}</SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted-2">
        New to StayZim?{" "}
        <Link href="/#pricing" className="font-semibold text-brand hover:text-brand-dark">
          Start your free trial
        </Link>
      </p>
    </>
  );
}
