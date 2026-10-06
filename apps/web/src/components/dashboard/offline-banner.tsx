"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { EASE_OUT } from "@/components/motion";
import { useOnline } from "@/lib/online";

/**
 * A strip under the header while there's no connection, so owners know edits
 * won't save. It turns green for a moment when the connection comes back.
 */
export function OfflineBanner() {
  const online = useOnline();
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    setBackOnline(true);
    const timer = window.setTimeout(() => setBackOnline(false), 2500);
    return () => window.clearTimeout(timer);
  }, [online]);

  const state = !online ? "offline" : backOnline ? "online" : null;

  return (
    <AnimatePresence initial={false}>
      {state ? (
        <motion.div
          key="connection"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          <div
            role="status"
            className={
              state === "offline"
                ? "flex items-center justify-center gap-2 bg-ink px-4 py-2 text-center text-[13px] font-medium text-white transition-colors duration-300"
                : "flex items-center justify-center gap-2 bg-success px-4 py-2 text-center text-[13px] font-medium text-white transition-colors duration-300"
            }
          >
            {state === "offline" ? (
              <>
                <WifiOff className="size-4 shrink-0" />
                You&apos;re offline. Changes won&apos;t save until you&apos;re back.
              </>
            ) : (
              <>
                <Wifi className="size-4 shrink-0" />
                You&apos;re back online.
              </>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
