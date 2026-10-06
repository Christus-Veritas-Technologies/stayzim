"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { PasswordInput } from "@stayzim/ui/components/input";
import { Spinner } from "@stayzim/ui/components/spinner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { LivePanel, type LiveLodge } from "@/components/auth/kariba-panel";
import { NewPasswordFields, newPasswordProblem } from "@/components/auth/new-password-fields";
import { AuthHeading, AuthSection, AuthShell } from "@/components/auth/shell";
import { Item, riseIn } from "@/components/motion";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { siteHost } from "@/lib/lodge";

type Me = { lodge: { name: string; slug: string; place: string | null; heroUrl: string | null; roomCount: number } | null };

/**
 * First sign-in: swap the temporary password StayZim sent for the owner's own.
 * Later, from the account menu: change it (with the current one).
 */
export default function SetPasswordPage() {
  const router = useRouter();
  const { data: session, isPending: loadingSession, refetch } = authClient.useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<ReturnType<typeof newPasswordProblem>>(null);

  useEffect(() => {
    if (loadingSession) return;
    if (!session) router.replace("/login");
  }, [loadingSession, router, session]);

  const firstLogin = session?.user.mustChangePassword ?? true;

  // First login: show the site StayZim already built for them
  const [lodge, setLodge] = useState<LiveLodge | null>(null);
  useEffect(() => {
    if (!session || !firstLogin) return;
    void api<Me>("/api/account/me").then(({ data }) => {
      if (data?.lodge) setLodge({ ...data.lodge, siteHost: siteHost(data.lodge) });
    });
  }, [firstLogin, session]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password"));
    const problem = newPasswordProblem(newPassword, String(form.get("confirm")));
    setFieldError(problem);
    if (problem) return;

    setPending(true);
    setError(null);
    const { error: saveError } = await api("/api/account/set-password", {
      method: "POST",
      json: { newPassword, ...(firstLogin ? {} : { currentPassword: String(form.get("current")) }) },
    });
    if (saveError) {
      setError(saveError);
      setPending(false);
      return;
    }
    // The session now says mustChangePassword: false
    await refetch();
    router.replace("/dashboard");
  }

  if (loadingSession || !session) {
    return (
      <div className="flex min-h-svh items-center justify-center text-muted-2">
        <Spinner className="size-6" label="Loading" />
      </div>
    );
  }

  return (
    <AuthShell
      panel={firstLogin ? <LivePanel lodge={lodge} /> : undefined}
      mobileBadge={
        firstLogin && lodge ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
            <span className="size-1.5 rounded-full bg-[#7BE0A4]" />
            {lodge.siteHost} is live
          </span>
        ) : undefined
      }
    >
      {firstLogin ? null : (
        <Item variants={riseIn} className="mb-5">
          <Link href="/dashboard" className="group inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Back to dashboard
          </Link>
        </Item>
      )}
      <AuthHeading title={firstLogin ? "Set your password" : "Change your password"}>
        {firstLogin
          ? "First time here. Choose a password only you know."
          : "You will be logged out on your other devices."}
      </AuthHeading>

      <AuthSection>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormMessage>{error}</FormMessage>
          {firstLogin ? null : (
            <Field label="Current password">
              <PasswordInput name="current" autoComplete="current-password" className="sm:h-11" required />
            </Field>
          )}
          <NewPasswordFields error={fieldError} />
          <Button type="submit" size="lg" className="group mt-2 w-full" loading={pending}>
            {pending ? "Saving" : firstLogin ? "Save and open dashboard" : "Save password"}
            {firstLogin ? <ArrowRight className="transition-transform group-hover:translate-x-0.5" /> : null}
          </Button>
        </form>
      </AuthSection>
    </AuthShell>
  );
}
