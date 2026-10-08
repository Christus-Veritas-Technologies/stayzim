import { FACT_LIMITS, findTemplate, isLodgeKind, isSetting, sampleSite, todayInHarare } from "@stayzim/sites";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteTemplate } from "@/components/site/templates";

type Props = { params: Promise<{ template: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export const metadata: Metadata = { title: { absolute: "Preview" }, robots: { index: false, follow: false } };

const COLOR = /^#[0-9a-f]{6}$/i;

function text(value: string | string[] | undefined, max: number) {
  return (typeof value === "string" ? value : "").trim().slice(0, max) || null;
}

function whole(value: string | string[] | undefined, min: number, max: number) {
  const number = Number(text(value, 6));
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

/**
 * /create's preview: the design the owner picked, filled with what they've
 * told us so far (?name=&town=&country=&kind=&setting=&rooms=&price=&color=),
 * the generated copy and the example rooms and sections a new site starts
 * with. Nothing is saved or tracked; it's shown in an iframe beside the form.
 */
export default async function SamplePreviewPage({ params, searchParams }: Props) {
  const [{ template: key }, query] = await Promise.all([params, searchParams]);
  const template = findTemplate(key);
  if (!template) notFound();
  const kind = text(query.kind, 20);
  const setting = text(query.setting, 20);
  const color = text(query.color, 7);
  const site = sampleSite({
    template: template.key,
    name: text(query.name, 80) ?? "",
    town: text(query.town, 60),
    country: text(query.country, FACT_LIMITS.country),
    kind: isLodgeKind(kind) ? kind : null,
    setting: isSetting(setting) ? setting : null,
    roomsHint: whole(query.rooms, 1, FACT_LIMITS.roomsMax),
    priceHint: whole(query.price, FACT_LIMITS.priceMin, FACT_LIMITS.priceMax),
    themeColor: color && COLOR.test(color) ? color : "#1E4A3B",
    today: todayInHarare(),
  });
  return <SiteTemplate site={site} preview />;
}
