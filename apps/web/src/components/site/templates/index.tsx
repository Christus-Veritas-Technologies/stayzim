import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { bookingSite } from "@/components/site/booking-site";
import { DemoBand, DemoPill, DemoRibbon } from "@/components/site/demo-badges";
import { CanopyTemplate } from "@/components/site/templates/canopy";
import { CourtyardTemplate } from "@/components/site/templates/courtyard";
import { EscarpmentTemplate } from "@/components/site/templates/escarpment";
import { OverlapTemplate } from "@/components/site/templates/overlap";
import { RondavelTemplate } from "@/components/site/templates/rondavel";
import { ShadeTemplate } from "@/components/site/templates/shade";
import { ShorelineTemplate } from "@/components/site/templates/shoreline";
import { VerandaTemplate } from "@/components/site/templates/veranda";
import { WordmarkTemplate } from "@/components/site/templates/wordmark";
import { PageViewTracker, SiteTracking } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

export { bookingSite };

/** Each template's design (designs/StayZim Lodge Templates.html). */
const DESIGNS: Record<TemplateKey, (props: { site: LiveSite }) => React.ReactNode> = {
  "starter-veranda": VerandaTemplate,
  "starter-rondavel": RondavelTemplate,
  "starter-shade": ShadeTemplate,
  "growth-shoreline": ShorelineTemplate,
  "growth-wordmark": WordmarkTemplate,
  "growth-overlap": OverlapTemplate,
  "pro-escarpment": EscarpmentTemplate,
  "pro-courtyard": CourtyardTemplate,
  "pro-canopy": CanopyTemplate,
};

/**
 * Renders a lodge site in its template. `preview` turns tracking off, so owners
 * trying templates in the dashboard don't count as visitors. A demo (not paid
 * for yet) gets its badges around whichever template it uses.
 */
export function SiteTemplate({ site, preview = false }: { site: LiveSite; preview?: boolean }) {
  const template = findTemplate(site.template) ?? findTemplate("growth-shoreline")!;
  const Design = DESIGNS[template.key as TemplateKey];
  const booking = bookingSite(site, preview);
  return (
    <SiteTracking slug={site.slug} enabled={!preview} booking={booking}>
      <PageViewTracker />
      {site.demo ? <DemoRibbon /> : null}
      <Design site={site} />
      {site.demo ? (
        <>
          <DemoBand />
          <DemoPill />
        </>
      ) : null}
    </SiteTracking>
  );
}
