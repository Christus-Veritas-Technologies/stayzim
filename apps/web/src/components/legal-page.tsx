"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/landing/brand";
import { Appear, Item, riseIn } from "@/components/motion";
import { CONTACT_EMAIL } from "@/lib/whatsapp";

export type LegalSection = { title: string; body: ReactNode };

/** Privacy and Terms: one readable column, in plain words, sections rising in one after another. */
export function LegalPage({ title, intro, updated, sections }: { title: string; intro: ReactNode; updated: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-svh bg-white">
      <header className="border-b border-line-3">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="text-lg text-ink no-underline" aria-label="StayZim home">
            <Wordmark size={30} />
          </Link>
          <Link href="/" className="group -my-2.5 inline-flex items-center gap-1.5 py-2.5 text-[13.5px] font-semibold text-muted transition-colors hover:text-ink">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Home
          </Link>
        </div>
      </header>

      <Appear className="mx-auto flex max-w-3xl flex-col gap-8 px-5 pt-10 pb-20 lg:pt-14" stagger={0.05}>
        <Item variants={riseIn} className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold text-brand">Updated {updated}</p>
          <h1 className="font-display text-[32px] leading-[38px] font-semibold tracking-[-0.025em] text-ink sm:text-[40px] sm:leading-[46px]">{title}</h1>
          <div className="text-[16px] leading-[26px] text-muted">{intro}</div>
        </Item>

        {sections.map((section, index) => (
          <Item key={section.title} variants={riseIn} className="flex flex-col gap-2.5">
            <h2 className="font-display text-xl leading-7 font-semibold tracking-[-0.01em] text-ink">
              <span className="mr-2 font-mono text-[13px] text-muted-2">{String(index + 1).padStart(2, "0")}</span>
              {section.title}
            </h2>
            <div className="flex flex-col gap-2.5 text-[15px] leading-[24px] text-ink-2 [&_a]:font-semibold [&_a]:text-brand [&_a:hover]:text-brand-dark [&_li]:pl-1 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1.5 [&_ul]:pl-5">
              {section.body}
            </div>
          </Item>
        ))}

        <Item variants={riseIn} className="rounded-[20px] bg-surface px-5 py-4 text-[14px] leading-[22px] text-muted">
          Questions about this page? Email <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand hover:text-brand-dark">{CONTACT_EMAIL}</a>{" "}
          or message us on WhatsApp.
        </Item>
      </Appear>
    </div>
  );
}
