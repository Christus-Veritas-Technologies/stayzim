"use client";

import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from "@stayzim/ui/components/sheet";
import { ChevronRight, Sparkles } from "lucide-react";
import { useState } from "react";

import type { Device } from "@/components/preview/devices";
import { DeviceTabs, SitePreview } from "@/components/preview/site-preview";

type Props = {
  src: string;
  host: string;
  tint?: string;
  /** "Updates as you edit" */
  live?: string;
  /** The phone card's two lines */
  label?: string;
  sublabel?: string;
};

/**
 * The live preview beside a dashboard form: a column on wide screens, and on
 * phones a "Preview your site" card that opens it in a sheet. It shows the
 * real site in its design, with the unsaved edits (a /preview/draft address).
 */
export function PreviewAside({ src, host, tint, live = "Updates as you edit", label = "Preview your site", sublabel = "See changes before you save" }: Props) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>("iphone");
  return (
    <>
      <aside className="sticky top-20 hidden flex-col gap-3 xl:flex">
        <div className="flex items-center justify-between gap-2 text-[13px]">
          <span className="font-semibold">Preview</span>
          <span className="inline-flex items-center gap-1.5 text-muted">
            <span className="size-1.5 rounded-full bg-success" />
            {live}
          </span>
        </div>
        <SitePreview src={src} host={host} tint={tint} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-[20px] bg-white p-3 text-left shadow-card transition-colors hover:bg-surface xl:hidden"
      >
        <span className="flex h-12 w-10 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(180deg,#E06AA2,#8E2457)] text-white">
          <Sparkles className="size-4" />
        </span>
        <span className="flex flex-1 flex-col">
          <span className="text-[14px] font-semibold">{label}</span>
          <span className="text-xs text-muted">{sublabel}</span>
        </span>
        <ChevronRight className="size-4 text-muted-2" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[92svh]">
          <SheetHeader>
            <SheetTitle>Preview</SheetTitle>
          </SheetHeader>
          <SheetBody className="flex min-h-0 flex-1 flex-col gap-3 bg-surface-2">
            <DeviceTabs value={device} onChange={setDevice} className="self-center" />
            <div className="min-h-0 flex-1">{open ? <SitePreview src={src} host={host} tint={tint} device={device} fit="contain" expandable={false} /> : null}</div>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
