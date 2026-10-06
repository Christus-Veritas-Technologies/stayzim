"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

import { WhatsAppIcon } from "./brand";
import { TrackedLink, WhatsAppLink } from "./cta";
import { CountUp, EASE_OUT, Item, Stagger } from "@/components/motion";

const VISIT_BARS = [14, 22, 18, 30, 26, 40, 34];
const DARK_CARD =
  "box-border rounded-[18px] bg-ink p-4 text-white shadow-[0_24px_48px_-12px_rgba(0,30,45,0.55),inset_0_0_0_1px_rgba(255,255,255,0.08)]";

export function FinalCta() {
  return (
    <section className="relative bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_60%,#0C181F_60%,#0C181F_100%)] px-3 pt-6 lg:bg-[linear-gradient(180deg,#FFFFFF_0%,#FFFFFF_58%,#0C181F_58%,#0C181F_100%)] lg:px-6 lg:pt-12">
      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.9, ease: EASE_OUT }}
        className="relative mx-auto flex max-w-[1180px] flex-col gap-2 rounded-[32px] bg-[#E9EFF2] p-2 shadow-[0_40px_60px_-30px_rgba(12,24,31,0.5)] lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:gap-3.5 lg:rounded-[40px] lg:p-3.5 lg:shadow-[0_50px_90px_-40px_rgba(12,24,31,0.5)]"
      >
        {/* Pitch */}
        <Stagger
          delay={0.3}
          className="box-border flex flex-col justify-between gap-6 rounded-3xl bg-white px-[22px] pt-7 pb-[22px] lg:min-h-[500px] lg:gap-8 lg:rounded-[28px] lg:px-[52px] lg:pt-[52px] lg:pb-12"
        >
          <div className="flex flex-col gap-[18px] lg:gap-[22px]">
            <Item>
              <span className="inline-flex h-9 w-max items-center gap-2 rounded-full bg-surface-2 pr-3.5 pl-2.5 text-sm font-medium text-ink-2">
                <span className="flex size-[22px] items-center justify-center rounded-full bg-white text-brand shadow-[0_1px_2px_rgba(12,24,31,0.08)]">
                  <motion.span
                    animate={{ rotate: [0, 15, -10, 0], scale: [1, 1.15, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}
                    className="flex"
                  >
                    <Sparkles size={13} strokeWidth={1.75} />
                  </motion.span>
                </span>
                Free for 2 days, live in 5 minutes
              </span>
            </Item>
            <Item>
              <h2 className="font-display text-[38px] leading-10 font-semibold tracking-[-0.03em] text-balance lg:text-6xl lg:leading-[62px] lg:tracking-[-0.035em]">
                Your lodge, booked direct
              </h2>
            </Item>
            <Item>
              <p className="max-w-[400px] text-base leading-relaxed text-muted lg:text-lg lg:leading-7">
                Sign up and make your site yourself in 5 minutes, or message us and we'll help. It's live before you pay anything.
              </p>
            </Item>
          </div>
          <Item className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
            <TrackedLink
              href="/signup"
              track={{ cta: "final_signup", section: "final_cta" }}
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand px-7 text-[17px] font-semibold whitespace-nowrap text-white no-underline shadow-[0_10px_24px_-10px_rgba(0,125,162,0.8)] hover:bg-brand-dark hover:text-white"
            >
              Make my free site
              <ArrowRight size={19} strokeWidth={2} />
            </TrackedLink>
            <WhatsAppLink
              message="general"
              track={{ cta: "final_whatsapp", section: "final_cta" }}
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-full border border-[#DDE3E7] bg-white pr-6 pl-4 text-base font-semibold whitespace-nowrap text-ink no-underline hover:text-ink"
            >
              <WhatsAppIcon size={20} />
              Chat on WhatsApp
            </WhatsAppLink>
          </Item>
        </Stagger>

        {/* What owners see: a booking chat, visits and earnings */}
        <div
          className="relative flex flex-col gap-2.5 overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#0BA2C9_0%,#007DA2_48%,#005A74_100%)] p-5 lg:block lg:min-h-[500px] lg:rounded-[28px] lg:p-0"
          aria-hidden="true"
        >
          {[300, 500, 700, 900].map((size, i) => (
            <motion.div
              key={size}
              className="absolute top-[40%] left-1/2 rounded-full border lg:top-[52%]"
              style={{
                width: size,
                height: size,
                marginLeft: -size / 2,
                marginTop: -size / 2,
                borderColor: `rgba(255,255,255,${[0.22, 0.15, 0.1, 0.06][i]})`,
              }}
              animate={{ scale: [1, 1.05, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 6, delay: i * 0.8, repeat: Infinity, ease: "easeInOut" }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT }}
            className="relative lg:absolute lg:top-11 lg:left-1/2 lg:-ml-[165px] lg:w-[330px]"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className={DARK_CARD}
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[rgba(167,147,226,0.2)]">
                  <WhatsAppIcon size={16} color="#A793E2" />
                </span>
                <div className="flex flex-1 flex-col gap-px">
                  <span className="text-sm font-semibold">Garden Cottage</span>
                  <span className="text-xs text-dim">New booking chat</span>
                </div>
                <span className="text-xs text-dim">10:38</span>
              </div>
              <div className="mt-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-[13px] leading-[19px] text-[#E3E9EC]">
                Hi, I’d like to book the Garden Cottage at Mist Valley Lodge. Dates: 12 to 14 October
              </div>
              <div className="mt-3 flex gap-2">
                <span className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-whatsapp text-[13px] font-semibold text-ink">
                  <WhatsAppIcon size={14} />
                  Reply
                </span>
                <span className="flex h-9 items-center rounded-full bg-white/[0.08] px-3.5 text-[13px] font-semibold">Later</span>
              </div>
            </motion.div>
          </motion.div>

          <div className="relative grid grid-cols-2 gap-2.5 lg:static lg:block">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.6, ease: EASE_OUT }}
              className="lg:absolute lg:bottom-9 lg:left-9 lg:w-[236px]"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 6, delay: 0.8, repeat: Infinity, ease: "easeInOut" }}
                className={`h-full ${DARK_CARD}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[12.5px] text-dim">Visits this week</span>
                  <span className="inline-flex h-[22px] items-center gap-[3px] rounded-md bg-[rgba(31,122,77,0.25)] px-[7px] text-xs font-semibold text-[#7EE2A8]">
                    <TrendingUp size={12} strokeWidth={2} />
                    18%
                  </span>
                </div>
                <div className="mt-2 font-display text-[34px] leading-9 font-semibold tracking-[-0.03em]">
                  <CountUp to={86} delay={0.8} />
                </div>
                <motion.div
                  className="mt-3 flex h-10 items-end gap-[5px]"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.9 } } }}
                >
                  {VISIT_BARS.map((height, i) => (
                    <motion.span
                      key={i}
                      className={`flex-1 origin-bottom rounded ${i === 5 ? "bg-brand-sky" : "bg-[rgba(120,203,231,0.28)]"}`}
                      style={{ height }}
                      variants={{
                        hidden: { scaleY: 0 },
                        show: { scaleY: 1, transition: { type: "spring", stiffness: 200, damping: 18 } },
                      }}
                    />
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.75, ease: EASE_OUT }}
              className="lg:absolute lg:right-9 lg:bottom-9 lg:w-[236px]"
            >
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5.5, delay: 1.6, repeat: Infinity, ease: "easeInOut" }}
                className={`h-full ${DARK_CARD}`}
              >
                <span className="text-[12.5px] text-dim">You keep</span>
                <div className="mt-2 font-display text-[34px] leading-9 font-semibold tracking-[-0.03em]">
                  <CountUp to={85} prefix="$" delay={1} />
                  <span className="text-[#5E6A70]">.00</span>
                </div>
                <div className="mt-3.5 flex flex-col gap-1.5">
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#007DA2,#78CBE7)]"
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 1.1, ease: EASE_OUT }}
                    />
                  </div>
                  <div className="flex justify-between gap-1 text-[11.5px] text-dim">
                    <span>0% commission</span>
                    <span>One night</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
