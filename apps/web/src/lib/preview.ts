import type { SiteDraft } from "@stayzim/sites";

import type { Lodge } from "@/lib/lodge";
import { siteHost } from "@/lib/site-host";

/** Longer drafts (a long FAQ) preview the saved site instead: addresses have limits. */
const DRAFT_MAX = 6000;

/**
 * The live preview's address for a dashboard form: the lodge's site in
 * `template` (its live one by default) with the unsaved `draft` on top
 * (app/preview/draft). `hash` opens it at a section, e.g. "#good-to-know".
 */
export function draftPreviewUrl(lodge: Lodge, draft: SiteDraft, options: { template?: string; hash?: string } = {}) {
  const base = `${lodge.roomsHint ?? 0},${lodge.priceHint ?? 0},${lodge.copySeed}`;
  const encoded = encodeURIComponent(JSON.stringify(draft));
  const query = encoded.length <= DRAFT_MAX ? `draft=${encoded}&base=${base}` : `base=${base}`;
  return {
    src: `/preview/draft/${lodge.slug}/${options.template ?? lodge.siteTemplate}?${query}${options.hash ?? ""}`,
    host: siteHost(lodge),
    /** True when the draft was too long to send: the preview shows the saved site */
    partial: encoded.length > DRAFT_MAX,
  };
}
