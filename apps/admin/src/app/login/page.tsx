"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, PasswordInput } from "@stayzim/ui/components/input";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Wordmark } from "@/components/brand";
import { EASE_OUT } from "@/components/motion";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { env } from "@/lib/public-env";

/** The team's sign-in: the same StayZim login as the web app. */
export default function LoginPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) router.replace("/");
  }, [router, session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error: signInError } = await authClient.signIn.email({ email: email.trim(), password });
    setPending(false);
    if (signInError) setError(authErrorMessage(signInError));
    else router.replace("/");
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-surface-2 px-4 py-10">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
        className="flex w-full max-w-[400px] flex-col gap-5 rounded-[24px] bg-white p-6 shadow-card sm:p-8"
      >
        <div className="flex flex-col gap-3">
          <span className="text-[19px] text-ink">
            <Wordmark size={32} />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl leading-8 font-semibold tracking-[-0.02em]">StayZim admin</h1>
            <p className="text-[13.5px] text-muted">For the StayZim team. Log in with your team account.</p>
          </div>
        </div>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Field label="Password" action={<a href={`${env.NEXT_PUBLIC_WEB_URL}/forgot-password`} className="text-[13px] font-semibold text-brand hover:text-brand-dark">Forgot password?</a>}>
          <PasswordInput autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </Field>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Logging in" : "Log in"}
        </Button>
      </motion.form>
    </main>
  );
}
