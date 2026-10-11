"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";

import { WhatsAppIcon } from "./brand";
import { WhatsAppLink } from "./cta";
import { FoundingCountdown, useFounding } from "@/components/founding";

/**
 * WhatsApp button that stays on screen once the visitor scrolls past the hero.
 * On phones, while founding prices last, it sits in a bar with the countdown.
 */
export function FloatingWhatsApp() {
  const [visible, setVisible] = useState(false);
  const { open } = useFounding();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, "change", (y) => setVisible(y > 560));

  return (
    <AnimatePresence>
      {visible && open ? (
        <motion.div
          key="founding-whatsapp-bar"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 26 }}
          className="fixed inset-x-3 bottom-[max(14px,env(safe-area-inset-bottom))] z-40 flex items-center justify-between gap-3 rounded-[18px] border border-line-2 bg-white/95 py-2 pr-2 pl-4 shadow-[0_12px_28px_rgba(12,24,31,0.22)] backdrop-blur lg:hidden"
        >
          <span className="flex min-w-0 flex-col text-[12.5px] leading-[17px] text-muted">
            Founding price ends in
            <FoundingCountdown className="text-[15px] text-purple-ink" />
          </span>
          <WhatsAppLink
            message="general"
            track={{ cta: "floating_whatsapp", section: "floating" }}
            className="inline-flex h-12 shrink-0 items-center gap-2 rounded-full bg-whatsapp px-4 text-[15px] font-semibold text-ink no-underline hover:text-ink"
          >
            <WhatsAppIcon size={20} />
            Chat
          </WhatsAppLink>
        </motion.div>
      ) : null}
      {visible ? (
        <WhatsAppLink
          key="floating-whatsapp"
          message="general"
          track={{ cta: "floating_whatsapp", section: "floating" }}
          aria-label="Chat on WhatsApp"
          initial={{ opacity: 0, scale: 0.6, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 24 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className={`fixed right-[18px] bottom-[max(30px,calc(env(safe-area-inset-bottom)+14px))] z-40 h-14 items-center gap-2.5 rounded-full bg-whatsapp pr-5 pl-4 text-[15.5px] font-semibold text-ink no-underline shadow-[0_12px_28px_rgba(12,24,31,0.28)] hover:text-ink lg:right-7 lg:bottom-7 lg:inline-flex lg:size-16 lg:justify-center lg:p-0 lg:shadow-[0_12px_28px_rgba(12,24,31,0.22)] ${
            open ? "hidden" : "inline-flex"
          }`}
        >
          {/* Ping only on the round desktop button; on the wide mobile pill it reads as a smear */}
          <span className="pointer-events-none absolute inset-0 hidden animate-wa-ping rounded-full bg-whatsapp lg:block" />
          <span className="relative lg:hidden">
            <WhatsAppIcon size={22} />
          </span>
          <span className="relative hidden lg:block">
            <WhatsAppIcon size={30} />
          </span>
          <span className="relative lg:hidden">Chat on WhatsApp</span>
        </WhatsAppLink>
      ) : null}
    </AnimatePresence>
  );
}
