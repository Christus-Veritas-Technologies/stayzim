"use client";

import { Badge } from "@stayzim/ui/components/badge";
import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { BedDouble, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { CountUp, EASE_OUT, Float } from "@/components/motion";

/** Kariba gradient behind the auth screens' product panel and the phone header. */
export const KARIBA_GRADIENT = "bg-[linear-gradient(160deg,#0BA2C9_0%,#007DA2_48%,#005A74_100%)]";

/** Three rings around a point, breathing slowly, like ripples on Lake Kariba. */
export function Rings({ className, sizes = [620, 420, 240] }: { className?: string; sizes?: number[] }) {
  return (
    <div className={cn("pointer-events-none absolute", className)} aria-hidden="true">
      {sizes.map((size, index) => (
        <motion.span
          key={size}
          className="absolute rounded-full border border-white"
          style={{ width: size, height: size, left: -size / 2, top: -size / 2, opacity: 0.1 + index * 0.05 }}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: [1, 1.03, 1], opacity: 0.1 + index * 0.05 }}
          transition={{
            opacity: { duration: 1.2, delay: index * 0.15 },
            scale: { duration: 6, delay: index * 0.8, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </div>
  );
}

/** A town on the map: a dot with a soft halo, and its name. */
export function Place({
  name,
  className,
  tone = "white",
  delay = 0,
}: {
  name: string;
  className?: string;
  tone?: "white" | "peach";
  delay?: number;
}) {
  return (
    <motion.span
      className={cn("absolute inline-flex items-center gap-[7px] text-xs font-semibold text-brand-tint", className)}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: EASE_OUT }}
    >
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inset-0 animate-ping rounded-full opacity-40 motion-reduce:animate-none",
            tone === "peach" ? "bg-peach" : "bg-white",
          )}
          style={{ animationDuration: "2.6s", animationDelay: `${delay}s` }}
        />
        <span className={cn("relative size-2 rounded-full", tone === "peach" ? "bg-peach" : "bg-white")} />
      </span>
      {name}
    </motion.span>
  );
}

/** Frosted white card floating over the Kariba panel. */
export function GlassCard({
  className,
  delay = 0,
  float = 6,
  children,
}: {
  className?: string;
  delay?: number;
  float?: number;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={cn("absolute", className)}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT }}
    >
      <Float distance={float} duration={6} delay={delay + 0.8}>
        <div className="rounded-2xl bg-white/94 px-4 py-3.5 text-ink shadow-[0_18px_40px_rgba(0,40,60,0.28),inset_0_0_0_1px_rgba(255,255,255,0.6)] backdrop-blur-sm">
          {children}
        </div>
      </Float>
    </motion.div>
  );
}

function PanelFrame({ title, body, children }: { title: ReactNode; body: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("relative h-full overflow-hidden rounded-3xl text-white", KARIBA_GRADIENT)}>
      <Rings className="top-[40%] left-[66%]" />
      <Place name="Kariba" className="top-[49%] left-[26%]" delay={0.5} />
      <Place name="Nyanga" className="top-[52%] left-[57%]" tone="peach" delay={0.65} />
      <Place name="Vic Falls" className="top-[56%] left-[69%]" delay={0.8} />
      {children}
      <motion.div
        className="absolute inset-x-9 bottom-9 flex flex-col gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: EASE_OUT }}
      >
        <p className="font-display text-[26px] leading-8 font-semibold tracking-[-0.02em] text-balance">{title}</p>
        <p className="text-sm leading-5 text-brand-tint">{body}</p>
      </motion.div>
    </div>
  );
}

const WEEK_BARS = [14, 22, 18, 30, 26, 40, 34];

/** What StayZim does, at a glance: a booking chat, a week of visits, 0% commission. */
export function ProductPanel() {
  return (
    <PanelFrame
      title="Guests book you direct. You keep 100%."
      body="Rooms, photos and prices for your lodge, all in one place."
    >
      <GlassCard className="top-[5%] left-[6%] w-[250px]" delay={0.2}>
        <div className="flex items-center gap-3">
          <span className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-purple-wash">
            <WhatsAppIcon size={18} color="#755EAF" />
          </span>
          <span className="flex flex-col">
            <span className="text-sm font-semibold">Garden Cottage</span>
            <span className="text-xs text-muted">Booking chat started · 10:38</span>
          </span>
        </div>
      </GlassCard>

      <GlassCard className="top-[16%] right-[6%] w-[230px]" delay={0.4} float={8}>
        <span className="text-xs text-muted">Visits this week</span>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-display text-[30px] leading-8 font-semibold tracking-[-0.02em]">
            <CountUp to={86} duration={1.6} delay={0.6} />
          </span>
          <Badge variant="success">
            <TrendingUp />
            18%
          </Badge>
        </div>
        <div className="mt-3 flex h-10 items-end gap-1.5">
          {WEEK_BARS.map((height, index) => (
            <motion.span
              key={index}
              className={cn("flex-1 origin-bottom rounded", index === 5 ? "bg-brand" : "bg-[#ACE1F4]")}
              style={{ height }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.6, delay: 0.8 + index * 0.06, ease: EASE_OUT }}
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="top-[35%] left-[11%] w-[220px]" delay={0.6} float={5}>
        <span className="text-xs text-muted">Commission you pay</span>
        <p className="font-display text-[30px] leading-[34px] font-semibold tracking-[-0.02em] text-brand">0%</p>
        <span className="text-xs text-muted">Guests book with you direct</span>
      </GlassCard>
    </PanelFrame>
  );
}

export type LiveLodge = {
  name: string;
  place: string | null;
  siteHost: string;
  heroUrl: string | null;
  roomCount: number;
};

/** First login: the owner's own site, already live, waiting for them. */
export function LivePanel({ lodge }: { lodge: LiveLodge | null }) {
  const name = lodge?.name ?? "Your lodge";
  return (
    <PanelFrame title={`${name} is live`} body="We built your site. Set a password to start editing it.">
      <GlassCard className="top-[10%] left-1/2 w-[260px] -translate-x-1/2" delay={0.2} float={6}>
        <div className="-mx-4 -mt-3.5 mb-3 overflow-hidden rounded-t-2xl">
          <div
            className="relative flex h-32 flex-col justify-end bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)] bg-cover bg-center px-3 pb-2.5"
            style={lodge?.heroUrl ? { backgroundImage: `linear-gradient(180deg,transparent 35%,rgba(12,24,31,0.65)), url(${lodge.heroUrl})` } : undefined}
          >
            <span className="font-serif text-xl leading-6 font-semibold text-white">{name}</span>
            {lodge?.place ? <span className="text-xs text-white/85">{lodge.place}</span> : null}
          </div>
        </div>
        <div className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="size-1.5 shrink-0 rounded-full bg-success" />
          <span className="min-w-0 flex-1 truncate">{lodge?.siteHost ?? "yourlodge.stayzim.co.zw"}</span>
          <Badge variant="success">Live</Badge>
        </div>
      </GlassCard>

      {lodge && lodge.roomCount > 0 ? (
        <GlassCard className="top-[37%] right-[7%] w-[200px]" delay={0.5} float={5}>
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-wash text-brand">
              <BedDouble className="size-4" />
            </span>
            <span className="flex flex-col">
              <span className="text-[13px] font-semibold">
                {lodge.roomCount} {lodge.roomCount === 1 ? "room" : "rooms"} added
              </span>
              <span className="text-xs text-muted">By the StayZim team</span>
            </span>
          </div>
        </GlassCard>
      ) : null}
    </PanelFrame>
  );
}
