import { permanentRedirect } from "next/navigation";

import { createPath } from "@/lib/to-create";

/** Sign-up is /create now: the demo first, the email after ("Claim my site"). Old links and ads still work. */
export default async function SignupPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  permanentRedirect(createPath(await searchParams));
}
