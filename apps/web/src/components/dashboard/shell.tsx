"use client";

import { Skeleton } from "@stayzim/ui/components/skeleton";
import { TooltipProvider } from "@stayzim/ui/components/tooltip";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { LodgeProvider } from "@/components/dashboard/lodge-provider";
import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav, MobileHeader, Topbar } from "@/components/dashboard/topbar";
import { authClient } from "@/lib/auth-client";

const COLLAPSED_KEY = "stayzim.sidebar-collapsed";

/** Grey placeholders in the shape of the dashboard while the session and lodge load. */
function DashboardSkeleton() {
  return (
    <div className="min-h-svh bg-surface-2 lg:flex" role="status" aria-label="Loading your dashboard">
      <div className="hidden w-[248px] shrink-0 flex-col gap-4 p-3.5 pt-5 lg:flex">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-[50px] rounded-[14px] bg-white" />
        <div className="mt-4 flex flex-col gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[38px] bg-white/70" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 lg:my-2.5 lg:mr-2.5 lg:rounded-[20px] lg:bg-white lg:p-7">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
        <div className="mt-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-[120px] rounded-[20px]" />
          ))}
        </div>
        <Skeleton className="mt-4 h-[280px] rounded-[20px]" />
      </div>
    </div>
  );
}

/**
 * Every /dashboard page: checks the session, loads the lodge, and lays out the
 * sidebar and white panel (desktop) or header and bottom bar (phones).
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/login");
    else if (session.user.mustChangePassword) router.replace("/set-password");
  }, [isPending, router, session]);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // Private mode: start expanded
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? "0" : "1");
      } catch {
        // Not remembered, still toggles
      }
      return !value;
    });
  }

  if (isPending || !session || session.user.mustChangePassword) return <DashboardSkeleton />;
  const user = { name: session.user.name, email: session.user.email };

  return (
    <LodgeProvider loading={<DashboardSkeleton />}>
      <TooltipProvider>
        <div className="min-h-svh bg-surface-2 lg:flex">
          <Sidebar user={user} collapsed={collapsed} onToggle={toggleSidebar} />
          <div className="flex min-w-0 flex-1 flex-col lg:my-2.5 lg:mr-2.5 lg:min-h-[calc(100svh-20px)] lg:rounded-[20px] lg:bg-white lg:shadow-panel">
            <MobileHeader user={user} />
            <Topbar />
            <main className="flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-7 lg:pt-6 lg:pb-10">{children}</main>
          </div>
          <BottomNav />
        </div>
      </TooltipProvider>
    </LodgeProvider>
  );
}
