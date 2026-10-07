"use client";

import { Avatar } from "@stayzim/ui/components/avatar";
import { Badge } from "@stayzim/ui/components/badge";
import { buttonVariants } from "@stayzim/ui/components/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@stayzim/ui/components/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ChevronDown, LogOut, MessageSquarePlus, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { AccountMenu, useSignOut } from "@/components/dashboard/account-menu";
import { NavIcon, NavTrailing } from "@/components/dashboard/link-pending";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { isActive, isCurrent, lodgeStatus, navLinks, type NavLink } from "@/components/dashboard/nav";
import { LogoMark, WhatsAppIcon, Wordmark } from "@/components/landing/brand";
import { whatsappUrl } from "@/lib/whatsapp";

const SPRING = { type: "spring", stiffness: 500, damping: 40 } as const;

/** Card around the lodge and the help box: hairline ring and a soft drop. */
const floatingCard = "bg-white shadow-card";

function NavItem({ link, collapsed }: { link: NavLink; collapsed: boolean }) {
  const pathname = usePathname();
  const active = isActive(pathname, link.href);
  const Icon = link.icon;
  const [open, setOpen] = useState(true);

  const row = (
    <Link
      href={link.href}
      aria-current={active && !link.children ? "page" : undefined}
      className={cn(
        "relative flex h-[38px] items-center gap-2.5 rounded-[9px] px-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        active ? "font-semibold text-white" : "text-slate hover:bg-white/70 hover:text-ink",
        collapsed && "w-[38px] justify-center px-0",
      )}
    >
      {active ? <motion.span layoutId="sidebar-active" transition={SPRING} className="absolute inset-0 -z-10 rounded-[9px] bg-primary shadow-brand" /> : null}
      <span className="relative">
        <NavIcon icon={Icon} className="size-[18px]" />
        {collapsed && (link.attention || link.count) ? (
          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-purple ring-2 ring-surface-2" />
        ) : null}
      </span>
      {collapsed ? <span className="sr-only">{link.label}</span> : link.label}
      {!collapsed && (link.badge || link.count) ? (
        <Badge variant={active ? "inverse" : "purple"} className="ml-auto" aria-label={link.count ? `${link.count} waiting` : undefined}>
          {link.badge ?? link.count}
        </Badge>
      ) : null}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={row} />
        <TooltipContent side="right">{link.attention ? `${link.label} · ${link.attention}` : link.label}</TooltipContent>
      </Tooltip>
    );
  }

  if (!link.children) return row;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="relative">
        {row}
        <CollapsibleTrigger
          aria-label={open ? "Hide My site pages" : "Show My site pages"}
          className={cn(
            "absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
            active ? "text-white/80 hover:bg-white/15" : "text-muted-2 hover:bg-white",
          )}
        >
          <ChevronDown className={cn("size-4 transition-transform duration-200", !open && "-rotate-90")} />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent>
        <div className="mt-0.5 mb-1 ml-[19px] flex flex-col gap-0.5 border-l border-line-2 pl-2.5">
          {link.children.map((child) => {
            const current = isCurrent(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-[34px] items-center gap-2 rounded-lg px-2.5 text-[13.5px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
                  current ? "bg-white font-semibold text-ink shadow-xs" : "text-muted hover:bg-white/70 hover:text-ink",
                )}
              >
                {child.label}
                {child.attention ? <span className="size-1.5 rounded-full bg-purple" title={child.attention} aria-label={child.attention} /> : null}
                <NavTrailing>
                  {child.badge || child.count !== undefined ? (
                    <span className="ml-auto flex items-center gap-1.5">
                      {child.badge ? <span className="text-[11px] font-medium text-muted-2">{child.badge}</span> : null}
                      {child.count !== undefined ? <span className="text-xs font-semibold text-muted-2">{child.count}</span> : null}
                    </span>
                  ) : null}
                </NavTrailing>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

/** Desktop navigation on the grey canvas. Collapses to icons with tooltips. */
export function Sidebar({ user, collapsed, onToggle }: { user: { name: string; email: string; guest?: boolean }; collapsed: boolean; onToggle: () => void }) {
  const { lodge } = useLodge();
  const signOut = useSignOut();
  const status = lodgeStatus(lodge);
  const links = navLinks(lodge);
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
        <Link href="/dashboard" className="text-[19px] text-ink no-underline" aria-label="StayZim dashboard">
          {collapsed ? <LogoMark size={32} /> : <Wordmark size={32} />}
        </Link>
        {collapsed ? null : toggle}
      </div>

      <div className={cn("flex items-center gap-2.5 rounded-[14px] p-2 pr-2.5", floatingCard, collapsed && "justify-center p-1.5 pr-1.5")}>
        <Avatar shape="lodge" name={lodge.name} src={lodge.logoUrl} color={lodge.themeColor} />
        {collapsed ? null : (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13.5px] font-semibold">{lodge.name}</span>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span className={cn("size-1.5 shrink-0 rounded-full", status.dot)} />
              <span className="truncate">{status.label}</span>
            </span>
          </span>
        )}
      </div>

      <nav aria-label="Dashboard" className="flex flex-col gap-1">
        {collapsed ? null : <span className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-2 uppercase">Menu</span>}
        <div className={cn("isolate flex flex-col gap-1", collapsed && "items-center")}>
          {links.map((link) => (
            <NavItem key={link.href} link={link} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      <div className={cn("mt-auto flex flex-col gap-3", collapsed && "items-center")}>
        {collapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/dashboard/requests"
                    aria-label="Request a change"
                    className="flex size-9 items-center justify-center rounded-full bg-primary text-white shadow-brand transition-transform hover:scale-105"
                  />
                }
              >
                <MessageSquarePlus className="size-[17px]" />
              </TooltipTrigger>
              <TooltipContent side="right">Need a change? Request it</TooltipContent>
            </Tooltip>
            {toggle}
          </>
        ) : (
          <div className={cn("flex flex-col gap-3 rounded-2xl p-3.5", floatingCard)}>
            <div className="flex items-center gap-2.5">
              <LogoMark size={30} />
              <span className="flex flex-col">
                <span className="text-[13.5px] font-semibold">Need a change?</span>
                <span className="text-xs text-muted">We can edit anything for you</span>
              </span>
            </div>
            <Link href="/dashboard/requests" className={buttonVariants({ size: "sm", className: "w-full" })}>
              <MessageSquarePlus />
              Request a change
            </Link>
            <a
              href={whatsappUrl("help")}
              target="_blank"
              rel="noreferrer"
              className="-mt-1 inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
            >
              <WhatsAppIcon size={13} color="#1F7A4D" />
              Or message us on WhatsApp
            </a>
          </div>
        )}

        <div className={cn("flex items-center gap-2.5 px-1", collapsed && "flex-col px-0")}>
          <AccountMenu
            name={user.name}
            email={user.email}
            guest={user.guest}
            side={collapsed ? "right" : "top"}
            align="start"
            trigger={
              <button
                type="button"
                className={cn(
                  "-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 text-left transition-colors outline-none hover:bg-white focus-visible:ring-3 focus-visible:ring-ring/30",
                  collapsed && "flex-none",
                )}
              >
                <Avatar name={user.name} />
                {collapsed ? null : (
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13.5px] font-semibold">{user.name}</span>
                    <span className="truncate text-xs text-muted">{user.email}</span>
                  </span>
                )}
              </button>
            }
          />
          {/* A guest can't log back in: no logging out until the site is claimed */}
          {user.guest ? null : (
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
          )}
        </div>
      </div>
    </motion.aside>
  );
}
