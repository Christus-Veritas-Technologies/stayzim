import type { Metadata } from "next";

import { LodgesDirectory } from "@/components/lodges-directory";
import { byTown, getDirectory } from "@/lib/directory";

// Rendered per request: the list comes from the API, which isn't there while the app builds
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lodges in Zimbabwe, booked direct",
  description: "Lodges, guesthouses and holiday homes across Zimbabwe on StayZim. Each has its own website: book with them directly, on their site or on WhatsApp.",
  alternates: { canonical: "/lodges" },
};

/** stayzim.co.zw/lodges: every paid lodge, by town, linking to its own site (and helping search engines find them). */
export default async function LodgesPage() {
  return <LodgesDirectory groups={byTown(await getDirectory())} />;
}
