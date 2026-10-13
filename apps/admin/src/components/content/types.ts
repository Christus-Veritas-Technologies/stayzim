import type { DashboardPhoto, Plan } from "@stayzim/sites";

import type { AdminPost } from "@/components/content/journal-editor";
import type { AdminReviews } from "@/components/content/reviews-editor";

/** GET /api/admin/lodges/:slug/content (apps/server/src/routes/admin.ts): the reviews and journal a Pro site shows. */
export type LodgeContent = {
  lodge: { name: string; slug: string; plan: Plan; status: string };
  reviews: AdminReviews;
  posts: AdminPost[];
  photos: DashboardPhoto[];
};
