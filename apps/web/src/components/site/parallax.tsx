"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef, type ReactNode } from "react";

/**
 * Pro templates' hero photo: it drifts a little slower than the page as the
 * guest scrolls. Fills its positioned parent; still with reduce motion.
 */
export function Parallax({ children, className, distance = 90 }: { children: ReactNode; className?: string; distance?: number }) {
  const frame = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: frame, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : distance]);
  return (
    <div ref={frame} className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden="true">
      <motion.div style={{ y, bottom: reduce ? 0 : -distance }} className="absolute inset-x-0 top-0">
        {children}
      </motion.div>
    </div>
  );
}
