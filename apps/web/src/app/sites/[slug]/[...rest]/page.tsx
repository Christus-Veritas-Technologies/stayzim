import { notFound } from "next/navigation";

/** Lodge sites are a single page; any other path shows the site's 404. */
export default function MissingSitePage() {
  notFound();
}
