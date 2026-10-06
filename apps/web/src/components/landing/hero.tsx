"use client";

import { animate, motion, useMotionValue, useScroll, useTransform } from "framer-motion";
import { ArrowRight, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { WhatsAppIcon } from "./brand";
import { LOCATIONS, LODGES, type Lodge } from "./content";
import { TrackedLink, WhatsAppLink } from "./cta";
import { EASE_OUT, fadeUp } from "@/components/motion";

const RINGS = [
  { size: 600, color: "#DCE3E7" },
  { size: 940, color: "#E4E9EC" },
  { size: 1300, color: "#EAEEF1" },
  { size: 1680, color: "#EFF2F4" },
];

/** "20%" counts up from 0 once, when the headline lands. */
function CountUp({ to, delay }: { to: number; delay: number }) {
  const value = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(value, to, { duration: 1.2, delay, ease: EASE_OUT, onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [delay, to, value]);

  return <>{display}%</>;
}

function LocationPill({ name, color, featured, small }: { name: string; color: string; featured: boolean; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#E3E9EC] bg-white whitespace-nowrap ${
        small
          ? "h-[30px] gap-1 pr-2.5 pl-[7px] text-[12.5px] font-semibold shadow-[0_3px_10px_rgba(12,24,31,0.06)]"
          : `h-[38px] gap-1.5 pr-3.5 pl-2.5 text-sm ${
              featured ? "font-semibold shadow-[0_4px_14px_rgba(12,24,31,0.07)]" : "text-muted"
            }`
      }`}
    >
      <MapPin size={small ? 14 : 17} strokeWidth={2} style={{ color }} />
      {name}
    </span>
  );
}

/** Phone showing a lodge site, as in the hero. Drawn at desktop size; scaled down on small screens. */
function LodgePhone({ lodge, centre }: { lodge: Lodge; centre?: boolean }) {
  return (
    <div
      className={`box-border bg-ink p-[7px] ${
        centre
          ? "h-[500px] w-[250px] rounded-[40px] shadow-[0_20px_50px_rgba(0,125,162,0.22)]"
          : "h-[470px] w-[236px] rounded-[38px]"
      }`}
    >
      <div className={`relative h-full overflow-hidden bg-white ${centre ? "rounded-[33px]" : "rounded-[31px]"}`}>
        <div className={`relative ${centre ? "h-[210px]" : "h-[200px]"}`} style={{ background: lodge.photo }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_40%,rgba(10,16,13,0.68)_100%)]" />
          <div className="absolute bottom-3.5 left-3.5 flex flex-col gap-0.5 text-white">
            <span className="text-[11px]">{lodge.area}</span>
            <span className={`font-serif font-semibold ${centre ? "text-[23px] leading-[27px]" : "text-[22px] leading-[26px]"}`}>
              {lodge.name}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2.5 px-3 py-3.5">
          <span className="font-serif text-[17px] font-semibold" style={{ color: lodge.colour }}>
            Rooms
          </span>
          <div className={`relative rounded-[10px] ${centre ? "h-[116px]" : "h-[110px]"}`} style={{ background: lodge.roomPhoto }}>
            <span
              className="absolute bottom-2 left-2 inline-flex h-[22px] items-center rounded-[5px] px-2 text-[11px] font-semibold text-white"
              style={{ background: lodge.colour }}
            >
              {lodge.price}
            </span>
          </div>
        </div>
        {centre ? (
          <motion.div
            className="absolute inset-x-3 bottom-3.5 flex h-[42px] items-center justify-center gap-2 rounded-full bg-whatsapp text-[13px] font-semibold text-ink"
            animate={{ boxShadow: ["0 0 0 0 rgba(37,211,102,0.45)", "0 0 0 10px rgba(37,211,102,0)"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut", delay: 1.8 }}
          >
            <WhatsAppIcon size={16} />
            Book on WhatsApp
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}

const [mistValley, msasaRidge, lakeview] = LODGES as [Lodge, Lodge, Lodge];

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const centreY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const sideY = useTransform(scrollYProgress, [0, 1], [0, -30]);
  const ringsScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section ref={ref} id="top" className="relative overflow-hidden bg-white text-ink" data-section="hero">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_500px_400px_at_50%_100%,#C9EAF6_0%,#E6F5FB_45%,rgba(255,255,255,0)_100%)] lg:bg-[radial-gradient(ellipse_1000px_600px_at_50%_100%,#C9EAF6_0%,#E6F5FB_45%,rgba(255,255,255,0)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-[300px] bg-[linear-gradient(180deg,#F0F7FA_0%,rgba(241,245,242,0)_100%)]" />
      <motion.div className="absolute top-[300px] left-1/2 lg:top-[400px]" style={{ scale: ringsScale }}>
        {RINGS.map((ring, i) => (
          <motion.div
            key={ring.size}
            className="absolute rounded-full border"
            style={{
              width: ring.size,
              height: ring.size,
              left: -ring.size / 2,
              top: -ring.size / 2,
              borderColor: ring.color,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.1 + i * 0.12, ease: EASE_OUT }}
          />
        ))}
      </motion.div>

      {/* Location pills, scattered around the headline on wide screens */}
      <div className="pointer-events-none absolute inset-0 hidden xl:block" aria-hidden="true">
        {LOCATIONS.map((location, i) => (
          <motion.div
            key={location.name}
            className={`absolute ${location.featured ? "" : "hidden wide:block"}`}
            style={{
              top: location.top,
              [location.side]: `calc(50% - ${location.offset}px)`,
            }}
            initial={{ opacity: 0, y: 16, x: location.side === "left" ? 24 : -24 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.9, delay: 0.5 + i * 0.07, ease: EASE_OUT }}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4 + (i % 3), delay: i * 0.3, repeat: Infinity, ease: "easeInOut" }}
            >
              <LocationPill {...location} />
            </motion.div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="relative mx-auto flex max-w-[1120px] flex-col items-center px-5 pt-[110px] lg:pt-[144px]"
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } }}
      >
        <motion.span
          variants={fadeUp}
          className="inline-flex h-[30px] items-center gap-2 rounded-full bg-brand-tint px-3 text-[13px] font-semibold text-brand lg:h-8 lg:px-3.5 lg:text-sm"
        >
          <span className="relative flex size-1.5 lg:size-[7px]">
            <span className="absolute inset-0 animate-wa-ping rounded-full bg-brand" />
            <span className="relative size-full rounded-full bg-brand" />
          </span>
          Made in Mutare for Zimbabwean lodges
        </motion.span>

        <motion.h1
          variants={fadeUp}
          className="mt-4 text-center font-display text-[44px] leading-[46px] font-bold tracking-[-0.035em] text-balance sm:text-[56px] sm:leading-[60px] lg:mt-[18px] lg:text-[72px] lg:leading-[78px] lg:tracking-[-0.03em]"
        >
          Stop paying{" "}
          <span className="text-brand tabular-nums">
            <CountUp to={20} delay={0.5} />
          </span>{" "}
          to
          <br className="hidden lg:block" /> Booking.com
        </motion.h1>

        <motion.p
          variants={fadeUp}
          className="mt-3.5 text-center text-[17px] leading-[26px] text-slate lg:mt-5 lg:text-xl lg:leading-[30px]"
        >
          Your own lodge website. Guests book on WhatsApp.
        </motion.p>

        <motion.div
          variants={fadeUp}
          className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-3 lg:mt-[30px]"
        >
          <TrackedLink
            href="/signup"
            track={{ cta: "hero_signup", section: "hero" }}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-brand px-7 text-[17px] font-semibold whitespace-nowrap text-white no-underline shadow-[0_10px_24px_-10px_rgba(0,125,162,0.8)] hover:bg-brand-dark hover:text-white"
          >
            Make my free site
            <ArrowRight size={19} strokeWidth={2} />
          </TrackedLink>
          <WhatsAppLink
            message="general"
            track={{ cta: "hero_whatsapp", section: "hero" }}
            className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-full border border-[#CED6DA] bg-white pr-[22px] pl-4 text-base font-semibold whitespace-nowrap text-ink no-underline hover:text-ink sm:h-14"
          >
            <WhatsAppIcon size={20} />
            Chat on WhatsApp
          </WhatsAppLink>
        </motion.div>

        {/* Location pills as a row, below xl */}
        <motion.div
          className="mt-6 flex max-w-[520px] flex-wrap justify-center gap-1.5 xl:hidden"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        >
          {LOCATIONS.map((location) => (
            <motion.span key={location.name} variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}>
              <LocationPill {...location} small />
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Lodge phones, rising from the bottom edge */}
      <div className="relative mt-7 h-[330px] overflow-hidden lg:mt-12 lg:h-[300px] xl:mt-[130px]" aria-hidden="true">
        <div className="absolute top-6 left-1/2 -ml-[118px] h-[470px] w-[236px] origin-bottom -translate-x-[120px] -rotate-9 lg:top-[52px] lg:-translate-x-[260px] lg:-rotate-8">
          <motion.div style={{ y: sideY }}>
            <motion.div
              initial={{ opacity: 0, y: 140, rotate: -6 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.55 }}
              className="origin-top max-lg:scale-[0.85]"
            >
              <LodgePhone lodge={msasaRidge} />
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute top-6 left-1/2 -ml-[118px] h-[470px] w-[236px] origin-bottom translate-x-[120px] rotate-9 lg:top-[52px] lg:translate-x-[260px] lg:rotate-8">
          <motion.div style={{ y: sideY }}>
            <motion.div
              initial={{ opacity: 0, y: 140, rotate: 6 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.65 }}
              className="origin-top max-lg:scale-[0.85]"
            >
              <LodgePhone lodge={lakeview} />
            </motion.div>
          </motion.div>
        </div>
        <div className="absolute top-0 left-1/2 -ml-[125px] h-[500px] w-[250px] lg:top-5">
          <motion.div style={{ y: centreY }}>
            <motion.div
              initial={{ opacity: 0, y: 160 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 70, damping: 16, delay: 0.4 }}
              className="origin-top max-lg:scale-[0.856]"
            >
              <LodgePhone lodge={mistValley} centre />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
