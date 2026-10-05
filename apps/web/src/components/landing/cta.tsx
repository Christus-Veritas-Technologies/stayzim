"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { trackCta, type CtaEvent } from "@/lib/track";
import { whatsappUrl, type WhatsAppMessage } from "@/lib/whatsapp";

type WhatsAppLinkProps = Omit<HTMLMotionProps<"a">, "href" | "onClick"> & {
  message: WhatsAppMessage;
  track: CtaEvent;
};

/** Opens a WhatsApp chat with StayZim and records which button sent the visitor there. */
export function WhatsAppLink({ message, track, children, ...props }: WhatsAppLinkProps) {
  return (
    <motion.a
      href={whatsappUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackCta(track)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.a>
  );
}

/** Any other tracked link (in-page anchors, demo lodge sites). */
export function TrackedLink({
  track,
  children,
  ...props
}: Omit<HTMLMotionProps<"a">, "onClick"> & { track: CtaEvent }) {
  return (
    <motion.a
      onClick={() => trackCta(track)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      {...props}
    >
      {children}
    </motion.a>
  );
}
