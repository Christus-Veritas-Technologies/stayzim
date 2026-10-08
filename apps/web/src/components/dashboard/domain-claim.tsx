"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field } from "@stayzim/ui/components/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { freeDomainName } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { CircleCheck, Globe, Hourglass, Mail, MessageCircle } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { EASE_OUT } from "@/components/motion";
import { formatClock, formatLongDate } from "@/lib/format";
import { formatPhone } from "@/lib/lodge";

/** "Sunday 11 October at 14:05": when a claimed domain is promised by. */
function readyBy(date: string) {
  return `${formatLongDate(date)} at ${formatClock(date)}`;
}

/**
 * Claims the free .co.zw: the name (the slug to start with), then a "it's on its
 * way" screen that says when it'll be ready and that we'll WhatsApp and email.
 */
export function ClaimDomainSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { lodge, save } = useLodge();
  const [name, setName] = useState(lodge.slug);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const claim = lodge.freeDomain.claim;
  const domain = freeDomainName(name);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!domain) {
      setError("Use 3 to 63 letters, numbers or hyphens, like mistvalleylodge");
      return;
    }
    setSaving(true);
    setError(await save("/domain-claim", "POST", { name }));
    setSaving(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-sm:max-h-[92svh]">
        <AnimatePresence mode="wait" initial={false}>
          {claim ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <SheetHeader>
                <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-success-tint text-success">
                  <CircleCheck className="size-6" />
                </span>
                <SheetTitle>{claim.domain} is on its way</SheetTitle>
                <SheetDescription>We&apos;re registering it and pointing it at your site. It&apos;s ready by {readyBy(claim.readyBy)}.</SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-3">
                <ul className="flex flex-col gap-2.5 text-[14px] leading-5 text-ink-2">
                  <li className="flex gap-3 rounded-[14px] bg-surface p-3.5">
                    <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand" />
                    We&apos;ll WhatsApp you on {lodge.whatsapp ? formatPhone(lodge.whatsapp) : "your number"} the moment it&apos;s live.
                  </li>
                  <li className="flex gap-3 rounded-[14px] bg-surface p-3.5">
                    <Mail className="mt-0.5 size-4 shrink-0 text-brand" />
                    And email you. We&apos;ve just sent the details.
                  </li>
                  <li className="flex gap-3 rounded-[14px] bg-surface p-3.5">
                    <Globe className="mt-0.5 size-4 shrink-0 text-brand" />
                    Your stayzim.co.zw address keeps working, so links you&apos;ve shared won&apos;t break.
                  </li>
                </ul>
                <p className="text-[13px] text-muted">If the name is taken, we&apos;ll message you with options.</p>
              </SheetBody>
              <SheetFooter>
                <Button onClick={() => onOpenChange(false)}>Done</Button>
              </SheetFooter>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              onSubmit={submit}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <SheetHeader>
                <SheetTitle>Claim your free domain</SheetTitle>
                <SheetDescription>It comes free with your plan. We register it and set it up within 72 hours.</SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-4">
                <Field
                  label="Your domain"
                  error={error}
                  hint={domain ? `Guests will type ${domain}` : "Letters, numbers and hyphens"}
                  help="Short and easy to say on the phone works best, like your lodge's name."
                >
                  <InputGroup>
                    <InputGroupInput
                      value={name}
                      onChange={(event) => {
                        setName(event.target.value);
                        setError(null);
                      }}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      maxLength={70}
                      disabled={saving}
                    />
                    <InputGroupAddon align="end" className="font-semibold text-ink-2">
                      .co.zw
                    </InputGroupAddon>
                  </InputGroup>
                </Field>
                <p className="text-[13px] leading-5 text-muted">Your stayzim.co.zw address keeps working underneath, so nothing you&apos;ve shared breaks.</p>
              </SheetBody>
              <SheetFooter>
                <Button variant="outline" type="button" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" loading={saving}>
                  Claim {domain ?? "it"}
                </Button>
              </SheetFooter>
            </motion.form>
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

/**
 * "Claim your free domain", opening the sheet. The sheet stays with whoever renders
 * this (`open` / `onOpenChange`), so it can show "on its way" after the button is gone.
 */
export function ClaimDomainButton({ className, size = "sm", onClick }: { className?: string; size?: "sm" | "lg"; onClick: () => void }) {
  return (
    <Button size={size} className={className} onClick={onClick}>
      <Globe />
      Claim your free domain
    </Button>
  );
}

/**
 * On the dashboard home for a paid lodge: claim the free .co.zw, or, once claimed,
 * when it'll be ready. Hidden once the domain is live, on demos, and when domains aren't free.
 */
export function DomainClaimCard({ className }: { className?: string }) {
  const { lodge } = useLodge();
  const [open, setOpen] = useState(false);
  const { claimable, claim } = lodge.freeDomain;
  const waiting = claim?.status === "REQUESTED" && !lodge.customDomain;
  if (!claimable && !waiting) return null;

  return (
    <>
      <motion.section
        aria-label="Your free domain"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE_OUT }}
        className={cn(
          "flex flex-col gap-4 rounded-[20px] border border-brand-tint bg-brand-wash p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5",
          className,
        )}
      >
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand shadow-xs">
            {waiting ? <Hourglass className="size-5" /> : <Globe className="size-5" />}
          </span>
          <div className="flex flex-col gap-0.5">
            <p className="text-[15px] font-semibold text-ink">{waiting ? `${claim.domain} is on its way` : `Your free ${lodge.slug}.co.zw is waiting`}</p>
            <p className="text-[13px] leading-5 text-muted">
              {waiting
                ? `Ready by ${readyBy(claim.readyBy)}. We'll WhatsApp and email you when it's live.`
                : "A .co.zw domain comes free with your plan. Claim it and we'll set it up within 72 hours."}
            </p>
          </div>
        </div>
        {waiting ? null : <ClaimDomainButton size="lg" className="w-full sm:w-auto" onClick={() => setOpen(true)} />}
      </motion.section>
      <ClaimDomainSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/** Lodge info's web address card: the claim, or how it's going. Null when there's nothing to say. */
export function DomainClaimLine() {
  const { lodge } = useLodge();
  const [open, setOpen] = useState(false);
  const { claimable, claim } = lodge.freeDomain;
  const sheet = <ClaimDomainSheet open={open} onOpenChange={setOpen} />;
  if (claim?.status === "REQUESTED" && !lodge.customDomain) {
    return (
      <span className="text-[13px] text-muted">
        Setting up <strong className="font-semibold text-ink-2">{claim.domain}</strong>: ready by {readyBy(claim.readyBy)}. We&apos;ll WhatsApp and email you.
        {sheet}
      </span>
    );
  }
  if (!claimable) return null;
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
      Your plan comes with a free .co.zw, like {lodge.slug}.co.zw.
      <ClaimDomainButton onClick={() => setOpen(true)} />
      {sheet}
    </span>
  );
}
