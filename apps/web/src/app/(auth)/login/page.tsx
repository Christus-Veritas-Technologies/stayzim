"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, PasswordInput } from "@stayzim/ui/components/input";
import { Separator } from "@stayzim/ui/components/separator";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { AuthHeading, AuthSection, AuthShell, NewToStayZim } from "@/components/auth/shell";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending(true);
    setError(null);

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
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
    <AuthShell mobileFooter={<NewToStayZim />}>
      <AuthHeading title="Welcome back">Log in to manage your lodge site.</AuthHeading>

      <AuthSection>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormMessage>{error}</FormMessage>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@yourlodge.co.zw"
              className="sm:h-11"
              required
            />
          </Field>
          <Field
            label="Password"
            action={
              <Link href="/forgot-password" className="text-[13px] font-semibold text-brand hover:text-brand-dark">
                Forgot password?
              </Link>
            }
          >
            <PasswordInput name="password" autoComplete="current-password" className="sm:h-11" required />
          </Field>
          <div className="mt-2 flex flex-col gap-3">
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              {pending ? "Logging in" : "Log in"}
            </Button>
            <p className="text-center text-[12.5px] text-muted-2">You stay logged in for 30 days on this device.</p>
          </div>
        </form>
      </AuthSection>

      <AuthSection className="hidden flex-col gap-5 text-center lg:flex">
        <Separator />
        <NewToStayZim />
      </AuthSection>
    </AuthShell>
  );
}
