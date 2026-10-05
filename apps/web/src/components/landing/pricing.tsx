"use client";

import { motion, type Variants } from "framer-motion";
import { BadgePercent, CircleCheck, CreditCard, Globe, Star } from "lucide-react";

import { Eyebrow, WhatsAppIcon } from "./brand";
import { PLANS, type Plan } from "./content";
import { WhatsAppLink } from "./cta";
import { EASE_OUT, Item, Stagger } from "./motion";

const planCard: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE_OUT, staggerChildren: 0.08, delayChildren: 0.35 } },
};

const feature: Variants = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

function PlanCard({ plan }: { plan: Plan }) {
  const featured = plan.featured === true;
  return (
    <motion.div
      variants={planCard}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`relative box-border flex flex-col gap-5 rounded-3xl bg-white p-6 lg:p-7 ${
        featured ? "border-2 border-purple shadow-[0_30px_60px_rgba(117,94,175,0.18)]" : "border border-line"
      }`}
    >
      {featured ? (
        <motion.span
          initial={{ scale: 0, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.7 }}
          className="absolute -top-[15px] left-1/2 inline-flex h-[30px] -translate-x-1/2 items-center gap-1.5 rounded-full bg-purple px-3.5 text-[13px] font-semibold whitespace-nowrap text-white"
        >
          <Star size={13} strokeWidth={2} />
          Most popular
        </motion.span>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-[22px] font-semibold">{plan.name}</h3>
          <span className={`text-sm font-semibold ${featured ? "text-purple-dark" : "text-muted-2"}`}>{plan.tagline}</span>
        </div>
        <p className="text-[14.5px] leading-[21px] text-muted">{plan.description}</p>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span
          className={`font-display leading-none font-bold tracking-[-0.04em] ${featured ? "text-[52px] lg:text-6xl" : "text-[52px]"}`}
        >
          {plan.price}
        </span>
        <span className="text-[15px] text-muted">/month</span>
      </div>

      <WhatsAppLink
        message={plan.id}
        track={{ cta: `pricing_${plan.id}`, section: "pricing", plan: plan.id }}
        className={`inline-flex h-[52px] w-full items-center justify-center rounded-full text-[15.5px] font-semibold whitespace-nowrap text-ink no-underline hover:text-ink ${
          featured
            ? "gap-2.5 bg-whatsapp pr-[26px] pl-5 shadow-[0_6px_16px_rgba(12,24,31,0.10)]"
            : "gap-2 border border-[#CED6DA] bg-white px-[22px] transition-colors hover:border-ink"
        }`}
      >
        {featured ? <WhatsAppIcon size={22} /> : <WhatsAppIcon size={17} color="#4F5A60" />}
        {plan.cta}
      </WhatsAppLink>

      <div className="h-px bg-line-3" />

      <ul className="flex flex-col gap-3">
        {plan.features.map((text) => (
          <motion.li key={text} variants={feature} className="flex items-start gap-2.5 text-[15px] leading-[22px] text-ink-2">
            <CircleCheck size={17} strokeWidth={1.5} className="mt-0.5 shrink-0 text-brand" />
            <span>{text}</span>
          </motion.li>
        ))}
      </ul>

      {featured ? (
        <motion.div variants={feature} className="mt-auto flex flex-col gap-2 rounded-[14px] bg-purple-tint px-4 py-3.5">
          <span className="text-xs font-bold tracking-[0.06em] text-purple-dark uppercase">Coming to Growth</span>
          <span className="text-sm leading-[21px] text-slate">
            Your own .co.zw domain, a booking calendar, deposits by Paynow or InnBucks, Instagram feed, local SEO.
          </span>
        </motion.div>
      ) : null}
    </motion.div>
  );
}

const PROMISES = [
  { icon: CreditCard, text: "Pay monthly by Paynow, EcoCash or InnBucks" },
  { icon: BadgePercent, text: "0% commission on every booking" },
  { icon: Globe, text: "Your site stays yours while you are with us" },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-[linear-gradient(180deg,#EFF9FD_0%,#FFFFFF_60%)] px-4 py-16 lg:bg-[linear-gradient(180deg,#EFF9FD_0%,#FFFFFF_70%)] lg:px-6 lg:py-[120px]">
      <div className="mx-auto max-w-[1120px]">
        <Stagger className="mb-12 flex flex-col gap-3.5 lg:mb-16 lg:items-center lg:gap-[18px]">
          <Item>
            <Eyebrow index="04">Pricing</Eyebrow>
          </Item>
          <Item>
            <h2 className="font-display text-[34px] leading-[37px] font-semibold tracking-[-0.03em] text-balance lg:text-center lg:text-[52px] lg:leading-[56px]">
              Pick a plan after your free trial
            </h2>
          </Item>
          <Item>
            <p className="text-base leading-relaxed text-pretty text-muted lg:text-center lg:text-lg lg:leading-7">
              Every lodge starts on Growth for 14 days, with the site already built. No commission on any plan.
            </p>
          </Item>
        </Stagger>

        <Stagger
          stagger={0.14}
          amount={0.1}
          className="grid items-stretch gap-8 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)_minmax(0,1fr)] lg:gap-5"
        >
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </Stagger>

        <Stagger
          stagger={0.1}
          className="mt-8 flex flex-col items-start gap-3 text-[15px] text-slate lg:mt-7 lg:flex-row lg:items-center lg:justify-center lg:gap-7"
        >
          {PROMISES.map(({ icon: Icon, text }) => (
            <Item key={text} className="inline-flex items-center gap-2">
              <Icon size={18} strokeWidth={1.5} className="shrink-0 text-brand" />
              {text}
            </Item>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
