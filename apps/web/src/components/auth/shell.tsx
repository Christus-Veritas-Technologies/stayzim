"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { KARIBA_GRADIENT, Place, ProductPanel, Rings } from "@/components/auth/kariba-panel";
import { Wordmark } from "@/components/landing/brand";
import { Appear, EASE_OUT, Item, riseIn } from "@/components/motion";
import { whatsappUrl } from "@/lib/whatsapp";

/**
 * Login, password and first-login screens. Phones: a Kariba header with a white
 * sheet over it. Desktop: the form on the left, the Kariba panel on the right.
 */
export function AuthShell({
  panel = <ProductPanel />,
  mobileBadge,
  mobileFooter,
  children,
}: {
  /** Right-hand panel on desktop */
  panel?: ReactNode;
  /** Pill in the phone header, e.g. "mistvalley.stayzim.co.zw is live" */
  mobileBadge?: ReactNode;
  /** Pinned to the bottom of the sheet on phones */
  mobileFooter?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-white lg:grid lg:grid-cols-2 lg:gap-3 lg:p-3">
      {/* Phone header */}
      <header className={cn("relative h-[204px] overflow-hidden text-white lg:hidden", KARIBA_GRADIENT)}>
        <Rings className="top-[62%] left-[80%]" sizes={[440, 300, 170]} />
        <Place name="Kariba" className="top-[50%] left-[11%]" delay={0.3} />
        <Place name="Nyanga" className="top-[28%] right-[9%]" tone="peach" delay={0.45} />
        <Place name="Vic Falls" className="top-[60%] right-[17%]" delay={0.6} />
        <Link href="/" className="absolute top-5 left-5 text-lg text-white no-underline" aria-label="StayZim home">
          <Wordmark size={32} markClassName="rounded-[9px] ring-2 ring-white/55" />
        </Link>
        {mobileBadge ? (
          <motion.div
            className="absolute bottom-12 left-5"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: EASE_OUT }}
          >
            {mobileBadge}
          </motion.div>
        ) : null}
      </header>

      <div className="relative -mt-7 flex min-h-[calc(100svh-176px)] flex-col rounded-t-[28px] bg-white px-5 pt-8 pb-6 sm:px-8 lg:mt-0 lg:min-h-[calc(100svh-24px)] lg:rounded-none lg:px-11 lg:pt-4 lg:pb-3">
        <Link href="/" className="hidden w-max text-[19px] text-ink no-underline lg:flex" aria-label="StayZim home">
          <Wordmark size={32} />
        </Link>

        <main className="flex flex-1 justify-center sm:items-center lg:py-10">
          <Appear className="w-full max-w-[380px]" stagger={0.07}>
            {children}
          </Appear>
        </main>

        {mobileFooter ? <div className="pt-8 text-center lg:hidden">{mobileFooter}</div> : null}

        <footer className="hidden items-center justify-between text-[12.5px] text-muted-2 lg:flex">
          <span>Made in Mutare</span>
          <span>
            Need help?{" "}
            <a href={whatsappUrl("login")} target="_blank" rel="noreferrer" className="font-semibold text-brand hover:text-brand-dark">
              Message us
            </a>
          </span>
        </footer>
      </div>

      <aside className="sticky top-3 hidden h-[calc(100svh-24px)] min-h-[600px] lg:block">{panel}</aside>
    </div>
  );
}

/** Title and intro at the top of each auth screen. */
export function AuthHeading({ title, children, icon }: { title: ReactNode; children?: ReactNode; icon?: ReactNode }) {
  return (
    <Item variants={riseIn} className="flex flex-col gap-2">
      {icon ? <div className="mb-3">{icon}</div> : null}
      <h1 className="font-display text-[28px] leading-[34px] font-semibold tracking-[-0.025em] text-ink sm:text-[32px] sm:leading-[38px]">
        {title}
      </h1>
      {children ? <p className="text-[15px] leading-[22px] text-muted">{children}</p> : null}
    </Item>
  );
}

/** One block of the auth screen that fades up in turn. */
export function AuthSection({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <Item variants={riseIn} className={cn("mt-[26px]", className)}>
      {children}
    </Item>
  );
}

export function BackToLogin() {
  return (
    <Item variants={riseIn} className="mb-5">
      <Link
        href="/login"
        className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13px] font-semibold text-muted hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Back to log in
      </Link>
    </Item>
  );
}

/** "New to StayZim?" line under the login form: sign up for a free demo. */
export function NewToStayZim() {
  return (
    <p className="text-[13.5px] leading-5 text-muted">
      New to StayZim?{" "}
      <Link href="/create" className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark">
        Make your lodge's site free
      </Link>
    </p>
  );
}

/** "Already have an account? Log in", under the sign-up form. */
export function HaveAnAccount() {
  return (
    <p className="text-[13.5px] leading-5 text-muted">
      Already have an account?{" "}
      <Link href="/login" className="-my-2.5 py-2.5 font-semibold text-brand hover:text-brand-dark">
        Log in
      </Link>
    </p>
  );
}
