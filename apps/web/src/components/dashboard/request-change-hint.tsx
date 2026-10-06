import { cn } from "@stayzim/ui/lib/utils";
import { MessageSquarePlus } from "lucide-react";
import Link from "next/link";

/** "Need something else changed? Request it", under the screens owners edit themselves. */
export function RequestChangeHint({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-2 text-[13px] text-muted", className)}>
      <MessageSquarePlus className="size-4 shrink-0 text-muted-2" />
      <span>
        Need something else changed?{" "}
        <Link href="/dashboard/requests" className="font-semibold text-brand transition-colors hover:text-brand-dark">
          Request it
        </Link>
      </span>
    </p>
  );
}
