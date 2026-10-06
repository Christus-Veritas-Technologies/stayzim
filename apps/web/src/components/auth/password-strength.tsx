"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { CircleCheck, Circle } from "lucide-react";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth-client";

/** 0–4: long enough, then a point each for 12+ characters, mixed case, and a digit or symbol. */
export function passwordScore(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) return password.length > 0 ? 1 : 0;
  let score = 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[\d\W_]/.test(password)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ["", "Too short", "Okay", "Good", "Strong"];

/** Four bars that fill as the password gets stronger, and the one rule that matters. */
export function PasswordStrength({ password, id }: { password: string; id?: string }) {
  const score = passwordScore(password);
  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const tone = !longEnough ? "bg-destructive" : score >= 3 ? "bg-success" : "bg-brand";

  return (
    <div id={id} className="flex flex-col gap-2" aria-live="polite">
      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((step) => (
          <span key={step} className="h-1 overflow-hidden rounded-full bg-line-3">
            <span
              className={cn(
                "block h-full origin-left rounded-full transition-transform duration-300 ease-out motion-reduce:transition-none",
                tone,
                score >= step ? "scale-x-100" : "scale-x-0",
              )}
            />
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between text-[12.5px]">
        <span className={cn("inline-flex items-center gap-1.5 transition-colors", longEnough ? "text-success" : "text-muted-2")}>
          {longEnough ? <CircleCheck className="size-3.5" /> : <Circle className="size-3.5" />}
          {MIN_PASSWORD_LENGTH} or more characters
        </span>
        {password ? <span className="font-semibold text-muted-2">{LABELS[score]}</span> : null}
      </div>
    </div>
  );
}
