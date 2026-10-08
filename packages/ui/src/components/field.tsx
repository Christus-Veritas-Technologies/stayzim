"use client";

import { InfoTip } from "@stayzim/ui/components/info-tip";
import { Label } from "@stayzim/ui/components/label";
import { cn } from "@stayzim/ui/lib/utils";
import { CircleAlertIcon } from "lucide-react";
import * as React from "react";

type FieldContextValue = {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

/**
 * Props for the control inside a <Field>: its id (so the label points at it),
 * the hint or error it is described by, and its invalid state. Explicit props win.
 */
function useFieldControl<T extends { id?: string; "aria-describedby"?: string; "aria-invalid"?: unknown; required?: boolean }>(
  props: T,
): T {
  const field = React.useContext(FieldContext);
  if (!field) return props;
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-describedby": props["aria-describedby"] ?? field.describedBy,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    required: props.required ?? (field.required || undefined),
  };
}

type FieldProps = Omit<React.ComponentProps<"div">, "children"> & {
  label: React.ReactNode;
  /** Help under the control. Replaced by `error` when there is one. */
  hint?: React.ReactNode;
  error?: React.ReactNode;
  /** A sentence or two behind a "?" beside the label, for fields whose name doesn't explain them */
  help?: React.ReactNode;
  /** Shown at the right of the label, e.g. a "Forgot password?" link */
  action?: React.ReactNode;
  /** Character count at the right of the label, e.g. 118 / 300 */
  count?: { value: number; max: number };
  required?: boolean;
  /** Pass a fixed id when the control needs one (otherwise one is generated) */
  controlId?: string;
  children: React.ReactNode;
};

/** A label, one control, and its hint or error. The control picks up the wiring from context. */
function Field({ label, hint, help, error, action, count, required = false, controlId, className, children, ...props }: FieldProps) {
  const generatedId = React.useId();
  const id = controlId ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const invalid = Boolean(error);
  const describedBy = invalid ? errorId : hint ? hintId : undefined;
  const over = count ? count.value > count.max : false;

  return (
    <FieldContext.Provider value={{ id, describedBy, invalid, required }}>
      <div data-slot="field" data-invalid={invalid || undefined} className={cn("flex flex-col gap-1.5", className)} {...props}>
        <div className="flex min-h-5 items-center justify-between gap-3">
          {help ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Label htmlFor={id}>{label}</Label>
              <InfoTip>{help}</InfoTip>
            </span>
          ) : (
            <Label htmlFor={id}>{label}</Label>
          )}
          {action}
          {count ? (
            <span className={cn("text-xs tabular-nums text-muted-foreground", over && "font-semibold text-destructive")}>
              {count.value} / {count.max}
            </span>
          ) : null}
        </div>
        {children}
        {invalid ? (
          <p id={errorId} className="flex items-start gap-1.5 text-[13px] leading-5 text-destructive animate-in fade-in-0 slide-in-from-top-1">
            <CircleAlertIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className="text-[13px] leading-5 text-muted-2">
            {hint}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

/** Form-level message, e.g. "Email or password is wrong". Announced to screen readers. */
function FormMessage({
  tone = "error",
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { tone?: "error" | "success" | "info" }) {
  if (!children) return null;
  return (
    <div
      data-slot="form-message"
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-[10px] border px-3.5 py-3 text-sm leading-5 animate-in fade-in-0 slide-in-from-top-1",
        tone === "error" && "border-danger-line bg-danger-tint text-danger",
        tone === "success" && "border-success-line bg-success-tint text-success",
        tone === "info" && "border-line bg-surface text-muted",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Field, FormMessage, useFieldControl };
