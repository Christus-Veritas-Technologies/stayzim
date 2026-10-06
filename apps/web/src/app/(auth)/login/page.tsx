"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, PasswordInput } from "@stayzim/ui/components/input";
import { Separator } from "@stayzim/ui/components/separator";
import { Spinner } from "@stayzim/ui/components/spinner";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { GoogleSignIn } from "@/components/auth/google-button";
import { AuthHeading, AuthSection, AuthShell, NewToStayZim } from "@/components/auth/shell";
import { authClient, authErrorMessage, oauthErrorMessage } from "@/lib/auth-client";

/** Where an account lands after logging in: its own password first, then the team's screens or the dashboard. */
function homeFor(user: { mustChangePassword?: boolean | null; role?: string | null }) {
  if (user.mustChangePassword) return "/set-password";
  return user.role === "ADMIN" ? "/admin/requests" : "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState<"password" | "google" | null>(null);
  // Google sends people back here with ?error=… when it can't sign them in
  const [error, setError] = useState<string | null>(() => oauthErrorMessage(params.get("error")));
  const { data: session } = authClient.useSession();

  // Already logged in on this device (e.g. a bookmarked login page): skip the form
  useEffect(() => {
    if (session) router.replace(homeFor(session.user));
  }, [router, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    setPending("password");
    setError(null);

    const { data, error: signInError } = await authClient.signIn.email({
      email,
      password,
      // Stay signed in on this phone (30 days)
      rememberMe: true,
    });

    if (signInError || !data) {
      setError(authErrorMessage(signInError));
      setPending(null);
      return;
    }
    // Accounts start with a temporary password; the owner picks their own first
    router.replace(homeFor(data.user));
  }

  if (session && pending === null) {
    return (
      <AuthShell>
        <AuthHeading title="You're logged in">
          <span className="inline-flex items-center gap-2">
            <Spinner className="size-4 text-brand" />
            Opening StayZim…
          </span>
        </AuthHeading>
      </AuthShell>
    );
  }

  return (
    <AuthShell mobileFooter={<NewToStayZim />}>
      <AuthHeading title="Welcome back">Log in to manage your lodge site.</AuthHeading>

      <AuthSection className="flex flex-col gap-4">
        <form onSubmit={onSubmit} noValidate>
          {/* Locked while signing in, so a second tap can't send it twice */}
          <fieldset disabled={pending !== null} className="flex flex-col gap-4">
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
              <Button type="submit" size="lg" className="w-full" loading={pending === "password"}>
                {pending === "password" ? "Logging in" : "Log in"}
              </Button>
              <p className="text-center text-[12.5px] text-muted-2">You stay logged in for 30 days on this device.</p>
            </div>
          </fieldset>
        </form>
        <GoogleSignIn disabled={pending === "password"} onStart={() => setPending("google")} />
      </AuthSection>

      <AuthSection className="hidden flex-col gap-5 text-center lg:flex">
        <Separator />
        <NewToStayZim />
      </AuthSection>
    </AuthShell>
  );
}

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary to be statically rendered
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
