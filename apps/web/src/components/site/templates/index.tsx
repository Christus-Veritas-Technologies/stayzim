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
  return (
    <SiteTracking slug={site.slug} enabled={!preview}>
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
