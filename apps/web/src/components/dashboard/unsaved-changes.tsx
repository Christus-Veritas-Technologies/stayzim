"use client";

import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogIcon,
  AlertDialogTitle,
} from "@stayzim/ui/components/alert-dialog";
import { Button } from "@stayzim/ui/components/button";
import { PencilLine } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/** "Discard your changes?" with Keep editing and Discard. */
export function DiscardChangesDialog({
  open,
  onKeep,
  onDiscard,
}: {
  open: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !next && onKeep()}>
      <AlertDialogContent>
        <AlertDialogIcon tone="brand">
          <PencilLine />
        </AlertDialogIcon>
        <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
        <AlertDialogDescription>You have edits that aren&apos;t saved yet. If you leave now, they&apos;re lost.</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="outline" />}>Keep editing</AlertDialogClose>
          <Button variant="destructive" onClick={onDiscard}>
            Discard changes
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * While `when` is true (a form has edits), asks before the owner leaves: the
 * browser's own prompt on reload or closing the tab, and "Discard your
 * changes?" on links inside the dashboard.
 */
export function UnsavedChangesGuard({ when }: { when: boolean }) {
  const router = useRouter();
  const [leavingTo, setLeavingTo] = useState<string | null>(null);
  const discarding = useRef(false);

  useEffect(() => {
    if (!when) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when]);

  useEffect(() => {
    if (!when) return;
    // Capture phase on window: runs before next/link and the progress bar, so the click can be held back
    function onClick(event: MouseEvent) {
      if (discarding.current || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setLeavingTo(`${url.pathname}${url.search}${url.hash}`);
    }
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, [when]);

  return (
    <DiscardChangesDialog
      open={leavingTo !== null}
      onKeep={() => setLeavingTo(null)}
      onDiscard={() => {
        const href = leavingTo;
        setLeavingTo(null);
        if (!href) return;
        discarding.current = true;
        router.push(href as Route);
      }}
    />
  );
}
