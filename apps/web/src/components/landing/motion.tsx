"use client";

import { animate, motion, useInView, type HTMLMotionProps, type Variants } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Fade up into place. The default for text and cards entering the viewport. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE_OUT } },
};

export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } },
};

/** Children animate one after another once the parent scrolls into view. */
export function Stagger({
  stagger = 0.1,
  delay = 0,
  amount = 0.25,
  children,
  ...props
}: HTMLMotionProps<"div"> & { stagger?: number; delay?: number; amount?: number }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** A child of <Stagger>, or a standalone element when given its own `initial`/`whileInView`. */
export function Item({ variants = fadeUp, ...props }: HTMLMotionProps<"div">) {
  return <motion.div variants={variants} {...props} />;
}

/** Fades up once on its own when scrolled into view. */
export function Reveal({
  delay = 0,
  amount = 0.3,
  ...props
}: HTMLMotionProps<"div"> & { delay?: number; amount?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay }}
      {...props}
    />
  );
}

/** Counts from `from` to `to` the first time it scrolls into view. */
export function CountUp({
  to,
  from = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1.4,
  delay = 0,
}: {
  to: number;
  from?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [value, setValue] = useState(from);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(from, to, { duration, delay, ease: EASE_OUT, onUpdate: setValue });
    return () => controls.stop();
  }, [delay, duration, from, inView, to]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/** Gentle endless bob, for floating cards and pills. */
export function Float({
  distance = 8,
  duration = 5,
  delay = 0,
  ...props
}: HTMLMotionProps<"div"> & { distance?: number; duration?: number; delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -distance, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
      {...props}
    />
  );
}
