"use client";

import type { FaqEntry, SocialKey } from "@stayzim/sites";
import { Check, ChevronDown, LogIn, LogOut } from "lucide-react";

import { SocialIcon } from "@/components/site/social-icons";

/** The Good to know and Questions sections as guests will see them, following the form as the owner types. */
export function GuestInfoPreview({
  themeColor,
  checkInFrom,
  checkOutBy,
  houseRules,
  cancellationPolicy,
  faq,
  links,
}: {
  themeColor: string;
  checkInFrom: string | null;
  checkOutBy: string | null;
  houseRules: string[];
  cancellationPolicy: string | null;
  faq: FaqEntry[];
  links: SocialKey[];
}) {
  const rules = houseRules.filter((rule) => rule.trim());
  const questions = faq.filter((entry) => entry.q.trim());
  const empty = !checkInFrom && !checkOutBy && rules.length === 0 && !cancellationPolicy && questions.length === 0 && links.length === 0;

  return (
    <div className="flex flex-col gap-4 rounded-[24px] bg-[#FAF9F6] p-4 text-[#0C181F] shadow-card" style={{ ["--theme" as string]: themeColor }}>
      {empty ? (
        <p className="py-8 text-center text-[13px] text-muted">Fill in a section and it shows here, the way guests see it.</p>
      ) : null}
      {checkInFrom || checkOutBy || rules.length > 0 || cancellationPolicy ? (
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-bold tracking-[0.12em] text-[var(--theme)] uppercase">Good to know</span>
          {checkInFrom || checkOutBy ? (
            <div className="grid grid-cols-2 gap-2">
              {checkInFrom ? <Fact icon={<LogIn className="size-3.5" />} label="Check-in" value={`From ${checkInFrom}`} /> : null}
              {checkOutBy ? <Fact icon={<LogOut className="size-3.5" />} label="Check-out" value={`By ${checkOutBy}`} /> : null}
            </div>
          ) : null}
          {rules.length > 0 ? (
            <ul className="flex flex-col gap-1.5 text-[12.5px]">
              {rules.map((rule, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--theme)]" />
                  {rule}
                </li>
              ))}
            </ul>
          ) : null}
          {cancellationPolicy ? (
            <p className="rounded-xl bg-white p-3 text-[12px] leading-5 whitespace-pre-line text-[#4F5A60]">
              <strong className="font-semibold text-[#0C181F]">Cancellations. </strong>
              {cancellationPolicy}
            </p>
          ) : null}
        </div>
      ) : null}
      {questions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold tracking-[0.12em] text-[var(--theme)] uppercase">Questions</span>
          {questions.map((entry, index) => (
            <details key={index} className="group rounded-xl bg-white px-3 py-2.5 text-[12.5px]" open={index === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-semibold">
                {entry.q}
                <ChevronDown className="size-3.5 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              {entry.a ? <p className="mt-1.5 whitespace-pre-line text-[#4F5A60]">{entry.a}</p> : <p className="mt-1.5 text-soft">The answer goes here</p>}
            </details>
          ))}
        </div>
      ) : null}
      {links.length > 0 ? (
        <div className="flex gap-2">
          {links.map((key) => (
            <span key={key} className="flex size-9 items-center justify-center rounded-full bg-[var(--theme)] text-white">
              <SocialIcon network={key} width={16} height={16} />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="flex flex-col gap-0.5 rounded-xl bg-white p-2.5">
      <span className="inline-flex items-center gap-1 text-[11px] text-[#6C767D]">
        <span className="text-[var(--theme)]">{icon}</span>
        {label}
      </span>
      <span className="text-[13px] font-semibold">{value}</span>
    </span>
  );
}
