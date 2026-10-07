"use client";

import { Button } from "@stayzim/ui/components/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";

/** Google's "G", in its four colours. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.02c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.11A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.28a7.2 7.2 0 0 1 0-4.56V6.61H1.28a12 12 0 0 0 0 10.78l4.01-3.11Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.11C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}

let cachedEnabled: boolean | null = null;

/**
 * "Continue with Google", shown only when the server has Google set up. It
 * signs in the owner with that Google email, or creates their account (a new
 * owner goes on to `newUserPath`, /create). From a guest account it claims the
 * guest's site. Errors come back to
 * `errorPath` as `?error=…`.
 */
export function GoogleSignIn({
  disabled = false,
  onStart,
  callbackPath = "/dashboard",
  newUserPath = "/create",
  errorPath = "/login",
}: {
  disabled?: boolean;
  onStart?: () => void;
  /** Where an existing account lands */
  callbackPath?: string;
  /** Where a new account lands: /create makes its lodge */
  newUserPath?: string;
  errorPath?: string;
}) {
  const [enabled, setEnabled] = useState(cachedEnabled);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (cachedEnabled !== null) return;
    void api<{ google: boolean }>("/api/account/sign-in-options").then(({ data }) => {
      cachedEnabled = data?.google ?? false;
      setEnabled(cachedEnabled);
    });
  }, []);

  if (!enabled) return null;

  async function start() {
    setPending(true);
    onStart?.();
    const origin = window.location.origin;
    const { error } = await authClient.signIn.social({
      provider: "google",
      // No account for this Google email yet: make one (from the login screen too)
      requestSignUp: true,
      callbackURL: `${origin}${callbackPath}`,
      newUserCallbackURL: `${origin}${newUserPath}`,
      errorCallbackURL: `${origin}${errorPath}`,
    });
    // On success the browser is already on its way to Google
    if (error) {
      setPending(false);
      window.location.assign(`${errorPath}${errorPath.includes("?") ? "&" : "?"}error=${encodeURIComponent(error.code ?? "google")}`);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
      <div className="flex items-center gap-3 text-[12.5px] text-muted-2" aria-hidden="true">
        <span className="h-px flex-1 bg-line-3" />
        or
        <span className="h-px flex-1 bg-line-3" />
      </div>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={start} loading={pending} disabled={disabled}>
        {pending ? null : <GoogleLogo />}
        {pending ? "Opening Google" : "Continue with Google"}
      </Button>
    </motion.div>
  );
}
