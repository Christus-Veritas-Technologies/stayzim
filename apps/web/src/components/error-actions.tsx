"use client";

import { Button, buttonVariants } from "@stayzim/ui/components/button";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { WhatsAppIcon } from "@/components/landing/brand";
import { whatsappUrl } from "@/lib/whatsapp";

/** The props Next.js gives error.tsx and global-error.tsx. */
export type ErrorProps = { error: Error & { digest?: string }; retry: () => void };

/** Logs the error for the browser console (and any error reporting added later). */
export function useReportError(error: ErrorProps["error"]) {
  useEffect(() => {
    console.error(error);
  }, [error]);
}

/** "Try again" (with a short spinner, so the tap visibly did something) and "Message us". */
export function ErrorActions({ retry, size = "lg" }: { retry: () => void; size?: "default" | "lg" }) {
  const [retrying, setRetrying] = useState(false);

  function onRetry() {
    setRetrying(true);
    retry();
    // If it fails again the boundary stays mounted: let them try once more
    window.setTimeout(() => setRetrying(false), 1200);
  }

  return (
    <>
      <Button size={size} onClick={onRetry} loading={retrying}>
        {retrying ? null : <RotateCcw />}
        Try again
      </Button>
      <a href={whatsappUrl("help")} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size })}>
        <WhatsAppIcon size={16} color="#1F7A4D" />
        Message us
      </a>
    </>
  );
}

/** "Reference: 12ab34" so support can find the error in the server logs. */
export function errorReference(error: ErrorProps["error"]) {
  return error.digest ? `Reference: ${error.digest}` : undefined;
}
