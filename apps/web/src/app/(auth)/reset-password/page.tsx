"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { FormMessage } from "@stayzim/ui/components/field";
import { motion } from "framer-motion";
import { CircleCheck, Clock } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

import { NewPasswordFields, newPasswordProblem } from "@/components/auth/new-password-fields";
import { AuthHeading, AuthSection, AuthShell } from "@/components/auth/shell";
import { authClient, authErrorMessage } from "@/lib/auth-client";

function StatusIcon({ tone, children }: { tone: "success" | "warning"; children: React.ReactNode }) {
  return (
    <motion.span
      className={
        tone === "success"
          ? "flex size-12 items-center justify-center rounded-[14px] border border-success-line bg-success-tint text-success"
          : "flex size-12 items-center justify-center rounded-[14px] border border-warning-line bg-warning-tint text-warning"
      }
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
    >
      {children}
    </motion.span>
  );
}

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
  const [fieldError, setFieldError] = useState<ReturnType<typeof newPasswordProblem>>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const problem = newPasswordProblem(password, String(form.get("confirm")));
    setFieldError(problem);
    if (problem) return;

    setPending(true);
    setError(null);
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
      <AuthShell>
        <AuthHeading
          title="This link has expired"
          icon={
            <StatusIcon tone="warning">
              <Clock className="size-[22px]" strokeWidth={1.75} />
            </StatusIcon>
          }
        >
          Reset links work for 1 hour and only once. Ask for a new one and use the newest email.
        </AuthHeading>
        <AuthSection>
          <Link href="/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Send a new link
          </Link>
        </AuthSection>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell>
        <AuthHeading
          title="Password changed"
          icon={
            <StatusIcon tone="success">
              <CircleCheck className="size-[22px]" strokeWidth={1.75} />
            </StatusIcon>
          }
        >
          You were logged out on every device. Log in with your new password.
        </AuthHeading>
        <AuthSection>
          <Link href="/login" className={buttonVariants({ size: "lg", className: "w-full" })}>
            Log in
          </Link>
        </AuthSection>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <AuthHeading title="Set a new password">You will use it to log in from now on.</AuthHeading>
      <AuthSection>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormMessage>{error}</FormMessage>
          <NewPasswordFields error={fieldError} />
          <Button type="submit" size="lg" className="mt-2 w-full" loading={pending}>
            {pending ? "Saving" : "Save new password"}
          </Button>
        </form>
      </AuthSection>
    </AuthShell>
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
