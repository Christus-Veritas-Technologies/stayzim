"use client";

import { Spinner } from "@stayzim/ui/components/spinner";
import { Tabs, TabsList, TabsTab } from "@stayzim/ui/components/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Smartphone } from "lucide-react";
import { useState } from "react";

export type PreviewWidth = "phone" | "desktop";

/** Phone or desktop, above a preview (wide screens only: phones show the phone size anyway). */
export function PreviewWidthTabs({ value, onChange }: { value: PreviewWidth; onChange: (width: PreviewWidth) => void }) {
  return (
    <Tabs value={value} onValueChange={(next) => onChange(next as PreviewWidth)} className="hidden sm:flex">
      <TabsList aria-label="Preview size">
        <TabsTab value="phone">
          <Smartphone />
          Phone
        </TabsTab>
        <TabsTab value="desktop">
          <Monitor />
          Desktop
        </TabsTab>
      </TabsList>
    </Tabs>
  );
}

/**
 * A site page (`/preview/{slug}/{template}`) in a phone frame or at full
 * width, with "Building the preview" until it has loaded. Used by the Design
 * screen and by /create's designs.
 */
export function TemplatePreviewFrame({ src, title, width }: { src: string | undefined; title: string; width: PreviewWidth }) {
  // Which page has finished loading, so a new src shows the spinner again
  const [loaded, setLoaded] = useState<string | null>(null);
  return (
    <div className="relative flex min-h-[460px] flex-1 justify-center">
      <motion.div
        animate={{ width: width === "phone" ? 390 : "100%" }}
        transition={{ type: "spring", stiffness: 260, damping: 32 }}
        className={cn(
          "relative h-full max-w-full overflow-hidden bg-white shadow-card",
          width === "phone" ? "rounded-[30px] border-[6px] border-ink" : "rounded-[14px] border border-line",
        )}
      >
        {src ? <iframe key={src} src={src} title={title} onLoad={() => setLoaded(src)} className="size-full min-h-[448px] border-0" /> : null}
        <AnimatePresence>
          {src && loaded === src ? null : (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white text-[13px] text-muted"
            >
              <Spinner className="size-5 text-brand" />
              Building the preview
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
