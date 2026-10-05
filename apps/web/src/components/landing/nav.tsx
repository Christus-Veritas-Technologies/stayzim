"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Wordmark, WhatsAppIcon } from "./brand";
import { NAV_LINKS } from "./content";
import { TrackedLink, WhatsAppLink } from "./cta";
import { EASE_OUT } from "./motion";

/** Which section is under the nav, for the highlight. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const navIds = new Set<string>(NAV_LINKS.map(({ id }) => id));
    let frame = 0;

    // The current section is the last one whose top has passed just below the
    // nav. Sections without a nav link (hero, the maths, ...) clear the highlight.
    const update = () => {
      frame = 0;
      let current: string | null = null;
      for (const section of document.querySelectorAll<HTMLElement>("main > section")) {
        if (section.getBoundingClientRect().top <= 120) current = section.id;
      }
      setActive(current && navIds.has(current) ? current : null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return active;
}

export function Nav() {
  const active = useActiveSection();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 24));

  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-50 px-3 pt-2.5 sm:px-6 lg:pt-5"
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
    >
      <nav
        className={`relative mx-auto flex h-[60px] max-w-[1120px] items-center justify-between rounded-[14px] border border-line-2 bg-white/95 pr-2 pl-3 backdrop-blur transition-shadow duration-300 lg:grid lg:h-16 lg:grid-cols-[1fr_auto_1fr] lg:pr-2.5 lg:pl-3.5 ${
          scrolled ? "shadow-[0_8px_30px_rgba(12,24,31,0.10)]" : "shadow-[0_2px_10px_rgba(0,125,162,0.06)]"
        }`}
        aria-label="Main"
      >
        <a href="#top" className="text-[19px] text-brand no-underline lg:text-[22px]" aria-label="StayZim home">
          {/* Wrappers own the visibility; Wordmark's own inline-flex would override `hidden` */}
          <span className="lg:hidden">
            <Wordmark size={30} />
          </span>
          <span className="hidden lg:inline">
            <Wordmark size={34} />
          </span>
        </a>

        <ul className="hidden items-center gap-1.5 text-[15px] lg:flex">
          {NAV_LINKS.map((link) => {
            const isActive = active === link.id;
            return (
              <li key={link.id} className="relative">
                {isActive ? (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-lg bg-brand-tint"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                ) : null}
                <a
                  href={`#${link.id}`}
                  className={`relative inline-flex h-10 items-center gap-2 rounded-lg px-3 whitespace-nowrap no-underline transition-colors xl:px-3.5 ${
                    isActive ? "font-semibold text-brand" : "text-ink hover:bg-surface hover:text-ink"
                  }`}
                >
                  {link.label}
                  {"badge" in link ? (
                    // No room for the badge between lg and xl; the pricing section says it anyway
                    <span className="hidden h-5 items-center rounded-full bg-[#FDE6DA] px-[7px] text-xs font-semibold text-rust xl:inline-flex">
                      {link.badge}
                    </span>
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-1.5 lg:gap-2">
          <TrackedLink
            href="/login"
            track={{ cta: "nav_login", section: "nav" }}
            className="hidden h-11 items-center rounded-lg bg-[#F0F4F7] px-4 text-[15px] font-semibold whitespace-nowrap text-ink no-underline hover:text-ink lg:inline-flex"
          >
            Log in
          </TrackedLink>
          <WhatsAppLink
            message="general"
            track={{ cta: "nav_whatsapp", section: "nav" }}
            className="inline-flex h-10 items-center gap-[7px] rounded-full bg-whatsapp pr-3 pl-2.5 text-[13.5px] font-semibold whitespace-nowrap text-ink no-underline hover:text-ink lg:h-11 lg:gap-2 lg:pr-[18px] lg:pl-3.5 lg:text-[15px]"
          >
            <WhatsAppIcon size={18} />
            Chat on WhatsApp
          </WhatsAppLink>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-[10px] bg-[#F0F4F7] text-ink lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={open ? "close" : "open"}
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="flex"
              >
                {open ? <X size={19} strokeWidth={1.75} /> : <Menu size={19} strokeWidth={1.75} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <AnimatePresence>
          {open ? (
            <motion.div
              className="absolute inset-x-0 top-[calc(100%+8px)] rounded-[14px] border border-line-2 bg-white p-2 shadow-[0_20px_40px_rgba(12,24,31,0.14)] lg:hidden"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
            >
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                {NAV_LINKS.map((link) => (
                  <motion.li key={link.id} variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                    <a
                      href={`#${link.id}`}
                      onClick={() => setOpen(false)}
                      className={`flex h-12 items-center justify-between rounded-lg px-3 text-base no-underline ${
                        active === link.id ? "bg-brand-tint font-semibold text-brand" : "text-ink hover:text-ink"
                      }`}
                    >
                      {link.label}
                      {"badge" in link ? (
                        <span className="inline-flex h-5 items-center rounded-full bg-[#FDE6DA] px-[7px] text-xs font-semibold text-rust">
                          {link.badge}
                        </span>
                      ) : null}
                    </a>
                  </motion.li>
                ))}
                <motion.li variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}>
                  <TrackedLink
                    href="/login"
                    track={{ cta: "nav_login", section: "nav" }}
                    className="mt-1 flex h-12 items-center rounded-lg bg-[#F0F4F7] px-3 text-base font-semibold text-ink no-underline hover:text-ink"
                  >
                    Log in
                  </TrackedLink>
                </motion.li>
              </motion.ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
}
