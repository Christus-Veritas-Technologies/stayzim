import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

/**
 * "Your site shows example rooms until you add yours": on Rooms, Gallery and
 * Guest info while a demo site fills that section with example content
 * (packages/sites samples). Gone once the owner adds their own.
 */
export function ExampleNote({ children }: { children: ReactNode }) {
  return (
    <p role="note" className="flex items-start gap-3 rounded-[14px] border border-brand-tint bg-brand-wash px-4 py-3 text-[13.5px] leading-5 text-ink-2">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-white text-brand shadow-xs">
        <Sparkles className="size-4" strokeWidth={1.75} />
      </span>
      <span className="pt-1">{children}</span>
    </p>
  );
}
