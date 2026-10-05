"use client";

import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

/** Input with its label above and help or error text below, 48px tall for thumbs. */
export function Field({
  label,
  hint,
  error,
  type = "text",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && show ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`h-12 w-full rounded-md border bg-white px-3.5 text-base text-ink outline-none transition-[border-color,box-shadow] placeholder:text-soft focus:border-brand focus:shadow-[0_0_0_3px_rgba(0,125,162,0.15)] ${
            isPassword ? "pr-12" : ""
          } ${error ? "border-[#B42318]" : "border-line-2"}`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((value) => !value)}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-md text-muted-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-purple"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={19} strokeWidth={1.5} /> : <Eye size={19} strokeWidth={1.5} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-[#B42318]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-2">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** The one main action on the screen. Shows a spinner inside while working. */
export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand px-5 text-base font-semibold text-white transition-colors hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple disabled:cursor-not-allowed disabled:opacity-80"
    >
      {pending ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

/** Form-level error, e.g. wrong password. Announced to screen readers. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-md border border-[#F4C7C3] bg-[#FEF3F2] px-3.5 py-3 text-sm text-[#B42318]">
      {message}
    </div>
  );
}
