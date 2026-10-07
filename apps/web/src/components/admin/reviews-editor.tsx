"use client";

import { Button } from "@stayzim/ui/components/button";
import { Card } from "@stayzim/ui/components/card";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input } from "@stayzim/ui/components/input";
import { Textarea } from "@stayzim/ui/components/textarea";
import { CONTENT_LIMITS } from "@stayzim/sites";
import { reviewsInput } from "@stayzim/sites/schemas";
import { ArrowDown, ArrowUp, Plus, Quote, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import type { LodgeContent } from "@/app/admin/lodges/[slug]/page";
import { api } from "@/lib/api";

export type AdminReviews = {
  score: number | null;
  count: number | null;
  source: string;
  url: string | null;
  quotes: { quote: string; author: string; origin: string | null; stayed: string | null; score: number | null }[];
};

type QuoteDraft = { key: number; quote: string; author: string; origin: string; stayed: string; score: string };

let nextKey = 0;
const toDraft = (quote: AdminReviews["quotes"][number]): QuoteDraft => ({
  key: nextKey++,
  quote: quote.quote,
  author: quote.author,
  origin: quote.origin ?? "",
  stayed: quote.stayed ?? "",
  score: quote.score === null ? "" : String(quote.score),
});

/** "9,4" or "9.4" → 9.4; empty → null */
function number(value: string) {
  const text = value.trim().replace(",", ".");
  return text === "" ? null : Number(text);
}

/**
 * The lodge's score on its listing and the guests' words we show. Saved
 * together: the order here is the order on the site.
 */
export function ReviewsEditor({ slug, reviews, onSaved }: { slug: string; reviews: AdminReviews; onSaved: (content: LodgeContent) => void }) {
  const [score, setScore] = useState(reviews.score === null ? "" : String(reviews.score));
  const [count, setCount] = useState(reviews.count === null ? "" : String(reviews.count));
  const [source, setSource] = useState(reviews.source);
  const [url, setUrl] = useState(reviews.url ?? "");
  const [quotes, setQuotes] = useState(() => reviews.quotes.map(toDraft));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (key: number, patch: Partial<QuoteDraft>) => setQuotes((list) => list.map((entry) => (entry.key === key ? { ...entry, ...patch } : entry)));
  const move = (index: number, by: number) =>
    setQuotes((list) => {
      const next = [...list];
      const [entry] = next.splice(index, 1);
      next.splice(index + by, 0, entry!);
      return next;
    });

  async function save() {
    const parsed = reviewsInput.safeParse({
      score: number(score),
      count: number(count),
      source,
      url,
      quotes: quotes.map((entry) => ({ quote: entry.quote, author: entry.author, origin: entry.origin, stayed: entry.stayed, score: number(entry.score) })),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0]!;
      const where = issue.path[0] === "quotes" && typeof issue.path[1] === "number" ? `Quote ${issue.path[1] + 1}: ` : "";
      setError(`${where}${issue.message}`);
      return;
    }
    setError(null);
    setSaving(true);
    const result = await api<LodgeContent>(`/api/admin/lodges/${encodeURIComponent(slug)}/reviews`, { method: "PUT", json: parsed.data });
    setSaving(false);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    toast.success("Reviews saved", { description: "They're on the site now." });
    onSaved(result.data);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold">The score</h2>
          <p className="text-[13px] text-muted">As it shows on the listing. Leave the score empty to show quotes only.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[120px_140px_minmax(0,1fr)]">
          <Field label="Score" hint="Out of 10">
            <Input inputMode="decimal" value={score} onChange={(event) => setScore(event.target.value)} placeholder="9.4" />
          </Field>
          <Field label="Reviews">
            <Input inputMode="numeric" value={count} onChange={(event) => setCount(event.target.value)} placeholder="128" />
          </Field>
          <Field label="From">
            <Input value={source} onChange={(event) => setSource(event.target.value)} maxLength={CONTENT_LIMITS.source} placeholder="Booking.com" />
          </Field>
        </div>
        <Field label="Listing link" hint="Guests can read every review there">
          <Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.booking.com/hotel/zw/…" />
        </Field>
      </Card>

      <Card className="gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-[15px] font-semibold">Guests' words</h2>
            <p className="text-[13px] text-muted">
              Copied from the listing, as written. Up to {CONTENT_LIMITS.quotes}; the first one leads.
            </p>
          </div>
          <span className="text-[12.5px] text-muted">
            {quotes.length} of {CONTENT_LIMITS.quotes}
          </span>
        </div>
        {quotes.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-surface px-4 py-4 text-[13.5px] text-muted">
            <Quote className="size-4" />
            No quotes yet.
          </p>
        ) : (
          <ol className="flex flex-col gap-3">
            {quotes.map((entry, index) => (
              <li key={entry.key} className="flex flex-col gap-3 rounded-2xl border border-line p-3.5 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-muted">Quote {index + 1}</span>
                  <span className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Move quote ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Move quote ${index + 1} down`} disabled={index === quotes.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown />
                    </Button>
                    <Button variant="ghost" size="icon-sm" aria-label={`Remove quote ${index + 1}`} onClick={() => setQuotes((list) => list.filter((item) => item.key !== entry.key))}>
                      <Trash2 />
                    </Button>
                  </span>
                </div>
                <Field label="What they wrote" count={{ value: entry.quote.length, max: CONTENT_LIMITS.quote }}>
                  <Textarea value={entry.quote} onChange={(event) => update(entry.key, { quote: event.target.value })} maxLength={CONTENT_LIMITS.quote} rows={3} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_100px]">
                  <Field label="Name">
                    <Input value={entry.author} onChange={(event) => update(entry.key, { author: event.target.value })} placeholder="Tendai M." maxLength={CONTENT_LIMITS.author} />
                  </Field>
                  <Field label="From">
                    <Input value={entry.origin} onChange={(event) => update(entry.key, { origin: event.target.value })} placeholder="Harare" maxLength={CONTENT_LIMITS.origin} />
                  </Field>
                  <Field label="Stayed">
                    <Input value={entry.stayed} onChange={(event) => update(entry.key, { stayed: event.target.value })} placeholder="March 2026" maxLength={CONTENT_LIMITS.stayed} />
                  </Field>
                  <Field label="Score">
                    <Input inputMode="decimal" value={entry.score} onChange={(event) => update(entry.key, { score: event.target.value })} placeholder="–" />
                  </Field>
                </div>
              </li>
            ))}
          </ol>
        )}
        <Button
          variant="outline"
          className="w-fit"
          disabled={quotes.length >= CONTENT_LIMITS.quotes}
          onClick={() => setQuotes((list) => [...list, toDraft({ quote: "", author: "", origin: null, stayed: null, score: null })])}
        >
          <Plus />
          Add a quote
        </Button>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Button onClick={save} loading={saving}>
          Save reviews
        </Button>
      </div>
    </div>
  );
}
