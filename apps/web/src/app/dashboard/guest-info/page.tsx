"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { NativeSelect } from "@stayzim/ui/components/native-select";
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { Textarea } from "@stayzim/ui/components/textarea";
import {
  FAQ_SUGGESTIONS,
  GUEST_INFO_LIMITS,
  HOUSE_RULE_SUGGESTIONS,
  SOCIAL_KEYS,
  SOCIAL_NETWORKS,
  socialLink,
  STAY_TIMES,
  type FaqEntry,
  type SocialKey,
  type SocialLinks,
} from "@stayzim/sites";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, ChevronRight, CircleHelp, Clock, Info, Plus, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { FormSection, type SectionState } from "@/components/dashboard/form-section";
import { GuestInfoPreview } from "@/components/dashboard/guest-info-preview";
import { ListEditor } from "@/components/dashboard/list-editor";
import { ExampleNote } from "@/components/dashboard/example-note";
import { useLodge } from "@/components/dashboard/lodge-provider";
import { Page, PageHeader, PageSection } from "@/components/dashboard/page";
import { RequestChangeHint } from "@/components/dashboard/request-change-hint";
import { UnsavedChangesGuard } from "@/components/dashboard/unsaved-changes";
import { SocialIcon } from "@/components/site/social-icons";
import { WhyDisabled } from "@/components/why-disabled";
import { siteHost, siteUrl, type Lodge } from "@/lib/lodge";
import { OFFLINE_REASON, useOnline } from "@/lib/online";

/** The form, as typed. */
type Draft = {
  checkInFrom: string;
  checkOutBy: string;
  houseRules: string[];
  cancellationPolicy: string;
  faq: FaqEntry[];
  socialLinks: Record<SocialKey, string>;
};

function draftFrom(lodge: Lodge): Draft {
  return {
    checkInFrom: lodge.checkInFrom ?? "",
    checkOutBy: lodge.checkOutBy ?? "",
    houseRules: lodge.houseRules,
    cancellationPolicy: lodge.cancellationPolicy ?? "",
    faq: lodge.faq,
    socialLinks: Object.fromEntries(SOCIAL_KEYS.map((key) => [key, lodge.socialLinks[key] ?? ""])) as Record<SocialKey, string>,
  };
}

type Errors = Partial<Record<string, string>>;

/** JSON with object keys sorted: Postgres keeps FAQ entries as {a, q}, the form builds {q, a}. */
function sameJson(left: unknown, right: unknown) {
  const sorted = (_key: string, value: unknown) =>
    value && typeof value === "object" && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b))) : value;
  return JSON.stringify(left, sorted) === JSON.stringify(right, sorted);
}

/** What PATCH /api/lodge needs: only what changed, and the problems found first (keyed "faq.2.a", "social.instagram"). */
function changesFrom(draft: Draft, lodge: Lodge) {
  const errors: Errors = {};
  const houseRules = draft.houseRules.map((rule) => rule.trim()).filter(Boolean);
  const faq = draft.faq
    .map((entry) => ({ q: entry.q.trim(), a: entry.a.trim() }))
    .filter((entry, index) => {
      if (!entry.q && !entry.a) return false;
      if (entry.q.length < 3) errors[`faq.${index}.q`] = "Write the question";
      if (!entry.a) errors[`faq.${index}.a`] = "Write the answer";
      return true;
    });
  const socialLinks: SocialLinks = {};
  for (const key of SOCIAL_KEYS) {
    const result = socialLink(key, draft.socialLinks[key]);
    if ("error" in result) errors[`social.${key}`] = result.error;
    else if (result.url) socialLinks[key] = result.url;
  }

  const next = {
    checkInFrom: draft.checkInFrom || null,
    checkOutBy: draft.checkOutBy || null,
    houseRules,
    cancellationPolicy: draft.cancellationPolicy.trim() || null,
    faq,
    socialLinks,
  };
  const changes = Object.fromEntries(
    Object.entries(next).filter(([key, value]) => !sameJson(value, lodge[key as keyof typeof next])),
  ) as Partial<typeof next>;
  return { changes, errors };
}

function sectionState(changed: boolean, filled: boolean): SectionState {
  return changed ? "edited" : filled ? "set" : "empty";
}

export default function GuestInfoPage() {
  const { lodge, save } = useLodge();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(lodge));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  // Open the questions while there are none, decided once (it mustn't flip after the first save)
  const [faqStartsOpen] = useState(() => lodge.faq.length === 0);
  const online = useOnline();
  const { changes } = useMemo(() => changesFrom(draft, lodge), [draft, lodge]);
  const dirty = Object.keys(changes).length > 0 || !sameJson(draft, draftFrom(lodge));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  // After a save, show what the server stored (trimmed, links cleaned up)
  const justSaved = useRef(false);
  useEffect(() => {
    if (!justSaved.current) return;
    justSaved.current = false;
    setDraft(draftFrom(lodge));
  }, [lodge]);

  async function onSave() {
    const result = changesFrom(draft, lodge);
    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }
    if (Object.keys(result.changes).length === 0) {
      setDraft(draftFrom(lodge));
      return;
    }
    setSaving(true);
    setSaveError(null);
    justSaved.current = true;
    const error = await save("", "PATCH", result.changes);
    setSaving(false);
    if (error) {
      justSaved.current = false;
      setSaveError(error);
      return;
    }
    toast.success("Guest info saved", {
      description: `It's live on ${siteHost(lodge)}.`,
      action: { label: "View site", onClick: () => window.open(siteUrl(lodge), "_blank", "noreferrer") },
    });
  }

  function onDiscard() {
    setDraft(draftFrom(lodge));
    setErrors({});
    setSaveError(null);
  }

  const preview = (
    <GuestInfoPreview
      themeColor={lodge.themeColor}
      checkInFrom={draft.checkInFrom || null}
      checkOutBy={draft.checkOutBy || null}
      houseRules={draft.houseRules}
      cancellationPolicy={draft.cancellationPolicy.trim() || null}
      faq={draft.faq}
      links={SOCIAL_KEYS.filter((key) => draft.socialLinks[key].trim())}
    />
  );

  const actions = (
    <>
      <Button variant="outline" onClick={onDiscard} disabled={!dirty || saving}>
        Discard
      </Button>
      <WhyDisabled reason={saving ? null : !online ? OFFLINE_REASON : dirty ? null : "No changes to save"}>
        <Button onClick={onSave} loading={saving} disabled={!dirty || !online}>
          Save changes
        </Button>
      </WhyDisabled>
    </>
  );

  const linkCount = SOCIAL_KEYS.filter((key) => lodge.socialLinks[key]).length;

  return (
    <Page className="pb-20 lg:pb-0">
      <PageHeader
        sitePage
        back={{ label: "My site", href: "/dashboard/site" }}
        title="Guest info"
        description="Answers to what guests always ask: check-in times, house rules, questions and where else to find you."
        actions={<div className="hidden gap-2 lg:flex">{actions}</div>}
      />

      <AnimatePresence>
        {saveError ? (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <FormMessage>
              <Info className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Changes did not save.</strong> {saveError} Your edits are still here.
              </span>
            </FormMessage>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {lodge.status === "DEMO" && !lodge.checkInFrom && !lodge.checkOutBy && lodge.houseRules.length === 0 && lodge.faq.length === 0 && !lodge.cancellationPolicy ? (
        <PageSection>
          <ExampleNote>Your site shows example check-in times, house rules and questions, marked Example, until you save your own here.</ExampleNote>
        </PageSection>
      ) : null}

      <PageSection className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3">
          <FormSection
            icon={Clock}
            title="Stay details"
            summary={
              [lodge.checkInFrom && `Check-in from ${lodge.checkInFrom}`, lodge.checkOutBy && `out by ${lodge.checkOutBy}`]
                .filter(Boolean)
                .join(", ") || "Check-in and check-out times, house rules, cancellations"
            }
            state={sectionState(
              ["checkInFrom", "checkOutBy", "houseRules", "cancellationPolicy"].some((key) => key in changes),
              Boolean(lodge.checkInFrom || lodge.checkOutBy || lodge.houseRules.length > 0 || lodge.cancellationPolicy),
            )}
            defaultOpen
          >
            <div className="grid grid-cols-2 gap-3">
              <Field label="Check-in from" help="The earliest time guests can arrive. It shows on your site and in the booking form.">
                <NativeSelect value={draft.checkInFrom} onChange={(event) => set("checkInFrom", event.target.value)}>
                  <option value="">Not set</option>
                  {STAY_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Check-out by">
                <NativeSelect value={draft.checkOutBy} onChange={(event) => set("checkOutBy", event.target.value)}>
                  <option value="">Not set</option>
                  {STAY_TIMES.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="House rules" hint="Short and friendly. Tap a suggestion to add it.">
              <ListEditor
                items={draft.houseRules}
                onChange={(houseRules) => set("houseRules", houseRules)}
                max={GUEST_INFO_LIMITS.rules}
                maxLength={GUEST_INFO_LIMITS.rule}
                addLabel="Add a rule"
                placeholder="No smoking indoors"
                suggestions={HOUSE_RULE_SUGGESTIONS}
                itemLabel="House rule"
              />
            </Field>
            <Field label="Cancellation policy" count={{ value: draft.cancellationPolicy.length, max: GUEST_INFO_LIMITS.policy }} help="What happens if a guest cancels: how much notice they give, and whether they get money back. Keep it to a sentence or two.">
              <Textarea
                value={draft.cancellationPolicy}
                onChange={(event) => set("cancellationPolicy", event.target.value)}
                maxLength={GUEST_INFO_LIMITS.policy}
                placeholder="Free cancellation up to 3 days before arrival. After that, the first night is charged."
              />
            </Field>
          </FormSection>

          <FormSection
            icon={CircleHelp}
            title="Questions guests ask"
            summary={
              lodge.faq.length > 0
                ? `${lodge.faq.length} ${lodge.faq.length === 1 ? "question" : "questions"} on your site`
                : "Answer them once, on your site, instead of on every chat"
            }
            state={sectionState("faq" in changes, lodge.faq.length > 0)}
            defaultOpen={faqStartsOpen}
          >
            <FaqEditor faq={draft.faq} onChange={(faq) => set("faq", faq)} errors={errors} />
          </FormSection>

          <FormSection
            icon={Share2}
            title="Social and listing links"
            summary={linkCount > 0 ? `${linkCount} ${linkCount === 1 ? "link" : "links"} on your site` : "Guests trust lodges they can find elsewhere"}
            state={sectionState("socialLinks" in changes, linkCount > 0)}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_KEYS.map((key) => (
                <Field key={key} label={SOCIAL_NETWORKS[key].label} error={errors[`social.${key}`]}>
                  <InputGroup>
                    <InputGroupAddon>
                      <SocialIcon network={key} width={16} height={16} />
                    </InputGroupAddon>
                    <InputGroupInput
                      value={draft.socialLinks[key]}
                      onChange={(event) => {
                        set("socialLinks", { ...draft.socialLinks, [key]: event.target.value });
                        setErrors((current) => ({ ...current, [`social.${key}`]: undefined }));
                      }}
                      inputMode="url"
                      autoCapitalize="none"
                      autoCorrect="off"
                      placeholder={SOCIAL_NETWORKS[key].placeholder}
                    />
                  </InputGroup>
                </Field>
              ))}
            </div>
            <p className="text-[13px] text-muted-2">They show in the contact section of your site and open in a new tab.</p>
          </FormSection>

          <RequestChangeHint className="mt-2 px-1" />
        </fieldset>

        <aside className="sticky top-20 hidden flex-col gap-3 xl:flex">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold">Preview</span>
            <span className="inline-flex items-center gap-1.5 text-muted">
              <span className="size-1.5 rounded-full bg-success" />
              Updates as you edit
            </span>
          </div>
          {preview}
        </aside>
      </PageSection>

      <PageSection className="xl:hidden">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-card transition-colors hover:bg-surface"
        >
          <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#C9D9D2,#7C978B)] text-white">
            <Sparkles className="size-4" />
          </span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-semibold">Preview guest info</span>
            <span className="text-xs text-muted">See it the way guests will, before you save</span>
          </span>
          <ChevronRight className="size-4 text-muted-2" />
        </button>
      </PageSection>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <SheetBody className="bg-surface-2">{preview}</SheetBody>
        </SheetContent>
      </Sheet>

      <UnsavedChangesGuard when={dirty && !saving} />

      {/* Phones: Save stays in reach above the bottom bar while there are edits */}
      <AnimatePresence>
        {dirty ? (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-[calc(64px+max(0.5rem,env(safe-area-inset-bottom)))] z-30 grid grid-cols-[1fr_2fr] gap-2 border-t border-line-3 bg-white/95 px-4 py-3 backdrop-blur lg:hidden"
          >
            {actions}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Page>
  );
}

/** Question and answer cards, with suggested questions to start from. */
function FaqEditor({ faq, onChange, errors }: { faq: FaqEntry[]; onChange: (faq: FaqEntry[]) => void; errors: Errors }) {
  const reduceMotion = useReducedMotion();
  const list = useRef<HTMLOListElement>(null);
  const full = faq.length >= GUEST_INFO_LIMITS.faq;
  const unused = FAQ_SUGGESTIONS.filter((question) => !faq.some((entry) => entry.q.trim().toLowerCase() === question.toLowerCase()));

  function add(q = "") {
    if (full) return;
    onChange([...faq, { q, a: "" }]);
    // A suggestion fills the question, so the answer is next
    requestAnimationFrame(() => {
      const card = list.current?.children[faq.length];
      card?.querySelector<HTMLElement>(q ? "textarea" : "input")?.focus();
    });
  }

  function update(index: number, entry: Partial<FaqEntry>) {
    onChange(faq.map((current, position) => (position === index ? { ...current, ...entry } : current)));
  }

  function move(index: number, by: number) {
    const next = [...faq];
    next.splice(index + by, 0, next.splice(index, 1)[0]!);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-3">
      {faq.length > 0 ? (
        <ol ref={list} className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {faq.map((entry, index) => (
              <motion.li
                key={index}
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="flex flex-col gap-3 rounded-xl border border-line bg-white p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-2">Question {index + 1}</span>
                  <span className="flex">
                    <Button variant="ghost" size="icon-sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => move(index, 1)} disabled={index === faq.length - 1} aria-label="Move down">
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onChange(faq.filter((_, position) => position !== index))}
                      aria-label={`Remove question ${index + 1}`}
                      className="hover:text-danger"
                    >
                      <X />
                    </Button>
                  </span>
                </div>
                <Field label="Question" error={errors[`faq.${index}.q`]}>
                  <Input
                    value={entry.q}
                    onChange={(event) => update(index, { q: event.target.value })}
                    maxLength={GUEST_INFO_LIMITS.question}
                    placeholder="Is breakfast included?"
                  />
                </Field>
                <Field label="Answer" error={errors[`faq.${index}.a`]} count={{ value: entry.a.length, max: GUEST_INFO_LIMITS.answer }}>
                  <Textarea
                    value={entry.a}
                    onChange={(event) => update(index, { a: event.target.value })}
                    maxLength={GUEST_INFO_LIMITS.answer}
                    rows={2}
                    placeholder="Yes, a full breakfast from 7 to 9 every morning."
                  />
                </Field>
              </motion.li>
            ))}
          </AnimatePresence>
        </ol>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => add()} disabled={full}>
          <Plus />
          Add a question
        </Button>
        <span className="text-xs text-muted-2 tabular-nums">
          {faq.length} of {GUEST_INFO_LIMITS.faq}
        </span>
      </div>

      {unused.length > 0 && !full ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-2">Questions guests often ask</span>
          <div className="flex flex-wrap gap-1.5">
            {unused.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => add(question)}
                className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-line-2 bg-white px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand"
              >
                <Plus className="size-3" />
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
