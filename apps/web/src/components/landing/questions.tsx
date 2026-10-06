"use client";

import { AnimatePresence, motion, useInView, type Variants } from "framer-motion";
import { Fragment, useEffect, useRef, useState } from "react";

import { Eyebrow, LogoMark, WhatsAppIcon } from "./brand";
import { QUESTIONS } from "./content";
import { WhatsAppLink } from "./cta";
import { Item, Reveal, Stagger } from "@/components/motion";

const TYPING_MS = 1100;

const bubble: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 26 } },
};

/**
 * The FAQ as a WhatsApp thread: each question arrives, the team "types",
 * then the answer lands. Every message is in the HTML from the start (for
 * search engines and no-JS); only its visibility is animated.
 */
function Thread() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.35 });
  // How many messages are visible (a question and its answer are 2)
  const [shown, setShown] = useState(0);
  const [typingFor, setTypingFor] = useState<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(QUESTIONS.length * 2);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 200;
    QUESTIONS.forEach((_, i) => {
      timers.push(setTimeout(() => setShown(i * 2 + 1), at));
      at += 450;
      timers.push(setTimeout(() => setTypingFor(i), at));
      at += TYPING_MS;
      timers.push(
        setTimeout(() => {
          setTypingFor(null);
          setShown(i * 2 + 2);
        }, at),
      );
      at += 900;
    });
    return () => timers.forEach(clearTimeout);
  }, [inView]);

  return (
    <div ref={ref} className="flex flex-col gap-2.5 p-4 lg:p-6">
      {QUESTIONS.map(({ q, a }, i) => (
        <Fragment key={q}>
          {i > 0 ? <div className="h-1.5" /> : null}
          <motion.div
            variants={bubble}
            initial="hidden"
            animate={shown > i * 2 ? "show" : "hidden"}
            className="max-w-[86%] self-end rounded-[14px_14px_4px_14px] bg-brand-tint px-3 py-[9px] text-[15px] leading-[1.42] lg:text-[15.5px]"
          >
            <strong className="font-semibold">{q}</strong>
          </motion.div>
          <div className="relative max-w-[86%] self-start">
            <motion.div
              variants={bubble}
              initial="hidden"
              animate={shown > i * 2 + 1 ? "show" : "hidden"}
              className="rounded-[14px_14px_14px_4px] bg-white px-3 py-[9px] text-[15px] leading-[1.42] shadow-[0_1px_2px_rgba(12,24,31,0.06)] lg:text-[15.5px]"
            >
              <span className="mb-0.5 block text-[11.5px] font-bold text-brand">StayZim</span>
              {a}
            </motion.div>
            <AnimatePresence>
              {typingFor === i ? <Typing /> : null}
            </AnimatePresence>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

/** "…" bubble shown where the answer is about to land. */
function Typing() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className="absolute top-0 left-0 flex items-center gap-1 rounded-[14px_14px_14px_4px] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(12,24,31,0.06)]"
      aria-hidden="true"
    >
      {[0, 1, 2].map((dot) => (
        <motion.span
          key={dot}
          className="size-1.5 rounded-full bg-soft"
          animate={{ y: [0, -3, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: dot * 0.15 }}
        />
      ))}
    </motion.div>
  );
}

export function Questions() {
  return (
    <section id="questions" className="bg-white px-4 py-16 lg:px-6 lg:py-[120px]">
      <div className="mx-auto grid max-w-[1120px] items-start gap-8 lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-20">
        <Stagger className="flex flex-col gap-3.5 lg:sticky lg:top-28 lg:gap-[18px]">
          <Item>
            <Eyebrow index="05">Questions</Eyebrow>
          </Item>
          <Item>
            <h2 className="font-display text-[34px] leading-[37px] font-semibold tracking-[-0.03em] text-balance lg:text-5xl lg:leading-[52px]">
              What lodge owners ask us
            </h2>
          </Item>
          <Item>
            <p className="text-base leading-relaxed text-pretty text-muted lg:text-lg lg:leading-7">
              Ask your own question on WhatsApp. There is no form to fill in.
            </p>
          </Item>
          <Item className="mt-2">
            <WhatsAppLink
              message="question"
              track={{ cta: "questions_whatsapp", section: "questions" }}
              className="inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-whatsapp pr-[26px] pl-5 text-base font-semibold whitespace-nowrap text-ink no-underline shadow-[0_6px_16px_rgba(12,24,31,0.10)] hover:text-ink sm:w-auto"
            >
              <WhatsAppIcon size={22} />
              Ask us on WhatsApp
            </WhatsAppLink>
          </Item>
        </Stagger>

        <Reveal className="overflow-hidden rounded-3xl border border-[#EAEFF2] bg-surface-2 lg:rounded-[28px]" amount={0.2}>
          <div className="flex items-center gap-3 border-b border-[#EAEFF2] bg-white px-4 py-3.5 lg:px-5 lg:py-4">
            <LogoMark size={40} />
            <div className="flex flex-col gap-px">
              <span className="text-[15px] font-semibold">The StayZim team</span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-2">
                <motion.span
                  className="size-1.5 rounded-full bg-whatsapp"
                  animate={{ opacity: [1, 0.35, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                Mutare, Zimbabwe
              </span>
            </div>
            <span className="ml-auto flex">
              <WhatsAppIcon size={22} color="#25D366" />
            </span>
          </div>
          <Thread />
        </Reveal>
      </div>
    </section>
  );
}
