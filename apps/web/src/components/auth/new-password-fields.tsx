"use client";

import { Field } from "@stayzim/ui/components/field";
import { PasswordInput } from "@stayzim/ui/components/input";
import { useId, useState } from "react";

import { PasswordStrength } from "@/components/auth/password-strength";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth-client";

/** The plain-language problem with a new password, or null when it's fine. */
export function newPasswordProblem(password: string, confirm: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return { field: "password", message: `Use at least ${MIN_PASSWORD_LENGTH} characters.` } as const;
  if (password !== confirm) return { field: "confirm", message: "The two passwords don't match." } as const;
  return null;
}

/**
 * New password with a live strength meter, then the same again to confirm.
 * Read the values from the form as `password` and `confirm`.
 */
export function NewPasswordFields({ error }: { error?: { field: "password" | "confirm"; message: string } | null }) {
  const [password, setPassword] = useState("");
  const strengthId = useId();

  return (
    <>
      <Field label="New password" error={error?.field === "password" ? error.message : undefined}>
        <PasswordInput
          name="password"
          autoComplete="new-password"
          className="sm:h-11"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-describedby={error?.field === "password" ? undefined : strengthId}
          required
        />
      </Field>
      {error?.field === "password" ? null : (
        <div className="-mt-2">
          <PasswordStrength id={strengthId} password={password} />
        </div>
      )}
      <Field label="Confirm new password" error={error?.field === "confirm" ? error.message : undefined}>
        <PasswordInput name="confirm" autoComplete="new-password" className="sm:h-11" required />
      </Field>
    </>
  );
}
