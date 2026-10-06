"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { motion } from "framer-motion";
import { Check, Info, Mail } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { AuthHeading, AuthSection, AuthShell, BackToLogin } from "@/components/auth/shell";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { whatsappUrl } from "@/lib/whatsapp";

/** Envelope tile with a green tick that pops in. */
function SentIcon() {
  return (
    <span className="relative flex size-12 items-center justify-center rounded-[14px] border border-[#cbe9f5] bg-brand-wash text-brand">
      <Mail className="size-[22px]" strokeWidth={1.75} />
      <motion.span
        className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-success text-white"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.35 }}
      >
        <Check className="size-3" strokeWidth={3} />
      </motion.span>
    </span>
  );
}

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
      <AuthShell>
        <AuthHeading title="Check your email" icon={<SentIcon />}>
          If <strong className="font-semibold text-ink">{sentTo}</strong> has a StayZim account, a reset link is on its
          way. It works for 1 hour.
        </AuthHeading>
        <AuthSection className="flex flex-col gap-4">
          <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
            Back to log in
          </Link>
          <FormMessage tone="info">
            <Info className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              No email after 5 minutes? Check your spam folder, or{" "}
              <a href={whatsappUrl("login")} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:text-brand-dark">
                message us on WhatsApp
              </a>
              .
            </span>
          </FormMessage>
        </AuthSection>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <BackToLogin />
      <AuthHeading title="Reset your password">
        Enter the email you log in with. We will send you a link to set a new one.
      </AuthHeading>

      <AuthSection>
        <form onSubmit={onSubmit} noValidate>
          <fieldset disabled={pending} className="flex flex-col gap-4">
            <FormMessage>{error}</FormMessage>
            <Field label="Email">
              <Input name="email" type="email" autoComplete="email" inputMode="email" className="sm:h-11" required />
            </Field>
            <div className="mt-2 flex flex-col gap-3">
              <Button type="submit" size="lg" className="w-full" loading={pending}>
                {pending ? "Sending link" : "Send reset link"}
              </Button>
              <p className="text-center text-[12.5px] text-muted-2">The link works for 1 hour.</p>
            </div>
          </fieldset>
        </form>
      </AuthSection>
    </AuthShell>
  );
}
