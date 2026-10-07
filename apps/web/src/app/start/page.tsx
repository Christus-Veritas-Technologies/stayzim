import { permanentRedirect } from "next/navigation";

import { createPath } from "@/lib/to-create";

/** The old start wizard is /create now. */
export default async function StartPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  permanentRedirect(createPath(await searchParams));
}
