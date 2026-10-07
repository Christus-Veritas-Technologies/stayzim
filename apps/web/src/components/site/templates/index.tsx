import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { DemoBand, DemoPill, DemoRibbon } from "@/components/site/demo-badges";
import { BasicTemplate } from "@/components/site/templates/basic";
import { ClassicTemplate } from "@/components/site/templates/classic";
import { PLACEHOLDER_LOOKS } from "@/components/site/templates/looks";
import { PageViewTracker, SiteTracking } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

/**
 * Renders a lodge site in its template. `preview` turns tracking off, so owners
 * trying templates in the dashboard don't count as visitors. A demo (not paid
 * for yet) gets its badges around whichever template it uses.
 */
export function SiteTemplate({ site, preview = false }: { site: LiveSite; preview?: boolean }) {
  const template = findTemplate(site.template) ?? findTemplate("growth-classic")!;
  const basic = PLACEHOLDER_LOOKS[template.key as TemplateKey];
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
      {basic ? <BasicTemplate site={site} config={{ ...basic, name: template.name, motion: template.motion }} /> : <ClassicTemplate site={site} />}
      {site.demo ? (
        <>
          <DemoBand />
          <DemoPill />
        </>
      ) : null}
    </SiteTracking>
  );
}
