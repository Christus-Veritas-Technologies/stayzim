"use client";

import { Spinner } from "@stayzim/ui/components/spinner";
import { cn } from "@stayzim/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

/**
 * A nav item's icon, swapped for a spinner of the same size while its page is
 * on the way (on a slow connection, before it was prefetched). Must sit inside a <Link>.
 */
export function NavIcon({ icon: Icon, className, strokeWidth = 1.75 }: { icon: LucideIcon; className?: string; strokeWidth?: number }) {
  const { pending } = useLinkStatus();
  return pending ? <Spinner className={cn(className, "animate-in fade-in-0")} /> : <Icon className={className} strokeWidth={strokeWidth} />;
}

/** The end of a nav item, e.g. its count, swapped for a small spinner while its page is on the way. */
export function NavTrailing({ children }: { children?: ReactNode }) {
  const { pending } = useLinkStatus();
  if (pending) return <Spinner className="ml-auto size-3.5 text-muted-2 animate-in fade-in-0" />;
  return children ?? null;
}
