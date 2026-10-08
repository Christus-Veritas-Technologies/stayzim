"use client";

import { buttonVariants } from "@stayzim/ui/components/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import type { Device } from "@/components/preview/devices";
import { DeviceTabs, SitePreview } from "@/components/preview/site-preview";

export type SheetPreview = { title: string; description?: string; src: string; host: string; tint?: string };

/**
 * A design shown on the owner's own site (or an example lodge), in an iPhone
 * or a browser, with Open in a new tab and an action (Use, Pick). Keeps the
 * last design on screen while the sheet slides away.
 */
export function PreviewSheet({ preview, onClose, note, action }: { preview: SheetPreview | null; onClose: () => void; note?: ReactNode; action?: ReactNode }) {
  const [device, setDevice] = useState<Device>("iphone");
  const [shown, setShown] = useState<SheetPreview | null>(preview);
  useEffect(() => {
    if (preview) setShown(preview);
  }, [preview]);

  return (
    <Sheet open={preview !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-[min(1120px,calc(100vw-1rem))]">
        <SheetHeader>
          <SheetTitle>{shown?.title}</SheetTitle>
          {shown?.description ? <SheetDescription>{shown.description}</SheetDescription> : null}
        </SheetHeader>
        <SheetBody className="flex min-h-0 flex-1 flex-col gap-3 bg-surface-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DeviceTabs value={device} onChange={setDevice} />
            {note ? <p className="text-xs text-muted-2">{note}</p> : null}
          </div>
          <div className="min-h-[420px] flex-1">
            {shown ? <SitePreview key={shown.src} src={shown.src} host={shown.host} tint={shown.tint} device={device} fit="contain" settle={0} title={`${shown.title} preview`} /> : null}
          </div>
        </SheetBody>
        <SheetFooter className="flex-wrap justify-between">
          <a href={shown?.src} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2" })}>
            Open in a new tab
            <ArrowUpRight />
          </a>
          {action}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
