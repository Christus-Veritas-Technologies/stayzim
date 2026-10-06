import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { BasicTemplate, type BasicConfig } from "@/components/site/templates/basic";
import { ClassicTemplate } from "@/components/site/templates/classic";
import { PageViewTracker, SiteTracking } from "@/components/site/tracking";
import type { LiveSite } from "@/lib/site";

/** Placeholder looks for the templates that don't have their own design yet. */
const BASIC: Partial<Record<TemplateKey, Omit<BasicConfig, "name" | "motion">>> = {
  "starter-clear": { layout: "stack", tone: "light", font: "sans" },
  "starter-simple": { layout: "split", tone: "light", font: "sans" },
  "starter-compact": { layout: "rooms-first", tone: "light", font: "sans" },
  "growth-panorama": { layout: "stack", tone: "warm", font: "sans" },
  "growth-journal": { layout: "split", tone: "warm", font: "serif" },
  "pro-signature": { layout: "stack", tone: "dark", font: "serif" },
  "pro-safari": { layout: "split", tone: "warm", font: "serif" },
  "pro-horizon": { layout: "rooms-first", tone: "dark", font: "sans" },
};

/**
 * Renders a lodge site in its template. `preview` turns tracking off, so owners
 * trying templates in the dashboard don't count as visitors.
 */
export function SiteTemplate({ site, preview = false }: { site: LiveSite; preview?: boolean }) {
  const template = findTemplate(site.template) ?? findTemplate("growth-classic")!;
  const basic = BASIC[template.key as TemplateKey];
  return (
    <SiteTracking slug={site.slug} enabled={!preview}>
      <PageViewTracker />
      {basic ? <BasicTemplate site={site} config={{ ...basic, name: template.name, motion: template.motion }} /> : <ClassicTemplate site={site} />}
    </SiteTracking>
  );
}
