"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { Spinner } from "@stayzim/ui/components/spinner";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { StatusScreen } from "@/components/status-screen";
import { env } from "@/lib/public-env";
import { stayzimChatUrl } from "@/lib/whatsapp";

/**
 * stayzim.co.zw/claim/<token>: the one-time link the team sends a lead for a
 * site they made for them ("Give to lead" in the admin app). It signs the lead
 * in to that site and opens the dashboard, where Claim my site asks for their
 * email and password, as after /create.
 */
export default function ClaimLinkPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  // The link works once: never send it twice (React runs effects twice in development)
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    void fetch(`${env.NEXT_PUBLIC_SERVER_URL}/api/auth/claim-link/redeem`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (response.ok) {
          router.replace("/dashboard");
          return;
        }
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        setError(body.message ?? "We couldn't open your site. Ask us for a new link.");
      })
      .catch(() => setError("Could not reach StayZim. Check your connection and open the link again."));
  }, [router, token]);

  if (error) {
    return (
      <StatusScreen
        badge="Oops"
        title="This link didn't open your site"
        actions={
          <>
            <a href={stayzimChatUrl("Hi StayZim, my link to my new site didn't work. Can you send me a new one?")} className={buttonVariants({ size: "lg" })}>
              Ask us on WhatsApp
            </a>
            <Link href="/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Log in
              <ArrowRight />
            </Link>
          </>
        }
      >
        {error}
      </StatusScreen>
    );
  }

  return (
    <StatusScreen badge={<Spinner className="size-12" />} title="Opening your site" actions={null}>
      One moment: we&apos;re getting the site we made for you ready.
    </StatusScreen>
  );
}
