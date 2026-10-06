"use client";

import { motion } from "framer-motion";

import { CONTACT_EMAIL } from "@/lib/whatsapp";

import { LogoMark, Wordmark, WhatsAppIcon } from "./brand";
import { FOOTER_COLUMNS } from "./content";
import { WhatsAppLink } from "./cta";
import { EASE_OUT, Item, Stagger } from "@/components/motion";

const linkClass = "inline-flex items-center gap-2 text-[15px] text-soft no-underline transition-colors hover:text-white";

export function Footer() {
  return (
    <footer className="overflow-hidden bg-ink px-5 pt-14 pb-[110px] text-white lg:px-6 lg:pt-24 lg:pb-8">
      <div className="mx-auto max-w-[1120px]">
        <Stagger className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
          <Item className="flex flex-col gap-3.5">
            <Wordmark size={38} className="text-2xl text-white" />
            <span className="max-w-[320px] text-[15px] leading-[23px] text-soft">
              Lodge websites with booking on WhatsApp, for lodges across Zimbabwe.
            </span>
          </Item>
          <Item className="flex flex-col gap-2 font-display text-[22px] font-medium tracking-[-0.015em] lg:items-end lg:text-[26px]">
            <WhatsAppLink
              message="general"
              track={{ cta: "footer_whatsapp", section: "footer" }}
              className="inline-flex items-center gap-3 text-white no-underline hover:text-whatsapp"
              whileHover={{ x: 2 }}
            >
              <WhatsAppIcon size={24} color="#25D366" />
              Chat on WhatsApp
            </WhatsAppLink>
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-soft no-underline transition-colors hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </Item>
        </Stagger>

        <div className="mt-10 mb-8 h-px bg-white/10 lg:mt-14 lg:mb-12" />

        <Stagger stagger={0.08} className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:gap-10">
          {FOOTER_COLUMNS.map((column) => (
            <Item key={column.title} className="flex flex-col gap-3 lg:gap-3.5">
              <span className="text-sm font-semibold text-white">{column.title}</span>
              {column.links.map((link) =>
                "href" in link ? (
                  <a key={link.label} href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                ) : "whatsapp" in link ? (
                  <WhatsAppLink
                    key={link.label}
                    message={link.whatsapp}
                    track={{ cta: `footer_${link.whatsapp}`, section: "footer" }}
                    className={linkClass}
                    whileHover={{ x: 2 }}
                  >
                    {link.label}
                  </WhatsAppLink>
                ) : (
                  <span key={link.label} className="text-[15px] text-soft">
                    {link.label}
                  </span>
                ),
              )}
            </Item>
          ))}
        </Stagger>

        {/* Full-width wordmark, sliding up from behind the edge */}
        {/* The row triggers the reveal: the wordmark itself starts clipped, so it can never "enter view" */}
        <motion.div
          className="mt-12 flex items-center gap-4 overflow-hidden pb-2 lg:mt-20 lg:gap-7"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.6, rotate: -12 },
              show: { opacity: 1, scale: 1, rotate: 0, transition: { type: "spring", stiffness: 120, damping: 14 } },
            }}
          >
            <LogoMark size={64} className="sm:hidden" />
            <LogoMark size={110} className="hidden sm:block lg:hidden" />
            <LogoMark size={150} className="hidden lg:block" />
          </motion.div>
          <motion.span
            variants={{
              hidden: { y: "100%", opacity: 0 },
              show: { y: 0, opacity: 1, transition: { duration: 1, ease: EASE_OUT, delay: 0.1 } },
            }}
            className="font-display text-[clamp(64px,14.7vw,212px)] leading-[0.8] font-bold tracking-[-0.055em]"
          >
            StayZim
          </motion.span>
        </motion.div>

        <div className="mt-8 flex justify-between border-t border-white/10 pt-5 text-[13.5px] text-dim lg:mt-14 lg:pt-6 lg:text-sm">
          <span className="inline-flex items-center gap-2">
            © {new Date().getFullYear()} StayZim
            <span className="size-[3px] rounded-full bg-[#5E6A70]" />
            <span className="size-2 rounded-full bg-peach" />
            Made in Mutare
          </span>
          <span className="flex gap-[18px] lg:gap-6">
            {/* Pages not written yet; plain text until they exist */}
            <span>Privacy</span>
            <span>Terms</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
