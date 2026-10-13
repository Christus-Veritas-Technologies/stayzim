"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { Skeleton } from "@stayzim/ui/components/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import {
  Globe,
  LayoutDashboard,
  Link2,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ShieldAlert,
  UserRoundSearch,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { LogoMark, Wordmark } from "@/components/brand";
import { authClient } from "@/lib/auth-client";
import { env } from "@/lib/public-env";

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;
const COLLAPSED_KEY = "stayzim-admin-sidebar";

type NavLink = { href: string; label: string; icon: LucideIcon };

/** The admin's screens, in the order the team uses them. */
const NAV: { title: string; links: NavLink[] }[] = [
  {
    title: "Grow",
    links: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: UserRoundSearch },
      { href: "/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { href: "/campaigns", label: "Campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Run",
    links: [
      { href: "/sites", label: "Sites", icon: Globe },
      { href: "/users", label: "Users", icon: Users },
      { href: "/billing", label: "Billing", icon: Receipt },
      { href: "/requests", label: "Requests", icon: MessageSquarePlus },
      { href: "/domains", label: "Domains", icon: Link2 },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({ link, collapsed }: { link: NavLink; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, link.href);
  const Icon = link.icon;
  const row = (
    <Link
      href={link.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 text-sm font-medium no-underline transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        active ? "font-semibold text-white" : "text-slate hover:bg-white/70 hover:text-ink",
        collapsed && "w-[38px] justify-center px-0",
      )}
    >
      {active ? <motion.span layoutId="admin-sidebar-active" transition={SPRING} className="absolute inset-0 -z-10 rounded-[9px] bg-primary shadow-brand" /> : null}
      <Icon className="size-[18px]" strokeWidth={1.75} />
      {collapsed ? <span className="sr-only">{link.label}</span> : link.label}
    </Link>
  );
  if (!collapsed) return row;
  return (
    <Tooltip>
      <TooltipTrigger render={row} />
      <TooltipContent side="right">{link.label}</TooltipContent>
    </Tooltip>
  );
}

function useSignOut() {
  const router = useRouter();
  return async () => {
    await authClient.signOut();
    router.replace("/login");
  };
}

function Sidebar({ user, collapsed, onToggle }: { user: { name: string; email: string }; collapsed: boolean; onToggle: () => void }) {
  const signOut = useSignOut();
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-muted-2 transition-colors outline-none hover:bg-white hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30"
    >
      <ToggleIcon className="size-[18px]" strokeWidth={1.75} />
    </button>
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 248 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="sticky top-0 hidden h-svh shrink-0 flex-col gap-[18px] overflow-x-hidden overflow-y-auto px-3.5 pt-[18px] pb-3.5 lg:flex"
    >
      <div className={cn("flex items-center justify-between gap-2", collapsed && "flex-col")}>
        <Link href="/" className="flex items-center gap-2 text-[19px] text-ink no-underline" aria-label="StayZim admin">
          {collapsed ? <LogoMark size={32} /> : <Wordmark size={32} />}
          {collapsed ? null : <Badge variant="purple">Admin</Badge>}
        </Link>
        {collapsed ? null : toggle}
      </div>

      {NAV.map((group) => (
        <nav key={group.title} aria-label={group.title} className="flex flex-col gap-1">
          {collapsed ? null : <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-2 uppercase">{group.title}</span>}
          <div className={cn("isolate flex flex-col gap-1", collapsed && "items-center")}>
            {group.links.map((link) => (
              <NavItem key={link.href} link={link} collapsed={collapsed} />
            ))}
          </div>
        </nav>
      ))}

      <div className={cn("mt-auto flex flex-col gap-3", collapsed && "items-center")}>
        {collapsed ? toggle : null}
        <div className={cn("flex items-center gap-2.5 px-1", collapsed && "flex-col px-0")}>
          <span className={cn("flex min-w-0 flex-1 items-center gap-2.5", collapsed && "flex-none")}>
            <Avatar name={user.name} />
            {collapsed ? null : (
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13.5px] font-semibold">{user.name}</span>
                <span className="truncate text-xs text-muted">{user.email}</span>
              </span>
            )}
          </span>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={signOut}
                  aria-label="Log out"
                  className="flex size-8 shrink-0 items-center justify-center rounded-[9px] text-muted-2 transition-colors outline-none hover:bg-white hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30"
                />
              }
            >
              <LogOut className="size-[17px]" strokeWidth={1.75} />
            </TooltipTrigger>
            <TooltipContent side="right">Log out</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.aside>
  );
}

/** Phones and tablets: the wordmark and a row of the screens to scroll through. */
function MobileNav() {
  const pathname = usePathname();
  const signOut = useSignOut();
  return (
    <header className="sticky top-0 z-30 border-b border-line-3 bg-white/95 backdrop-blur lg:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2 text-[17px] text-ink no-underline" aria-label="StayZim admin">
          <Wordmark size={28} />
          <Badge variant="purple">Admin</Badge>
        </Link>
        <button type="button" onClick={signOut} aria-label="Log out" className={buttonVariants({ variant: "ghost", size: "icon-sm" })}>
          <LogOut />
        </button>
      </div>
      <nav aria-label="Screens" className="flex gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]">
        {NAV.flatMap((group) => group.links).map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap no-underline transition-colors",
                active ? "bg-primary text-white" : "bg-surface-2 text-slate hover:text-ink",
              )}
            >
              <link.icon className="size-3.5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-4 p-6" role="status" aria-label="Loading">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-[140px] rounded-[20px]" />
      <Skeleton className="h-[140px] rounded-[20px]" />
    </div>
  );
}

/**
 * Every admin screen: the team member's session (sign in here; a temporary
 * password is changed on the web app first), the sidebar and the white panel,
 * as in the owner dashboard. Accounts that aren't the team's are turned away;
 * the API checks the role on every request too.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
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

  if (isPending || !session) return <ShellSkeleton />;

  if (session.user.mustChangePassword) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <EmptyState
          className="rounded-[20px] bg-white shadow-card"
          icon={<ShieldAlert />}
          title="Choose your own password first"
          description="You signed in with a temporary password. Set yours on StayZim, then come back."
          action={
            <a href={`${env.NEXT_PUBLIC_WEB_URL}/set-password`} className={buttonVariants()}>
              Set my password
            </a>
          }
        />
      </div>
    );
  }

  if (session.user.role !== "ADMIN") {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <EmptyState
          className="rounded-[20px] bg-white shadow-card"
          icon={<ShieldAlert />}
          title="This is for the StayZim team"
          description="Your account manages a lodge. Everything you need is in your dashboard."
          action={
            <span className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  router.replace("/login");
                }}
                className={buttonVariants()}
              >
                Log in with a team account
              </button>
              <a href={`${env.NEXT_PUBLIC_WEB_URL}/dashboard`} className={buttonVariants({ variant: "outline" })}>
                Open my dashboard
              </a>
            </span>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-surface-2 lg:flex">
      <Sidebar user={{ name: session.user.name, email: session.user.email }} collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex min-w-0 flex-1 flex-col lg:my-2.5 lg:mr-2.5 lg:min-h-[calc(100svh-20px)] lg:rounded-[20px] lg:bg-white lg:shadow-panel">
        <MobileNav />
        <main className="flex-1 px-4 pt-5 pb-12 sm:px-6 lg:px-7 lg:pt-6 lg:pb-10">{children}</main>
      </div>
    </div>
  );
}
