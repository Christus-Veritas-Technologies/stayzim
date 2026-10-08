import { notFound } from "next/navigation";

/** Any path a lodge site doesn't have (including pages outside its plan) shows the site's 404. */
export default function MissingSitePage() {
  notFound();
}
