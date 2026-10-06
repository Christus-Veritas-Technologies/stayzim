"use client";

import { useFieldControl } from "@stayzim/ui/components/field";
import { cn } from "@stayzim/ui/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import * as React from "react";

/*
 * Inputs sit on a faint blue-grey fill and turn white with a Jacaranda ring on
 * focus. Text is 16px on phones so iOS doesn't zoom in, 14px from `sm` up.
 */
const fieldSurface =
  "rounded-[10px] border border-input bg-field text-base text-ink shadow-[0_1px_2px_rgba(12,24,31,0.04)] transition-[background-color,border-color,box-shadow] duration-150 sm:text-sm";
const fieldFocus = "focus-visible:border-ring focus-visible:bg-white focus-visible:ring-3 focus-visible:ring-ring/20";
const fieldInvalid =
  "aria-invalid:border-destructive aria-invalid:bg-white aria-invalid:focus-visible:ring-destructive/15";

function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  const controlProps = useFieldControl(props);
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        fieldSurface,
        fieldFocus,
        fieldInvalid,
        "h-11 w-full min-w-0 px-3 outline-none placeholder:text-soft disabled:cursor-not-allowed disabled:opacity-60 sm:h-10",
        "file:mr-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold",
        className,
      )}
      {...controlProps}
    />
  );
}

/** An input with fixed text or icons beside it, e.g. "$ 95 / night" or "+263 77…". */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        fieldSurface,
        "flex h-11 w-full min-w-0 items-center overflow-hidden sm:h-10",
        "has-[input:focus-visible]:border-ring has-[input:focus-visible]:bg-white has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/20",
        "has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:bg-white",
        "has-[input:disabled]:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupAddon({
  className,
  align = "start",
  ...props
}: React.ComponentProps<"div"> & { align?: "start" | "end" }) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "flex h-full shrink-0 items-center gap-1.5 text-sm text-muted-2 select-none [&_svg:not([class*='size-'])]:size-4",
        align === "start" ? "pl-3" : "pr-3",
        className,
      )}
      {...props}
    />
  );
}

function InputGroupInput({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  const controlProps = useFieldControl(props);
  return (
    <input
      type={type}
      data-slot="input-group-input"
      className={cn(
        "h-full w-full min-w-0 flex-1 bg-transparent px-3 text-base text-ink outline-none placeholder:text-soft disabled:cursor-not-allowed sm:text-sm",
        "[[data-align=start]+&]:pl-2 [&:has(+[data-align=end])]:pr-2",
        className,
      )}
      {...controlProps}
    />
  );
}

/** Password input with a show/hide toggle, so owners can check what they typed on a phone. */
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const [visible, setVisible] = React.useState(false);
  return (
    <InputGroup className={className}>
      <InputGroupInput type={visible ? "text" : "password"} className="tracking-normal" {...props} />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="flex h-full w-11 shrink-0 items-center justify-center text-muted-2 transition-colors outline-none hover:text-ink focus-visible:text-purple"
      >
        {visible ? <EyeOffIcon className="size-[18px]" strokeWidth={1.75} /> : <EyeIcon className="size-[18px]" strokeWidth={1.75} />}
      </button>
    </InputGroup>
  );
}

export { Input, InputGroup, InputGroupAddon, InputGroupInput, PasswordInput, fieldFocus, fieldInvalid, fieldSurface };
