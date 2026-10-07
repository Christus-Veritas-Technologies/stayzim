"use client";

import { Button } from "@stayzim/ui/components/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { afterClaim, ClaimForm } from "@/components/create/claim-form";
import { authClient } from "@/lib/auth-client";

/** "Claim my site" in a sheet: the same form as on /create's last screen. */
export function ClaimSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-sm:max-h-[92svh]">
        <SheetHeader>
          <SheetTitle>Claim your site</SheetTitle>
          <SheetDescription>Add your email, so it&apos;s yours to log in to from any phone, and your invoices have somewhere to go.</SheetDescription>
        </SheetHeader>
        <SheetBody>
          <ClaimForm
            onClaimed={(email) => {
              onOpenChange(false);
              toast.success(`Saved. Log in with ${email} from now on.`);
            }}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

/** A button that opens the claim sheet. */
export function ClaimButton({ className, size = "sm" }: { className?: string; size?: "sm" | "lg" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={size} className={className} onClick={() => setOpen(true)}>
        <ShieldCheck />
        Claim my site
      </Button>
      <ClaimSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/**
 * Above every dashboard page while the site belongs to a guest account from
 * /create: without an email, losing this phone's cookies loses the site.
 * Also finishes a Google claim (?claimed=1 on the way back).
 */
export function ClaimBanner() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session } = authClient.useSession();
  const handled = useRef(false);
  const guest = session?.user.isAnonymous === true;

  useEffect(() => {
    if (handled.current || params.get("claimed") !== "1" || !session || guest) return;
    handled.current = true;
    void afterClaim().then(() => {
      toast.success(`Saved. Log in with ${session.user.email} from now on.`);
      router.replace("/dashboard");
    });
  }, [guest, params, router, session]);

  if (!guest) return null;
  return (
    <div className="flex flex-col gap-3 border-b border-brand/20 bg-brand-wash/50 px-4 py-3 sm:flex-row sm:items-center sm:px-6 lg:px-7">
      <ShieldCheck className="hidden size-5 shrink-0 text-brand sm:block" />
      <p className="flex-1 text-[13.5px] leading-5 text-ink">
        <strong className="font-semibold">Your site isn&apos;t saved to an email yet.</strong>{" "}
        <span className="text-muted">Claim it so you can log in from any phone and never lose it.</span>
      </p>
      <ClaimButton className="self-start sm:self-auto" />
    </div>
  );
}
