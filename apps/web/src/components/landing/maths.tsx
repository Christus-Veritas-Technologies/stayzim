"use client";

import { motion } from "framer-motion";
import { ArrowDown, ArrowRight } from "lucide-react";

import { Eyebrow } from "./brand";
import { CountUp, EASE_OUT, Item, Reveal, Stagger } from "@/components/motion";

/** A bar that grows to its width when scrolled into view. */
function GrowBar({ width, delay, className, children }: { width: string; delay: number; className: string; children: React.ReactNode }) {
  return (
    <motion.span
      className={`flex h-full items-center overflow-hidden ${className}`}
      initial={{ width: 0 }}
      whileInView={{ width }}
      viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 1, delay, ease: EASE_OUT }}
    >
      {children}
    </motion.span>
  );
}

export function Maths() {
  return (
    <section className="bg-white px-4 py-16 lg:px-6 lg:py-[120px]">
      <div className="mx-auto max-w-[1120px]">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-[72px]">
          <Stagger className="flex flex-col gap-3.5 lg:gap-[18px]">
            <Item>
              <Eyebrow index="03">The maths</Eyebrow>
            </Item>
            <Item>
              <h2 className="font-display text-[34px] leading-[37px] font-semibold tracking-[-0.03em] text-balance lg:text-[52px] lg:leading-[56px]">
                One direct booking a month pays for StayZim
              </h2>
            </Item>
            <Item>
              <p className="text-base leading-relaxed text-pretty text-muted lg:text-lg lg:leading-7">
                Booking.com keeps 15 to 20% of every booking. When a guest books on your own site, they message you and you keep
                the full price.
              </p>
            </Item>
          </Stagger>

          <Reveal className="flex flex-col gap-6 rounded-3xl border border-[#EAEFF2] bg-surface p-5 lg:gap-7 lg:p-8">
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between gap-3 text-sm lg:text-[15px]">
                <span className="font-semibold">One $85 night on Booking.com</span>
                <span className="whitespace-nowrap text-muted">You get $68</span>
              </div>
              <div className="flex h-12 overflow-hidden rounded-xl bg-white lg:h-14">
                <GrowBar width="80%" delay={0.2} className="bg-[#CED6DA] pl-4 font-display text-lg font-semibold text-ink-2">
                  $68
                </GrowBar>
                <GrowBar
                  width="20%"
                  delay={1}
                  className="justify-center bg-[repeating-linear-gradient(135deg,#F9CDB5_0_6px,#F4BC9C_6px_12px)] font-display text-[15px] font-semibold whitespace-nowrap text-[#7A3A12]"
                >
                  −$17
                </GrowBar>
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex justify-between gap-3 text-sm lg:text-[15px]">
                <span className="font-semibold">The same night on your StayZim site</span>
                <span className="font-semibold whitespace-nowrap text-brand">You get $85</span>
              </div>
              <div className="flex h-12 overflow-hidden rounded-xl bg-white lg:h-14">
                <GrowBar
                  width="100%"
                  delay={0.5}
                  className="bg-[linear-gradient(90deg,#007DA2,#0096BE)] pl-4 font-display text-lg font-semibold text-white"
                >
                  $85
                </GrowBar>
              </div>
            </div>
          </Reveal>
        </div>

        {/* The ticket: $85 covers $40 */}
        <Reveal className="mt-10 lg:mt-14" amount={0.4}>
          <div className="relative grid items-center gap-5 overflow-hidden rounded-[28px] bg-[linear-gradient(150deg,#0096BE_0%,#007DA2_50%,#006483_100%)] px-6 py-8 text-white lg:grid-cols-[1fr_120px_1fr] lg:px-16 lg:py-11">
            {[420, 280, 160].map((size, i) => (
              <motion.div
                key={size}
                className="absolute top-0 left-full rounded-full border lg:top-1/2 lg:left-[86%]"
                style={{
                  width: size,
                  height: size,
                  marginLeft: -size / 2,
                  marginTop: -size / 2,
                  borderColor: `rgba(255,255,255,${[0.08, 0.12, 0.16][i]})`,
                }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 5, delay: i * 0.6, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
            <div className="relative flex flex-col gap-1.5">
              <span className="text-[15px] text-brand-tint lg:text-[17px]">One night booked direct</span>
              <span className="font-display text-[64px] leading-none font-bold tracking-[-0.04em] lg:text-8xl">
                <CountUp to={85} prefix="$" duration={1.2} />
              </span>
            </div>
            <div className="relative flex flex-row items-center gap-3 lg:flex-col lg:gap-2">
              <motion.span
                className="flex size-14 items-center justify-center rounded-full border border-white/25 bg-white/[0.14]"
                initial={{ scale: 0, rotate: -90 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
              >
                <ArrowDown size={22} strokeWidth={1.75} className="lg:hidden" />
                <ArrowRight size={22} strokeWidth={1.75} className="hidden lg:block" />
              </motion.span>
              <span className="text-[13px] font-semibold tracking-[0.04em] text-brand-tint uppercase">covers</span>
            </div>
            <div className="relative flex flex-col gap-1.5 lg:text-right">
              <span className="text-[15px] text-brand-tint lg:text-[17px]">A month of Growth</span>
              <span className="font-display text-[64px] leading-none font-bold tracking-[-0.04em] lg:text-8xl">
                <CountUp to={40} prefix="$" duration={1.2} delay={0.6} />
              </span>
            </div>
          </div>
          <p className="mt-4 text-center text-sm text-muted-2">Example price. Most lodges charge $80 to $250 a night.</p>
        </Reveal>
      </div>
    </section>
  );
}
