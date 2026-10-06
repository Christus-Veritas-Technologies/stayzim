"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { LogOut, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useSignOut } from "@/components/dashboard/account-menu";
import { OfflineBanner } from "@/components/dashboard/offline-banner";
import { Wordmark } from "@/components/landing/brand";
import { authClient } from "@/lib/auth-client";

/**
 * StayZim's own screens (/admin). Only for team accounts (`create-owner --admin`);
 * the API checks the role too.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const signOut = useSignOut();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/login");
    else if (session.user.mustChangePassword) router.replace("/set-password");
  }, [isPending, router, session]);

  if (isPending || !session || session.user.mustChangePassword) {
    return (
      <div className="mx-auto flex max-w-[1080px] flex-col gap-4 p-6" role="status" aria-label="Loading">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-[160px] rounded-[20px]" />
        <Skeleton className="h-[160px] rounded-[20px]" />
      </div>
    );
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface-2 p-4">
        <EmptyState
          className="rounded-[20px] bg-white shadow-card"
          icon={<ShieldAlert />}
          title="This page is for the StayZim team"
          description="Your account manages a lodge. Everything you need is in your dashboard."
          action={
            <Link href="/dashboard" className={buttonVariants()}>
              Open my dashboard
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-surface-2">
      <header className="sticky top-0 z-30 border-b border-line-3 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-3 px-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <Link href="/admin/requests" className="text-[17px] text-ink no-underline" aria-label="StayZim team">
              <Wordmark size={28} />
            </Link>
            <Badge variant="purple">Team</Badge>
          </span>
          <span className="flex items-center gap-2">
            <span className="hidden text-[13px] text-muted sm:inline">{session.user.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut />
              Log out
            </Button>
          </span>
        </div>
      </header>
      <OfflineBanner />
      <main className="mx-auto max-w-[1080px] px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
