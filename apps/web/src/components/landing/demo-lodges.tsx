"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, MapPin } from "lucide-react";

import { Eyebrow, WhatsAppIcon } from "./brand";
import { LODGES, type Lodge } from "./content";
import { TrackedLink, WhatsAppLink } from "./cta";
import { EASE_OUT, Item, Reveal, Stagger } from "@/components/motion";

function LodgeCard({ lodge }: { lodge: Lodge }) {
  return (
    <TrackedLink
      href={`https://${lodge.domain}`}
      target="_blank"
      rel="noopener noreferrer"
      track={{ cta: `demo_lodge_${lodge.initials.toLowerCase()}`, section: "examples" }}
      className="group block overflow-hidden rounded-3xl bg-white text-ink no-underline shadow-[0_24px_50px_rgba(0,0,0,0.25)] hover:text-ink"
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <div className="relative h-[220px] overflow-hidden lg:h-[300px]">
        <div
          className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ background: lodge.photo }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,24,31,0)_35%,rgba(12,24,31,0.65)_100%)]" />
        <span
          className="absolute top-[18px] left-[18px] flex size-10 items-center justify-center rounded-[10px] font-serif text-[15px] font-semibold text-white shadow-[0_0_0_2px_rgba(255,255,255,0.75)]"
          style={{ background: lodge.colour }}
        >
          {lodge.initials}
        </span>
        <span className="absolute top-[18px] right-4 inline-flex h-[30px] items-center gap-1.5 rounded-full bg-whatsapp px-2.5 text-xs font-semibold">
          <WhatsAppIcon size={13} />
          Book on WhatsApp
        </span>
        <div className="absolute inset-x-5 bottom-[18px] flex flex-col gap-0.5 text-white">
          <span className="inline-flex items-center gap-[5px] text-[13px]">
            <MapPin size={13} strokeWidth={1.75} />
            {lodge.area}
          </span>
          <span className="font-serif text-[26px] leading-[1.1] font-semibold lg:text-[30px]">{lodge.name}</span>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 px-5 pt-[18px] pb-5">
        <div className="flex items-center justify-between gap-2.5 text-sm text-slate">
          <span>{lodge.summary}</span>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-muted-2">
            <span className="size-3 rounded-full" style={{ background: lodge.colour }} />
            {lodge.colourName}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2.5 border-t border-line-3 pt-3.5">
          <span className="truncate font-mono text-[13px] text-ink">{lodge.domain}</span>
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-300 group-hover:rotate-45"
            style={{ background: lodge.colour }}
          >
            <ArrowUpRight size={18} strokeWidth={1.75} />
          </span>
        </div>
      </div>
    </TrackedLink>
  );
}

export function DemoLodges() {
  return (
    <section id="examples" className="relative overflow-hidden bg-ink px-4 py-16 text-white lg:px-6 lg:pt-[120px] lg:pb-[136px]">
      {/* Rings rising from below, and a glow from above */}
      {[700, 1100, 1500].map((size, i) => (
        <motion.div
          key={size}
          className="absolute top-[105%] left-1/2 rounded-full border"
          style={{
            width: size,
            height: size,
            marginLeft: -size / 2,
            marginTop: -size / 2,
            borderColor: `rgba(255,255,255,${[0.07, 0.05, 0.04][i]})`,
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.6, delay: i * 0.15, ease: EASE_OUT }}
        />
      ))}
      <motion.div
        className="absolute -top-[240px] left-1/2 -ml-[450px] h-[500px] w-[900px] rounded-full bg-[radial-gradient(closest-side,rgba(0,150,190,0.28),rgba(0,150,190,0))]"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto max-w-[1120px]">
        <Stagger className="mb-9 flex flex-col gap-3.5 lg:mb-16 lg:items-center lg:gap-[18px]">
          <Item>
            <Eyebrow index="02" tone="sky">
              Demo lodges
            </Eyebrow>
          </Item>
          <Item>
            <h2 className="font-display text-[34px] leading-[37px] font-semibold tracking-[-0.03em] text-balance text-white lg:text-center lg:text-[52px] lg:leading-[56px]">
              Open a real lodge site
            </h2>
          </Item>
          <Item>
            <p className="text-base leading-relaxed text-pretty text-[#CED6DA] lg:text-center lg:text-lg lg:leading-7">
              Each lodge gets its own web address, its own colour and its own WhatsApp button.
            </p>
          </Item>
        </Stagger>

        <Stagger stagger={0.15} amount={0.15} className="grid items-start gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {LODGES.map((lodge, i) => (
            <Item
              key={lodge.domain}
              variants={{
                hidden: { opacity: 0, y: 60 },
                show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT } },
              }}
              // Staggered heights: outer cards sit lower, as in the design
              className={i === 1 ? "" : "lg:mt-12"}
            >
              <LodgeCard lodge={lodge} />
            </Item>
          ))}
        </Stagger>

        <Reveal className="mt-10 flex flex-col items-center justify-center gap-4 text-center sm:flex-row lg:mt-14">
          <span className="text-base text-[#CED6DA]">Want to see your own lodge? We build a demo for you first.</span>
          <WhatsAppLink
            message="demo"
            track={{ cta: "examples_demo", section: "examples" }}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/40 bg-white/[0.08] px-[22px] text-[15px] font-semibold whitespace-nowrap text-white no-underline transition-colors hover:bg-white/15 hover:text-white"
          >
            <WhatsAppIcon size={18} color="#FFFFFF" />
            Ask for a demo
          </WhatsAppLink>
        </Reveal>
      </div>
    </section>
  );
}
