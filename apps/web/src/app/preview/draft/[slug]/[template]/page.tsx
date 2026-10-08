import { applyDraft, findTemplate } from "@stayzim/sites";
import { siteDraftSchema } from "@stayzim/sites/schemas";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DemoEndedSite, SuspendedSite } from "@/components/site/site-states";
import { SiteTemplate } from "@/components/site/templates";
import { getSite, withTemplate } from "@/lib/site";

type Props = { params: Promise<{ slug: string; template: string }>; searchParams: Promise<{ draft?: string; base?: string }> };

export const metadata: Metadata = { title: { absolute: "Preview" }, robots: { index: false, follow: false } };

/** Saved facts the site JSON doesn't carry: "rooms,price,seed" from the dashboard (0 for none). */
function parseBase(value: string | undefined) {
  const [rooms, price, seed] = (value ?? "").split(",").map((part) => Number.parseInt(part, 10));
  const whole = (number: number | undefined) => (number !== undefined && Number.isInteger(number) && number > 0 ? number : null);
  return { roomsHint: whole(rooms), priceHint: whole(price), copySeed: whole(seed) ?? 0 };
}

function parseDraft(value: string | undefined) {
  if (!value) return {};
  try {
    return siteDraftSchema.parse(JSON.parse(value));
  } catch {
    return {};
  }
}

/**
 * The dashboard's live preview: the lodge's saved site in a template, with the
 * owner's unsaved edits on top (?draft=JSON, packages/sites content/draft.ts),
 * so it shows what saving would show. Nothing is saved or counted.
 */
export default async function DraftPreviewPage({ params, searchParams }: Props) {
  const [{ slug, template: key }, query] = await Promise.all([params, searchParams]);
  const template = findTemplate(key);
  const site = await getSite(slug);
  if (!site || !template) notFound();
  if (site.status !== "LIVE") return site.status === "DEMO_ENDED" ? <DemoEndedSite name={site.name} /> : <SuspendedSite name={site.name} />;
  const drafted = applyDraft(withTemplate(site, template), parseDraft(query.draft), parseBase(query.base));
  return <SiteTemplate site={drafted} preview />;
}
