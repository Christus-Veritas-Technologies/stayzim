"use client";

import { Eye, X } from "lucide-react";
import { useState } from "react";

/** Slim bar above a template preview, so it's never mistaken for the live site. */
export function PreviewBanner({ template }: { template: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div
      role="status"
      className="relative z-50 flex h-9 items-center justify-center gap-2 bg-[#0C181F] px-10 text-[12.5px] font-medium text-white animate-in fade-in-0 slide-in-from-top-2 duration-300"
    >
      <Eye className="size-3.5 shrink-0 text-white/70" aria-hidden="true" />
      <span className="truncate">
        Preview: <strong className="font-semibold">{template}</strong> template
      </span>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Hide preview bar"
        className="absolute right-2 flex size-7 items-center justify-center rounded-full text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
