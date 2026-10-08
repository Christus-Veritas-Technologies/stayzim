"use client";

import { Button } from "@stayzim/ui/components/button";
import { Dialog, DialogContent, DialogTitle } from "@stayzim/ui/components/dialog";
import { Spinner } from "@stayzim/ui/components/spinner";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Monitor, RotateCw, Smartphone, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { BrowserFrame, DEVICE_SIZES, IphoneFrame, SCREEN_SIZES, type Device } from "@/components/preview/devices";

/** Typing changes the preview once the owner pauses */
const SETTLE_MS = 700;
/** A page that hasn't loaded by then gets "Try again" */
const TIMEOUT_MS = 15_000;

/** `value`, once it has stopped changing for `delay` ms (straight away when 0). */
function useSettled(value: string, delay: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    if (delay === 0) {
      setSettled(value);
      return;
    }
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

/** The box's size, kept up to date. */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setSize({ width: element.clientWidth, height: element.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** iPhone or Browser, above a preview. */
export function DeviceTabs({ value, onChange, className }: { value: Device; onChange: (device: Device) => void; className?: string }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as Device)} className={className}>
      <TabsList aria-label="Preview on">
        <TabsTab value="iphone">
          <Smartphone />
          iPhone
        </TabsTab>
        <TabsTab value="browser">
          <Monitor />
          Browser
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}

export type SitePreviewProps = {
  /** The page: /preview/sample/…, /preview/draft/…, /preview/{slug}/{template} */
  src: string;
  device?: Device;
  /** The address shown (browser bar), e.g. mistvalley.stayzim.co.zw */
  host: string;
  /** The site's colour, for the phone's status bar (Safari tints it with theme-color) */
  tint?: string;
  title?: string;
  /** "width": as wide as the box, height to match. "contain": fits the box both ways (give it a height). */
  fit?: "width" | "contain";
  /** Wait for typing to pause before loading a new address (ms); 0 loads at once */
  settle?: number;
  /** Show the full-screen button */
  expandable?: boolean;
  className?: string;
};

/**
 * A lodge site exactly as guests see it, in an iPhone or a browser window,
 * scaled to fit wherever it's placed. The real page loads in an iframe at the
 * device's own size. A new address loads behind the current one and swaps in
 * when it's ready, so the preview never goes blank while the owner types; a
 * page that fails or stalls offers Try again.
 */
export function SitePreview({ src, device = "iphone", host, tint, title = "Preview of your site", fit = "width", settle = SETTLE_MS, expandable = true, className }: SitePreviewProps) {
  const [box, size] = useBoxSize<HTMLDivElement>();
  const [retry, setRetry] = useState(0);
  const wanted = useSettled(`${src}${retry ? `${src.includes("?") ? "&" : "?"}retry=${retry}` : ""}`, settle);
  const [shown, setShown] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const loading = wanted !== shown;

  // A page that hasn't loaded in time: say so, keep what's showing
  useEffect(() => {
    setFailed(false);
    if (!loading) return;
    const timer = window.setTimeout(() => setFailed(true), TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [wanted, loading]);

  const outer = DEVICE_SIZES[device];
  const screen = SCREEN_SIZES[device];
  const scale =
    size.width === 0 ? 0 : Math.min(1, size.width / outer.width, fit === "contain" && size.height > 0 ? size.height / outer.height : Number.POSITIVE_INFINITY);

  const frames = [shown, loading ? wanted : null].map((url, layer) =>
    url ? (
      <iframe
        key={url}
        src={url}
        title={title}
        onLoad={() => setShown(url)}
        className={cn("absolute inset-0 border-0 bg-white", layer === 1 && "invisible")}
        style={{ width: screen.width, height: screen.height }}
      />
    ) : null,
  );

  const screenContent = (
    <>
      {frames}
      <AnimatePresence>
        {shown ? null : (
          <motion.div exit={{ opacity: 0 }} className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-[22px] text-muted">
            {failed ? null : <Spinner className="size-8 text-brand" />}
            {failed ? null : "Building the preview"}
          </motion.div>
        )}
      </AnimatePresence>
      {failed ? (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-white/95 p-8 text-center text-[22px]" role="alert">
          <TriangleAlert className="size-8 text-warning" />
          The preview didn&apos;t load.
          <Button size="lg" variant="outline" onClick={() => setRetry((value) => value + 1)} className="text-[20px]">
            <RotateCw />
            Try again
          </Button>
        </div>
      ) : null}
    </>
  );

  return (
    <div ref={box} className={cn("relative w-full", fit === "contain" && "h-full min-h-0", className)} style={fit === "width" ? { height: outer.height * scale } : undefined}>
      {scale > 0 ? (
        <div
          className="absolute top-0 origin-top-left"
          style={{ width: outer.width, height: outer.height, transform: `scale(${scale})`, left: Math.max(0, (size.width - outer.width * scale) / 2) }}
        >
          {device === "iphone" ? <IphoneFrame tint={tint}>{screenContent}</IphoneFrame> : <BrowserFrame host={host}>{screenContent}</BrowserFrame>}
        </div>
      ) : null}
      {loading && shown ? (
        <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[12px] font-medium text-muted shadow-xs" role="status">
          <Spinner className="size-3 text-brand" />
          Updating
        </span>
      ) : null}
      {expandable ? (
        <>
          <Button
            variant="outline"
            size="icon-sm"
            className="absolute top-2 right-2 z-10 bg-white/95"
            onClick={() => setExpanded(true)}
            aria-label="Full screen preview"
          >
            <Maximize2 />
          </Button>
          <FullscreenPreview open={expanded} onOpenChange={setExpanded} src={src} host={host} tint={tint} title={title} initialDevice={device} />
        </>
      ) : null}
    </div>
  );
}

/** The preview as big as the screen allows, with iPhone and Browser. */
export function FullscreenPreview({
  open,
  onOpenChange,
  initialDevice = "iphone",
  ...preview
}: { open: boolean; onOpenChange: (open: boolean) => void; initialDevice?: Device } & Pick<SitePreviewProps, "src" | "host" | "tint" | "title">) {
  const [device, setDevice] = useState<Device>(initialDevice);
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden bg-surface-2 p-0 sm:h-[calc(100svh-2rem)] sm:w-[calc(100vw-2rem)]" showClose={false}>
        <div className="flex items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <DialogTitle className="truncate">{preview.host}</DialogTitle>
          <div className="flex items-center gap-2">
            <DeviceTabs value={device} onChange={setDevice} />
            <Button variant="outline" size="sm" onClick={close}>
              Close
            </Button>
          </div>
        </div>
        <div className="min-h-0 flex-1 p-4 sm:p-6">{open ? <SitePreview {...preview} device={device} fit="contain" settle={0} expandable={false} /> : null}</div>
      </DialogContent>
    </Dialog>
  );
}
