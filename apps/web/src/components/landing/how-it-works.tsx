"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { Eyebrow, WhatsAppIcon } from "./brand";
import { LODGES } from "./content";
import { EASE_OUT, CountUp, fadeUp, Item, popIn, Stagger } from "@/components/motion";

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

function BuildStep() {
  return (
    <div className="flex flex-col gap-2">
      <TeamBubble>Send me 5 to 10 photos, your rooms and prices, and your location pin.</TeamBubble>
      <motion.div
        variants={{ hidden: { opacity: 0, x: 12 }, show: { opacity: 1, x: 0, transition: { staggerChildren: 0.1 } } }}
        className="grid grid-cols-[repeat(3,52px)] gap-1 self-end rounded-[14px_14px_4px_14px] bg-brand-tint p-[5px]"
      >
        {PHOTOS.map((photo) => (
          <motion.span key={photo} variants={popIn} className="h-[52px] rounded-[9px]" style={{ background: photo }} />
        ))}
      </motion.div>
      <TeamBubble>
        Done. Your site is live.
        <br />
        <span className="mt-1.5 inline-flex h-7 items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 text-[12.5px] font-semibold">
          <span className="relative flex size-[7px]">
            <span className="absolute inset-0 animate-wa-ping rounded-full bg-[#1F7A4D]" />
            <span className="relative size-full rounded-full bg-[#1F7A4D] shadow-[0_0_0_3px_#E3F2EA]" />
          </span>
          mistvalley.stayzim.co.zw
        </span>
      </TeamBubble>
    </div>
  );
}

function BookStep() {
  return (
    <div className="flex flex-col gap-2.5">
      <motion.div
        variants={bubble}
        className="flex items-center gap-3 rounded-[14px] bg-white p-2 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
      >
        <span className="size-[52px] shrink-0 rounded-[9px]" style={{ background: LODGES[1]!.roomPhoto }} />
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[13.5px] font-semibold">Garden Cottage</span>
          <span className="text-[12.5px] whitespace-nowrap text-muted">$85 / night</span>
          <span className="text-[12.5px] whitespace-nowrap text-muted">Sleeps 2</span>
        </div>
        <motion.span
          className="inline-flex h-[30px] shrink-0 items-center gap-[5px] rounded-full bg-whatsapp px-[9px] text-xs font-semibold whitespace-nowrap"
          animate={{ scale: [1, 1.06, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
        >
          <WhatsAppIcon size={13} />
          Book
        </motion.span>
      </motion.div>
      <motion.span variants={fadeUp} className="flex self-center text-soft">
        <motion.span animate={{ y: [0, 4, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowDown size={18} strokeWidth={1.75} />
        </motion.span>
      </motion.span>
      <motion.div
        variants={bubble}
        className="flex flex-col gap-1.5 rounded-[14px_14px_4px_14px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
      >
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-muted">
          <WhatsAppIcon size={12} color="#4F5A60" />
          To Mist Valley Lodge
        </span>
        <span className="text-[13.5px] leading-[1.42]">Hi, I’d like to book the Garden Cottage at Mist Valley Lodge. Dates: ___</span>
      </motion.div>
    </div>
  );
}

function KeepStep() {
  const row: Variants = { hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0, transition: { duration: 0.4 } } };
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { staggerChildren: 0.18 } } }}
      className="flex flex-col gap-2.5 rounded-[14px] bg-white px-[18px] py-4 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
    >
      <motion.span variants={row} className="text-[11.5px] font-bold tracking-[0.06em] text-muted-2 uppercase">
        One night, booked direct
      </motion.span>
      <motion.div variants={row} className="flex items-baseline justify-between gap-3 text-[13.5px]">
        <span>Garden Cottage</span>
        <span className="whitespace-nowrap tabular-nums">$85.00</span>
      </motion.div>
      <motion.div variants={row} className="flex items-baseline justify-between gap-3 text-[13.5px] text-muted-2">
        <Struck colour="#C98E6B">Booking.com commission</Struck>
        <span className="whitespace-nowrap text-rust tabular-nums">
          <Struck colour="#A7551F">−$17.00</Struck>
        </span>
      </motion.div>
      <motion.div variants={row} className="flex items-baseline justify-between gap-3 text-[13.5px] text-slate">
        <span>StayZim commission</span>
        <span className="whitespace-nowrap tabular-nums">$0.00</span>
      </motion.div>
      <motion.div
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.6, ease: EASE_OUT } } }}
        className="my-0.5 h-0 origin-left border-t-[1.5px] border-dashed border-line-2"
      />
      <motion.div variants={row} className="flex items-baseline justify-between">
        <span className="text-sm font-semibold">You keep</span>
        <span className="font-display text-[30px] font-bold tracking-[-0.02em] text-brand">
          <CountUp to={85} decimals={2} prefix="$" delay={0.9} />
        </span>
      </motion.div>
    </motion.div>
  );
}

/** Text with a line drawn through it once it's revealed. */
function Struck({ colour, children }: { colour: string; children: ReactNode }) {
  return (
    <span className="relative inline-block">
      {children}
      <motion.span
        className="absolute top-1/2 left-0 h-px w-full origin-left"
        style={{ background: colour }}
        variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.5, delay: 0.3, ease: EASE_OUT } } }}
      />
    </span>
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
                Your site is live before you pay anything
              </h2>
            </Item>
          </div>
          <Item>
            <p className="text-base leading-relaxed text-pretty text-muted lg:text-lg lg:leading-7">
              Make it yourself in 5 minutes from your phone, or send us your photos on WhatsApp and we'll do it. Guests book you direct. Free for 2 days.
            </p>
          </Item>
        </Stagger>

        <Stagger stagger={0.18} amount={0.15} className="relative grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-3 lg:gap-7">
          <Step number="01" title="We build your site" body="Send us your photos and prices on WhatsApp. Your site goes live on its own web address.">
            <BuildStep />
          </Step>
          <Step
            number="02"
            title="Guests book you direct"
            body="Every room has a Book on WhatsApp button with the room already written in. On Growth and Pro, guests can also pick dates on your site and you confirm."
          >
            <BookStep />
          </Step>
          <Step number="03" title="You keep 100%" body="No commission. The guest pays you the way you already take payments.">
            <KeepStep />
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
