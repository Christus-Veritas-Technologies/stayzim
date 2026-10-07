import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { DemoBand, DemoPill, DemoRibbon } from "@/components/site/demo-badges";
import { BasicTemplate } from "@/components/site/templates/basic";
import { ClassicTemplate } from "@/components/site/templates/classic";
import { PLACEHOLDER_LOOKS } from "@/components/site/templates/looks";
import { RondavelTemplate } from "@/components/site/templates/rondavel";
import { VerandaTemplate } from "@/components/site/templates/veranda";
import { PageViewTracker, SiteTracking } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

/** Each template's design (designs/StayZim Lodge Templates.html). */
const DESIGNS: Partial<Record<TemplateKey, (props: { site: LiveSite }) => React.ReactNode>> = {
  "starter-veranda": VerandaTemplate,
  "starter-rondavel": RondavelTemplate,
};

/**
 * Renders a lodge site in its template. `preview` turns tracking off, so owners
 * trying templates in the dashboard don't count as visitors. A demo (not paid
 * for yet) gets its badges around whichever template it uses.
 */
export function SiteTemplate({ site, preview = false }: { site: LiveSite; preview?: boolean }) {
  const template = findTemplate(site.template) ?? findTemplate("growth-shoreline")!;
  const Design = DESIGNS[template.key as TemplateKey];
  const basic = Design ? undefined : PLACEHOLDER_LOOKS[template.key as TemplateKey];
  // Previews never take requests: Book stays a WhatsApp link there
  const booking =
    !preview && site.booking.mode === "request" && site.whatsapp
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
