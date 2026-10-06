import { BarChart3, CalendarDays, Globe, LayoutGrid, ReceiptText, type LucideIcon } from "lucide-react";
import type { Route } from "next";

import { demoTimeLeft, formatTimeLeft, GALLERY_GOAL, PLANS, type Lodge } from "@/lib/lodge";

export type NavLink = {
  href: Route;
  label: string;
  icon: LucideIcon;
  /** Small number at the right, e.g. 3 rooms (top-level links: something waiting, e.g. 2 booking requests) */
  count?: number;
  /** Jacaranda dot: something to finish here */
  attention?: string;
  /** Pill at the right, e.g. "9 days" left in the trial */
  badge?: string;
  children?: Omit<NavLink, "icon" | "children">[];
};

/** Pages under "My site". On phones they share one tab in the bottom bar. */
export const SITE_PAGES = [
  "/dashboard/site",
  "/dashboard/rooms",
  "/dashboard/gallery",
  "/dashboard/guest-info",
  "/dashboard/design",
  "/dashboard/requests",
];

export function navLinks(lodge: Lodge): NavLink[] {
  const missingPhotos = Math.max(0, GALLERY_GOAL - lodge.gallery.length);
  const roomsWithoutPhotos = lodge.rooms.filter((room) => room.visible && room.photos.length === 0).length;
  const hiddenRooms = lodge.rooms.filter((room) => !room.visible).length;
  return [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    {
      href: "/dashboard/bookings",
      label: "Bookings",
      icon: CalendarDays,
      // Requests waiting for an answer
      count: lodge.bookingsWaiting > 0 ? lodge.bookingsWaiting : undefined,
    },
    {
      href: "/dashboard/site",
      label: "My site",
      icon: Globe,
      attention: missingPhotos > 0 ? "Gallery needs a photo" : roomsWithoutPhotos > 0 ? "A room needs a photo" : undefined,
      children: [
        { href: "/dashboard/site", label: "Lodge info" },
        {
          href: "/dashboard/rooms",
          label: "Rooms",
          count: lodge.rooms.length,
          attention: roomsWithoutPhotos > 0 ? `${roomsWithoutPhotos} without a photo` : undefined,
          badge: hiddenRooms > 0 ? `${hiddenRooms} hidden` : undefined,
        },
        {
          href: "/dashboard/gallery",
          label: "Gallery",
          count: lodge.gallery.length,
          attention: missingPhotos > 0 ? `Add ${missingPhotos} more` : undefined,
        },
        { href: "/dashboard/guest-info", label: "Guest info" },
        {
          href: "/dashboard/design",
          label: "Design",
          attention: lodge.template && lodge.template !== lodge.siteTemplate ? "Your template isn't in your plan" : undefined,
        },
        { href: "/dashboard/requests", label: "Requests" },
      ],
    },
    { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
    {
      href: "/dashboard/billing",
      label: "Billing",
      icon: ReceiptText,
      badge: lodge.status === "ACTIVE" ? undefined : lodge.status === "DEMO" && !lodge.demoEnded ? formatTimeLeft(demoTimeLeft(lodge)) : "Due",
    },
  ];
}

export function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/dashboard/site") return SITE_PAGES.some((page) => pathname.startsWith(page));
  return pathname.startsWith(href);
}

/** The exact page, for sub-items under My site. */
export function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** "Live · Growth demo", with the colour of the dot beside it. */
export function lodgeStatus(lodge: Pick<Lodge, "status" | "plan" | "demoEnded">) {
  const plan = PLANS[lodge.plan].name;
  switch (lodge.status) {
    case "DEMO":
      return lodge.demoEnded ? { label: "Offline · Demo ended", dot: "bg-destructive" } : { label: `Live · ${plan} demo`, dot: "bg-purple" };
    case "ACTIVE":
      return { label: `Live · ${plan}`, dot: "bg-success" };
    case "OVERDUE":
      return { label: `Payment due · ${plan}`, dot: "bg-[#e8833a]" };
    case "SUSPENDED":
      return { label: "Offline · Suspended", dot: "bg-destructive" };
  }
}

/** Breadcrumb trail for the top bar. */
export function breadcrumb(pathname: string): string[] {
  if (pathname.startsWith("/dashboard/site")) return ["My site", "Lodge info"];
  if (pathname.startsWith("/dashboard/rooms")) return ["My site", "Rooms"];
  if (pathname.startsWith("/dashboard/gallery")) return ["My site", "Gallery"];
  if (pathname.startsWith("/dashboard/guest-info")) return ["My site", "Guest info"];
  if (pathname.startsWith("/dashboard/design")) return ["My site", "Design"];
  if (pathname.startsWith("/dashboard/requests")) return ["My site", "Change requests"];
  if (pathname.startsWith("/dashboard/bookings")) return ["Bookings"];
  if (pathname.startsWith("/dashboard/analytics")) return ["Analytics"];
  if (pathname.startsWith("/dashboard/billing")) return ["Billing"];
  return ["Dashboard"];
}
