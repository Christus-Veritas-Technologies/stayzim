import type { TemplateKey } from "@stayzim/sites";

import type { BasicConfig } from "@/components/site/templates/basic";

export type TemplateLook = Omit<BasicConfig, "name" | "motion">;

/**
 * Placeholder looks for the templates that don't have their own design yet.
 * The Design screen's thumbnails read them too.
 */
export const PLACEHOLDER_LOOKS: Partial<Record<TemplateKey, TemplateLook>> = {
  "starter-veranda": { layout: "stack", tone: "light", font: "sans" },
  "starter-rondavel": { layout: "split", tone: "light", font: "sans" },
  "starter-shade": { layout: "rooms-first", tone: "light", font: "sans" },
  "growth-wordmark": { layout: "stack", tone: "warm", font: "sans" },
  "growth-overlap": { layout: "split", tone: "warm", font: "serif" },
  "pro-escarpment": { layout: "stack", tone: "dark", font: "serif" },
  "pro-courtyard": { layout: "split", tone: "warm", font: "serif" },
  "pro-canopy": { layout: "rooms-first", tone: "dark", font: "sans" },
};

/** Classic's look, close enough for a thumbnail. */
const CLASSIC_LOOK: TemplateLook = { layout: "stack", tone: "light", font: "serif" };

export function templateLook(key: string): TemplateLook {
  return PLACEHOLDER_LOOKS[key as TemplateKey] ?? CLASSIC_LOOK;
}
