import { cn } from "@stayzim/ui/lib/utils";
import { ChevronLeft, ChevronRight, Lock, RotateCw } from "lucide-react";
import type { ReactNode } from "react";

/*
 * Device frames for previews. Each draws its screen at the device's real size
 * (CSS pixels), so a site lays out exactly as it would there; SitePreview
 * scales the whole frame to fit.
 */

export type Device = "iphone" | "browser";

/** iPhone 17 Pro Max: a 440 × 956 screen, its status bar and the Dynamic Island. */
const PHONE = { width: 440, height: 956, bezel: 10, rim: 4, radius: 62, statusBar: 62 };

/** A laptop-sized browser window. */
const BROWSER = { width: 1280, height: 800, toolbar: 48 };

export const DEVICE_SIZES: Record<Device, { width: number; height: number }> = {
  iphone: { width: PHONE.width + 2 * (PHONE.bezel + PHONE.rim), height: PHONE.height + 2 * (PHONE.bezel + PHONE.rim) },
  browser: { width: BROWSER.width + 2, height: BROWSER.height + BROWSER.toolbar + 2 },
};

/** The page area inside each frame, where the site's iframe goes. */
export const SCREEN_SIZES: Record<Device, { width: number; height: number }> = {
  iphone: { width: PHONE.width, height: PHONE.height - PHONE.statusBar },
  browser: { width: BROWSER.width, height: BROWSER.height },
};

/** True when white text reads better than black on this colour. */
function isDark(hex: string) {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  if (Number.isNaN(value)) return true;
  const [r, g, b] = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 150;
}

/** iOS status bar icons: cellular bars, Wi-Fi and the battery, drawn as on the phone. */
function StatusIcons() {
  return (
    <span className="flex items-center gap-[7px]" aria-hidden="true">
      <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor">
        <rect x="0" y="8" width="3.2" height="4" rx="0.8" />
        <rect x="5" y="5.5" width="3.2" height="6.5" rx="0.8" />
        <rect x="10" y="3" width="3.2" height="9" rx="0.8" />
        <rect x="15" y="0" width="3.2" height="12" rx="0.8" />
      </svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
        <path d="M8.5 2.3c2.4 0 4.6.9 6.2 2.5l1.2-1.2A10.5 10.5 0 0 0 8.5.6 10.5 10.5 0 0 0 1.1 3.6l1.2 1.2a8.8 8.8 0 0 1 6.2-2.5Z" />
        <path d="M8.5 5.6c1.5 0 2.9.6 3.9 1.6l1.2-1.2a7.2 7.2 0 0 0-10.2 0l1.2 1.2c1-1 2.4-1.6 3.9-1.6Z" />
        <path d="M8.5 8.9c.6 0 1.2.2 1.6.7L8.5 11.2 6.9 9.6c.4-.5 1-.7 1.6-.7Z" />
      </svg>
      <svg width="28" height="13" viewBox="0 0 28 13" fill="none">
        <rect x="0.5" y="0.5" width="23.5" height="12" rx="3.6" stroke="currentColor" strokeOpacity="0.4" />
        <rect x="2.2" y="2.2" width="18.5" height="8.6" rx="2.2" fill="currentColor" />
        <path d="M25.6 4.3v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill="currentColor" fillOpacity="0.45" />
      </svg>
    </span>
  );
}

/**
 * An iPhone 17 Pro Max in magenta: even thin bezels, the Dynamic Island, the
 * side buttons, a status bar tinted with the site's colour (as Safari does with
 * theme-color) and the home indicator over the page.
 */
export function IphoneFrame({ tint = "#FFFFFF", children }: { tint?: string; children: ReactNode }) {
  const outer = DEVICE_SIZES.iphone;
  const light = isDark(tint);
  const button = "absolute w-[5px] rounded-[3px] bg-[linear-gradient(90deg,#7D1F4E,#C2457F_45%,#8E2659)]";
  return (
    <div className="relative" style={{ width: outer.width, height: outer.height }}>
      {/* Side buttons: action, volume up and down (left); side button and Camera Control (right) */}
      <span className={cn(button, "-left-[3px] top-[190px] h-[34px]")} />
      <span className={cn(button, "-left-[3px] top-[256px] h-[64px]")} />
      <span className={cn(button, "-left-[3px] top-[336px] h-[64px]")} />
      <span className={cn(button, "-right-[3px] top-[300px] h-[100px]")} />
      <span className="absolute -right-[2px] top-[600px] h-[70px] w-[4px] rounded-[3px] bg-[linear-gradient(90deg,#5E1739,#A33468)]" />
      {/* Magenta aluminium rim, then the black bezel */}
      <div
        className="absolute inset-0 rounded-[76px] bg-[linear-gradient(145deg,#E06AA2_0%,#B8336F_30%,#8E2457_60%,#C64A84_100%)] shadow-[0_40px_80px_-30px_rgba(12,24,31,0.55),inset_0_0_0_1px_rgba(255,255,255,0.18)]"
        style={{ padding: PHONE.rim }}
      >
        <div className="size-full rounded-[72px] bg-[#050506]" style={{ padding: PHONE.bezel }}>
          <div className="relative size-full overflow-hidden bg-white" style={{ borderRadius: PHONE.radius }}>
            <div className="relative flex items-center justify-between px-[38px] pt-[20px]" style={{ height: PHONE.statusBar, backgroundColor: tint, color: light ? "#FFFFFF" : "#000000" }}>
              <span className="w-[64px] text-center text-[17px] leading-[22px] font-semibold tracking-[-0.02em]" style={{ fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
                9:41
              </span>
              <StatusIcons />
            </div>
            {/* Dynamic Island */}
            <span className="absolute top-[11px] left-1/2 z-10 h-[37px] w-[126px] -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
            <div className="relative" style={{ height: PHONE.height - PHONE.statusBar }}>
              {children}
            </div>
            <span className="pointer-events-none absolute bottom-[8px] left-1/2 z-10 h-[5px] w-[144px] -translate-x-1/2 rounded-full bg-black/80" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A plain desktop browser window: the three dots, back and forward, the address with its lock, and reload. */
export function BrowserFrame({ host, children }: { host: string; children: ReactNode }) {
  const outer = DEVICE_SIZES.browser;
  return (
    <div className="overflow-hidden rounded-[14px] border border-line bg-white shadow-[0_40px_80px_-30px_rgba(12,24,31,0.45)]" style={{ width: outer.width, height: outer.height }}>
      <div className="flex items-center gap-4 border-b border-line bg-surface px-4" style={{ height: BROWSER.toolbar }}>
        <span className="flex gap-2" aria-hidden="true">
          <span className="size-3 rounded-full bg-[#FF5F57]" />
          <span className="size-3 rounded-full bg-[#FEBC2E]" />
          <span className="size-3 rounded-full bg-[#28C840]" />
        </span>
        <span className="flex gap-2 text-muted-2" aria-hidden="true">
          <ChevronLeft className="size-[18px]" />
          <ChevronRight className="size-[18px] opacity-40" />
        </span>
        <span className="mx-auto flex h-8 w-[560px] max-w-full items-center justify-center gap-2 rounded-[9px] bg-white px-3 text-[13.5px] text-slate shadow-[inset_0_0_0_1px_var(--color-line)]">
          <Lock className="size-3.5 text-muted-2" aria-hidden="true" />
          <span className="truncate">{host}</span>
        </span>
        <RotateCw className="size-4 text-muted-2" aria-hidden="true" />
      </div>
      <div className="relative" style={{ height: BROWSER.height }}>
        {children}
      </div>
    </div>
  );
}
