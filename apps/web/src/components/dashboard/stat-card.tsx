"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { cn } from "@stayzim/ui/lib/utils";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { CountUp } from "@/components/motion";
import { percentChange } from "@/lib/format";

const valueClass = "font-display text-[30px] leading-9 font-semibold tracking-[-0.025em] lg:text-[34px]";

/** "+18%" with an arrow, green when up. Nothing when there's no earlier number to compare with. */
export function Trend({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const change = percentChange(current, previous);
  if (change === null) return null;
  const Icon = change < 0 ? TrendingDown : TrendingUp;
  return (
    <Badge variant={inverse ? "inverse" : change < 0 ? "danger" : "success"}>
      <Icon />
      {Math.abs(change)}%
    </Badge>
  );
}

function IconTile({ icon: Icon, className }: { icon: LucideIcon; className: string }) {
  return (
    <span className={cn("flex size-[30px] shrink-0 items-center justify-center rounded-lg", className)}>
      <Icon className="size-4" strokeWidth={1.75} />
    </span>
  );
}

/** The lead number: Kariba card with soft rings in the corner. */
export function LeadStatCard({
  icon,
  label,
  value,
  badge,
  note,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  badge?: ReactNode;
  note: ReactNode;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-5 overflow-hidden rounded-[14px] bg-[linear-gradient(150deg,#0096BE_0%,#007DA2_50%,#006483_100%)] px-5 py-[18px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_20px_rgba(0,100,131,0.18)] transition-transform duration-300 hover:-translate-y-0.5">
      <span aria-hidden="true" className="absolute top-0 -right-[110px] size-[220px] -translate-y-1/2 rounded-full border border-white/14" />
      <span aria-hidden="true" className="absolute top-0 -right-[70px] size-[140px] -translate-y-1/2 rounded-full border border-white/20" />
      <div className="relative flex items-center gap-2.5">
        <IconTile icon={icon} className="bg-white/16" />
        <span className="text-[13.5px] font-medium text-[#E6F5FB]">{label}</span>
        <span className="ml-auto">{badge}</span>
      </div>
      <div className="relative flex items-end justify-between gap-2">
        <span className={valueClass}>
          <CountUp to={value} duration={1.2} />
        </span>
        <span className="pb-1 text-[12.5px] text-brand-tint">{note}</span>
      </div>
    </div>
  );
}

const TONES = {
  brand: { wrap: "bg-brand-wash", tile: "bg-brand-wash text-brand", foot: "text-brand-dark" },
  purple: { wrap: "bg-purple-wash", tile: "bg-purple-wash text-purple", foot: "text-purple-dark" },
  peach: { wrap: "bg-peach-wash", tile: "bg-peach-wash text-rust", foot: "text-rust" },
} as const;

/** White card sitting in a tinted tray, with an uppercase note in the tray under it. */
export function TrayStatCard({
  tone,
  icon,
  label,
  value,
  badge,
  foot,
  children,
}: {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  label: string;
  value?: number;
  badge?: ReactNode;
  foot: ReactNode;
  /** Instead of a number, e.g. "58% ZW" */
  children?: ReactNode;
}) {
  const colors = TONES[tone];
  return (
    <div className={cn("flex h-full flex-col rounded-[22px] p-[5px] pb-0 transition-transform duration-300 hover:-translate-y-0.5", colors.wrap)}>
      <div className="flex flex-1 flex-col gap-[18px] rounded-[18px] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(12,24,31,0.05),0_0_0_1px_rgba(12,24,31,0.04)]">
        <div className="flex items-center gap-2.5">
          <IconTile icon={icon} className={colors.tile} />
          <span className="text-[13.5px] font-medium text-slate">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          {children ?? (
            <span className={valueClass}>
              <CountUp to={value ?? 0} duration={1.2} />
            </span>
          )}
          {badge}
        </div>
      </div>
      <span className={cn("px-3.5 pt-[9px] pb-2.5 text-[11.5px] font-bold tracking-[0.06em] uppercase", colors.foot)}>{foot}</span>
    </div>
  );
}

/** Plain card: for content that isn't one number, e.g. where visitors are. */
export function PlainStatCard({ icon, label, children }: { icon: LucideIcon; label: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col gap-3.5 rounded-[20px] bg-white px-5 py-[18px] shadow-card transition-transform duration-300 hover:-translate-y-0.5">
      <div className="flex items-center gap-2.5">
        <IconTile icon={icon} className="bg-peach-wash text-rust" />
        <span className="text-[13.5px] font-medium text-slate">{label}</span>
      </div>
      {children}
    </div>
  );
}
