"use client";

import { monthlyPrice } from "@stayzim/sites";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CircleCheck, Globe, Rocket } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow } from "./brand";
import { LODGES } from "./content";
import { useFounding } from "@/components/founding";
import { EASE_OUT, Item, popIn, Stagger } from "@/components/motion";

/** Each card fades up, then plays its mockup in sequence. */
const card: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE_OUT, staggerChildren: 0.28, delayChildren: 0.45 },
  },
};

const bubble: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

const PHOTOS = [LODGES[0]!.roomPhoto, LODGES[1]!.roomPhoto, "linear-gradient(160deg,#DDF0F7 0%,#A9D3E3 55%,#6FAFC7 100%)"];

function Step({ number, title, body, children }: { number: string; title: string; body: string; children: ReactNode }) {
  return (
    <motion.div
      variants={card}
      whileHover={{ y: -4, boxShadow: "0 24px 48px -24px rgba(12,24,31,0.18)" }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className="relative box-border flex flex-col gap-[22px] rounded-3xl border border-line bg-white p-6 lg:min-h-[560px] lg:p-7"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink font-display text-[15px] font-semibold text-white">
        {number}
      </span>
      <div className="flex flex-col gap-2">
        <h3 className="font-display text-[23px] leading-[1.15] font-semibold tracking-[-0.02em] lg:text-[26px]">{title}</h3>
        <p className="text-[15px] leading-normal text-muted lg:text-base">{body}</p>
      </div>
      <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.28 } } }} className="mt-auto rounded-[18px] bg-surface-2 p-4 lg:p-[18px]">
        {children}
      </motion.div>
    </motion.div>
  );
}

function TeamBubble({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={bubble}
      className="max-w-[86%] self-start rounded-[14px_14px_14px_4px] bg-white px-3 py-[9px] text-[13.5px] leading-[1.42] shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
    >
      <span className="mb-0.5 block text-[11.5px] font-bold text-brand">StayZim</span>
      {children}
    </motion.div>
  );
}

function SendStep() {
  return (
    <div className="flex flex-col gap-2">
      <TeamBubble>Send your lodge&apos;s name, WhatsApp number and 3 photos.</TeamBubble>
      <motion.div
        variants={{ hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } } }}
        className="flex flex-col gap-1.5 self-end rounded-[14px_14px_4px_14px] bg-brand-tint p-[5px]"
      >
        <span className="px-1.5 pt-1 text-[13px] font-semibold text-ink-2">Mist Valley Lodge, Nyanga</span>
        <span className="grid grid-cols-[repeat(3,52px)] gap-1">
          {PHOTOS.map((photo) => (
            <motion.span key={photo} variants={popIn} className="h-[52px] rounded-[9px]" style={{ background: photo }} />
          ))}
        </span>
      </motion.div>
    </div>
  );
}

function BuildStep() {
  return (
    <div className="flex flex-col gap-2">
      <TeamBubble>
        Done. Your site is ready to check.
        <br />
        <span className="mt-1.5 inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 text-[12.5px] font-semibold">
          <span className="relative flex size-[7px]">
            <span className="absolute inset-0 animate-wa-ping rounded-full bg-[#1F7A4D]" />
            <span className="relative size-full rounded-full bg-[#1F7A4D] shadow-[0_0_0_3px_#E3F2EA]" />
          </span>
          mistvalley.stayzim.co.zw
        </span>
      </TeamBubble>
      <motion.div
        variants={bubble}
        className="flex items-center gap-2.5 rounded-[14px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-tint text-brand">
          <Globe size={16} strokeWidth={1.75} />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13.5px] font-semibold">mistvalley.co.zw</span>
          <span className="text-[12px] leading-4 text-muted">Yours free: we register it when you launch</span>
        </span>
      </motion.div>
    </div>
  );
}

function LaunchStep() {
  const { open } = useFounding();
  const row: Variants = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } };
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.18 } } }}
      className="flex flex-col gap-3 rounded-[14px] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
    >
      <motion.span variants={row} className="text-[11.5px] font-bold tracking-[0.06em] text-muted-2 uppercase">
        Your free preview
      </motion.span>
      <motion.div variants={row} className="flex items-baseline justify-between gap-3 text-[13.5px]">
        <span>Mist Valley Lodge</span>
        <span className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-success">
          <CircleCheck size={14} strokeWidth={2} />
          Looks good
        </span>
      </motion.div>
      <motion.span
        variants={row}
        className="flex h-10 items-center justify-center gap-1.5 rounded-full bg-brand text-[14px] font-semibold text-white"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.4, ease: "easeInOut" }}
      >
        <Rocket size={15} strokeWidth={2} />
        Launch my site
      </motion.span>
      <motion.div variants={row} className="flex items-baseline justify-between gap-3 text-[12.5px] text-muted">
        <span>Not for you? Pay nothing.</span>
        <span className="whitespace-nowrap tabular-nums">from ${monthlyPrice("STARTER", open)}/month</span>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative bg-surface px-4 py-16 lg:px-6 lg:py-[120px]">
      <div className="mx-auto max-w-[1120px]">
        <Stagger className="mb-8 grid gap-3.5 lg:mb-14 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end lg:gap-16">
          <div className="flex flex-col gap-3.5 lg:gap-[18px]">
            <Item>
              <Eyebrow index="01">How it works</Eyebrow>
            </Item>
            <Item>
              <h2 className="font-display text-[34px] leading-[37px] font-semibold tracking-[-0.03em] text-balance lg:text-[52px] lg:leading-[56px]">
                Build your site free. Launch it when you love it.
              </h2>
            </Item>
          </div>
          <Item>
            <p className="text-base leading-relaxed text-pretty text-muted lg:text-lg lg:leading-7">
              Make it yourself in about a minute on your phone, or send us your photos on WhatsApp and we&apos;ll make it for you. You only pay when you launch it.
            </p>
          </Item>
        </Stagger>

        <Stagger stagger={0.18} amount={0.15} className="relative grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 lg:gap-7">
          <Step number="01" title="Send us 3 photos" body="Your lodge's name, your WhatsApp number and 3 photos. That's all it takes.">
            <SendStep />
          </Step>
          <Step
            number="02"
            title="We build your site"
            body="Your site is ready to check in about a minute. Your own .co.zw address comes free: we register it for you when you launch."
          >
            <BuildStep />
          </Step>
          <Step number="03" title="Love it? Launch it." body="Check it on your phone. Love it? Launch it, and guests book you direct. Not? Walk away and pay nothing.">
            <LaunchStep />
          </Step>

          {/* Connectors between the cards */}
          {["left-[calc(33.333%-4.67px)]", "left-[calc(66.666%+4.67px)]"].map((position, i) => (
            <motion.span
              key={position}
              variants={popIn}
              transition={{ delay: 0.6 + i * 0.2 }}
              className={`absolute top-1/2 z-[1] -mt-5 -ml-5 hidden size-10 items-center justify-center rounded-full border border-line bg-white text-brand shadow-[0_4px_12px_rgba(12,24,31,0.08)] lg:flex ${position}`}
            >
              <motion.span animate={{ x: [0, 3, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}>
                <ArrowRight size={17} strokeWidth={1.75} />
              </motion.span>
            </motion.span>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
