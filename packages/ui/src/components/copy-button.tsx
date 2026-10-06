"use client";

import { Button, type ButtonProps } from "@stayzim/ui/components/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import * as React from "react";

/** Copies `value` and swaps its icon for a tick for two seconds. */
function CopyButton({
  value,
  onCopied,
  children,
  copiedLabel = "Copied",
  variant = "outline",
  ...props
}: Omit<ButtonProps, "value" | "onClick"> & {
  value: string;
  onCopied?: () => void;
  /** Replaces the label while the tick shows. Icon-only buttons keep no label. */
  copiedLabel?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Older phone browsers: copy through a hidden text box
      const box = document.createElement("textarea");
      box.value = value;
      box.style.position = "fixed";
      box.style.opacity = "0";
      document.body.appendChild(box);
      box.select();
      document.execCommand("copy");
      box.remove();
    }
    setCopied(true);
    onCopied?.();
  }

  return (
    <Button variant={variant} onClick={copy} aria-live="polite" {...props}>
      {copied ? (
        <CheckIcon key="check" className="text-success animate-in zoom-in-50 duration-200" strokeWidth={2.5} />
      ) : (
        <CopyIcon key="copy" className="animate-in fade-in-0 duration-200" />
      )}
      {children ? (copied ? copiedLabel : children) : <span className="sr-only">{copied ? copiedLabel : "Copy"}</span>}
    </Button>
  );
}

export { CopyButton };
