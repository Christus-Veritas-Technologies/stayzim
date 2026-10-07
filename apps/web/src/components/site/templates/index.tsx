import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { DemoBand, DemoPill, DemoRibbon } from "@/components/site/demo-badges";
import { BasicTemplate } from "@/components/site/templates/basic";
import { ClassicTemplate } from "@/components/site/templates/classic";
import { PLACEHOLDER_LOOKS } from "@/components/site/templates/looks";
import { EscarpmentTemplate } from "@/components/site/templates/escarpment";
import { OverlapTemplate } from "@/components/site/templates/overlap";
import { RondavelTemplate } from "@/components/site/templates/rondavel";
import { ShadeTemplate } from "@/components/site/templates/shade";
import { ShorelineTemplate } from "@/components/site/templates/shoreline";
import { VerandaTemplate } from "@/components/site/templates/veranda";
import { WordmarkTemplate } from "@/components/site/templates/wordmark";
import { PageViewTracker, SiteTracking, type BookingSite } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

/** Each template's design (designs/StayZim Lodge Templates.html). */
const DESIGNS: Partial<Record<TemplateKey, (props: { site: LiveSite }) => React.ReactNode>> = {
  "starter-veranda": VerandaTemplate,
  "starter-rondavel": RondavelTemplate,
  "starter-shade": ShadeTemplate,
  "growth-shoreline": ShorelineTemplate,
  "growth-wordmark": WordmarkTemplate,
  "growth-overlap": OverlapTemplate,
  "pro-escarpment": EscarpmentTemplate,
};

/** What the booking sheet needs, where the site takes bookings. Previews never do: Book stays a WhatsApp link there. */
export function bookingSite(site: LiveSite, preview = false): BookingSite | null {
  return !preview && site.booking.mode === "request" && site.whatsapp
    ? {
        slug: site.slug,
        name: site.name,
        whatsapp: site.whatsapp,
        themeColor: site.themeColor,
        checkInFrom: site.checkInFrom,
        checkOutBy: site.checkOutBy,
        rooms: site.rooms.map(({ id, name, price, sleeps }) => ({ id, name, price, sleeps })),
      }
    : null;
}

/**
 * Renders a lodge site in its template. `preview` turns tracking off, so owners
 * trying templates in the dashboard don't count as visitors. A demo (not paid
 * for yet) gets its badges around whichever template it uses.
 */
export function SiteTemplate({ site, preview = false }: { site: LiveSite; preview?: boolean }) {
  const template = findTemplate(site.template) ?? findTemplate("growth-shoreline")!;
  const Design = DESIGNS[template.key as TemplateKey];
  const basic = Design ? undefined : PLACEHOLDER_LOOKS[template.key as TemplateKey];
  const booking = bookingSite(site, preview);
  return (
    <SiteTracking slug={site.slug} enabled={!preview} booking={booking}>
      <PageViewTracker />
      {site.demo ? <DemoRibbon /> : null}
      {Design ? (
        <Design site={site} />
      ) : basic ? (
        <BasicTemplate site={site} config={{ ...basic, name: template.name, motion: template.motion }} />
      ) : (
        <ClassicTemplate site={site} />
      )}
      {site.demo ? (
        <>
          <DemoBand />
          <DemoPill />
        </>
      ) : null}
    </SiteTracking>
  );
}
