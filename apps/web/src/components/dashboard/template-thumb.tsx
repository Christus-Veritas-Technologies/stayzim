import type { TemplateKey } from "@stayzim/sites";
import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties, ReactNode } from "react";

/** The lodge's hero photo, or a hillside gradient before there is one. */
function Photo({ url, className, style }: { url: string | null; className?: string; style?: CSSProperties }) {
  return (
    <span className={cn("block overflow-hidden bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)]", className)} style={style}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : null}
    </span>
  );
}

/** A line of text, drawn as a bar. */
function Bar({ width, color, height = 3, className }: { width: string; color: string; height?: number; className?: string }) {
  return <span className={cn("block shrink-0 rounded-full", className)} style={{ width, height, backgroundColor: color }} />;
}

/** Book: WhatsApp green on Starter designs, the lodge's colour on the others. */
function Book({ color, width = 26, className }: { color: string; width?: number | string; className?: string }) {
  return <span className={cn("block h-[7px] shrink-0 rounded-full", className)} style={{ width, backgroundColor: color }} />;
}

type Sketch = (props: { theme: string; photo: string | null }) => ReactNode;

const GREEN = "#25D366";
const CREAM = "#F4EEE3";

/** Three room cards in a row, filling what's left of the sketch. */
function Rooms({ photo, card, ink, rounded = 3 }: { photo: string | null; card: string; ink: string; rounded?: number }) {
  return (
    <span className="grid min-h-0 flex-1 grid-cols-3 gap-1">
      {[0, 1, 2].map((index) => (
        <span key={index} className="flex min-h-0 flex-col gap-[3px] p-[2px]" style={{ backgroundColor: card, borderRadius: rounded }}>
          <Photo url={photo} className="min-h-0 flex-1" style={{ borderRadius: Math.max(1, rounded - 1) }} />
          <Bar width="70%" color={ink} height={2} className="opacity-50" />
        </span>
      ))}
    </span>
  );
}

/**
 * Each designed template, sketched small in the lodge's colour and photo, so
 * owners can tell them apart before opening a preview.
 */
const SKETCHES: Record<TemplateKey, Sketch> = {
  // Rounded hero card with a price pill
  "starter-veranda": ({ theme, photo }) => (
    <span className="flex size-full flex-col gap-1.5 bg-white p-1.5">
      <span className="flex items-center justify-between px-0.5">
        <Bar width="22%" color="#15121C" />
        <Book color={GREEN} width={18} />
      </span>
      <span className="relative flex h-[46%] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[6px]">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,transparent,${theme}cc)` }} />
        <Bar width="50%" color="#fff" height={4} className="relative" />
        <span className="relative mt-1 flex items-center gap-1 rounded-full bg-white p-[2px] pl-1.5">
          <Bar width="18px" color="#15121C" height={2} />
          <Book color={GREEN} width={14} />
        </span>
      </span>
      <Rooms photo={photo} card="#F6F4FA" ink="#15121C" rounded={4} />
    </span>
  ),
  // Full-bleed hero, the number on the edge, tall cards
  "starter-rondavel": ({ photo }) => (
    <span className="flex size-full flex-col bg-white">
      <span className="relative flex h-[55%] shrink-0 flex-col items-center justify-center gap-1.5">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.3),rgba(20,16,12,0.7))]" />
        <span className="absolute top-1.5 left-1.5 size-2.5 border border-white/70" />
        <span className="absolute top-[30%] bottom-[30%] left-1.5 w-[2px] bg-white/50" />
        <Bar width="45%" color="#fff" height={4} className="relative" />
        <span className="relative h-2 w-7 border border-white/80" />
      </span>
      <span className="flex flex-1 flex-col gap-1 bg-[#F5F3EF] p-1.5">
        <Bar width="30%" color="#1E1E1C" height={3} />
        <span className="grid flex-1 grid-cols-3 gap-1">
          {[0, 1, 2].map((index) => (
            <span key={index} className="flex flex-col gap-[2px]">
              <Photo url={photo} className="flex-1" />
              <Book color={GREEN} width="100%" className="h-[4px] rounded-none" />
            </span>
          ))}
        </span>
      </span>
    </span>
  ),
  // Serif lodge: words on a shaded side, rooms on a band of the lodge's colour
  "starter-shade": ({ theme, photo }) => (
    <span className="flex size-full flex-col bg-[#F7F4EE]">
      <span className="flex h-3 shrink-0 items-center gap-1 bg-white px-1.5">
        <span className="size-1.5" style={{ backgroundColor: theme }} />
        <Bar width="24%" color="#172420" height={2} />
      </span>
      <span className="relative flex h-[42%] shrink-0 flex-col justify-center gap-1 px-2">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0" style={{ background: `linear-gradient(90deg,${theme}ee,transparent)` }} />
        <span className="relative font-serif text-[11px] leading-none text-white">Aa</span>
        <Book color={GREEN} width={16} className="relative rounded-[2px]" />
      </span>
      <span className="flex flex-1 items-center gap-1.5 p-1.5" style={{ backgroundColor: theme }}>
        <Photo url={photo} className="h-full w-[38%]" />
        <span className="flex flex-1 flex-col gap-1.5">
          {[0, 1, 2].map((index) => (
            <span key={index} className="flex items-center justify-between border-b border-white/20 pb-1">
              <Bar width="45%" color="#fff" height={2} />
              <Book color={GREEN} width={8} className="h-[4px] rounded-[1px]" />
            </span>
          ))}
        </span>
      </span>
    </span>
  ),
  // Pill navigation over a big photo, the enquiry bar along its foot
  "growth-shoreline": ({ theme, photo }) => (
    <span className="flex size-full flex-col gap-1.5 bg-white p-1">
      <span className="relative flex h-[58%] shrink-0 flex-col overflow-hidden rounded-[7px]">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0" style={{ background: `linear-gradient(180deg,transparent 30%,${theme}dd)` }} />
        <span className="relative flex items-center justify-between p-1">
          <span className="h-2 w-6 rounded-full bg-white" />
          <span className="flex gap-[2px]">
            {[0, 1, 2].map((index) => (
              <span key={index} className="h-1.5 w-2.5 rounded-full bg-white/80" />
            ))}
          </span>
          <Book color={theme} width={12} />
        </span>
        <span className="relative mt-auto mb-1 flex flex-col items-center gap-1">
          <Bar width="50%" color="#fff" height={4} />
          <span className="flex w-[85%] items-center gap-1 rounded-[4px] bg-white p-[3px]">
            {[0, 1, 2].map((index) => (
              <span key={index} className="h-[5px] flex-1 rounded-full bg-[#E8EEF1]" />
            ))}
            <Book color={theme} width={12} className="h-[5px]" />
          </span>
        </span>
      </span>
      <Rooms photo={photo} card="#F2F7F9" ink="#10202A" rounded={5} />
    </span>
  ),
  // A giant wordmark over the photo and a pill bar
  "growth-wordmark": ({ theme, photo }) => (
    <span className="flex size-full flex-col gap-1.5 bg-[#EEE7DC] p-1">
      <span className="relative flex h-[60%] shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-[7px] bg-[#2A1E14]">
        <Photo url={photo} className="absolute inset-0 opacity-50" />
        <span className="relative text-[22px] leading-none font-black tracking-[-0.04em] text-white/90">ABC</span>
        <Bar width="40%" color="#fff" height={3} className="relative" />
        <span className="relative flex w-[75%] items-center gap-1 rounded-full bg-white p-[3px]">
          <span className="h-[4px] flex-1 rounded-full bg-[#EEE7DC]" />
          <span className="h-[4px] flex-1 rounded-full bg-[#EEE7DC]" />
          <Book color={theme} width={12} className="h-[5px]" />
        </span>
      </span>
      <span className="mx-auto size-1.5 rounded-full" style={{ backgroundColor: theme }} />
      <Rooms photo={photo} card="#fff" ink="#231C16" rounded={5} />
    </span>
  ),
  // Glass navigation and a floating room card, the bar overlapping
  "growth-overlap": ({ theme, photo }) => (
    <span className="flex size-full flex-col bg-[#FAF7F2] p-1">
      <span className="relative flex h-[60%] shrink-0 items-center gap-2 overflow-hidden rounded-[7px] px-2">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0 bg-[linear-gradient(100deg,rgba(30,22,14,0.85),transparent)]" />
        <span className="absolute inset-x-1 top-1 h-2 rounded-[3px] border border-white/30 bg-white/10" />
        <span className="relative flex flex-1 flex-col gap-1">
          <span className="font-serif text-[13px] leading-none text-white">Aa</span>
          <span className="h-2 w-7 rounded-full bg-white" />
        </span>
        <span className="relative flex w-[30%] flex-col gap-[2px] rounded-[4px] border border-white/30 bg-white/15 p-[2px]">
          <Photo url={photo} className="h-5 rounded-[3px]" />
          <Bar width="70%" color="#fff" height={2} />
        </span>
      </span>
      <span className="relative z-10 mx-2 -mt-2 flex items-center gap-1 rounded-[4px] bg-white p-[3px] shadow-sm">
        <span className="h-[5px] flex-1 rounded-full bg-[#F2EBE2]" />
        <span className="h-[5px] flex-1 rounded-full bg-[#F2EBE2]" />
        <Book color={theme} width={12} className="h-[5px]" />
      </span>
      <span className="mt-1.5 flex flex-1 items-center justify-center gap-1 rounded-[4px] p-1" style={{ backgroundColor: theme }}>
        <Photo url={photo} className="h-full w-[24%] rounded-[3px] opacity-70" />
        <Photo url={photo} className="h-full w-[40%] rounded-[3px]" />
        <Photo url={photo} className="h-full w-[24%] rounded-[3px] opacity-70" />
      </span>
    </span>
  ),
  // Cinematic hero, the bar on its edge, Stay / See / Read
  "pro-escarpment": ({ theme, photo }) => (
    <span className="flex size-full flex-col" style={{ backgroundColor: CREAM }}>
      <span className="relative flex h-[56%] shrink-0 flex-col justify-center gap-1 px-2">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(22,19,15,0.85),rgba(22,19,15,0.2))]" />
        <span className="relative font-serif text-[14px] leading-none font-light text-white">Aa</span>
        <Bar width="35%" color="#fff" height={2} className="relative opacity-80" />
        <span className="absolute top-[30%] right-1.5 flex flex-col gap-1">
          {[0, 1, 2].map((index) => (
            <span key={index} className="h-[2px] w-1.5 bg-white/60" />
          ))}
        </span>
      </span>
      <span className="relative z-10 mx-2 -mt-1.5 flex items-center gap-1 rounded-[3px] bg-[#FAF6EE] p-[3px] shadow-sm">
        <span className="h-[4px] flex-1 rounded-full bg-white" />
        <span className="h-[4px] flex-1 rounded-full bg-white" />
        <Book color={theme} width={12} className="h-[5px] rounded-[2px]" />
      </span>
      <span className="grid flex-1 grid-cols-3 gap-1 p-2 pt-1.5">
        {[0, 1, 2].map((index) => (
          <Photo key={index} url={photo} className="rounded-[3px]" />
        ))}
      </span>
    </span>
  ),
  // Dark split hero, then rooms as a list
  "pro-courtyard": ({ photo }) => (
    <span className="flex size-full flex-col gap-1 bg-[#1C1B19] p-1">
      <span className="grid h-[58%] shrink-0 grid-cols-2 gap-1">
        <span className="flex flex-col items-center justify-center gap-1 rounded-[5px] bg-[#262420]">
          <span className="flex gap-[2px]">
            {[0, 1, 2].map((index) => (
              <Photo key={index} url={photo} className="h-2.5 w-2 rounded-[1px]" />
            ))}
          </span>
          <span className="text-[9px] leading-none tracking-[0.1em] text-[#F1EBE1]">ABC</span>
          <Book color="#C29A72" width={14} className="rounded-[2px]" />
        </span>
        <Photo url={photo} className="rounded-[5px]" />
      </span>
      <span className="flex flex-1 flex-col justify-center gap-1.5 px-1.5">
        {[0, 1, 2].map((index) => (
          <span key={index} className="flex items-center justify-between border-b border-white/10 pb-1">
            <Bar width="40%" color="#E8E1D5" height={2} />
            <span className="size-1.5 rounded-full border border-white/40" />
          </span>
        ))}
      </span>
    </span>
  ),
  // Aerial hero, numbers, a dark band
  "pro-canopy": ({ photo }) => (
    <span className="flex size-full flex-col bg-[#EFEAE2]">
      <span className="relative flex h-[52%] shrink-0 flex-col justify-end gap-1 p-2">
        <Photo url={photo} className="absolute inset-0" />
        <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(36,26,18,0.9))]" />
        <span className="relative font-serif text-[14px] leading-none text-white">Aa</span>
        <span className="relative h-2 w-8 rounded-full bg-white" />
      </span>
      <span className="flex items-end gap-2 px-2 py-1.5">
        {["4", "2–4", "$"].map((value) => (
          <span key={value} className="font-serif text-[10px] leading-none text-[#1F1A14]">
            {value}
          </span>
        ))}
      </span>
      <span className="flex flex-1 items-center gap-1.5 bg-[#2B2118] p-1.5">
        <span className="flex flex-1 flex-col gap-1">
          {[0, 1, 2].map((index) => (
            <Bar key={index} width="70%" color="#EFE9DF" height={2} className="opacity-70" />
          ))}
        </span>
        <Photo url={photo} className="h-full w-[42%]" />
      </span>
    </span>
  ),
};

/**
 * A small sketch of a template's layout in the lodge's colour and photo, so
 * owners can tell the templates apart before opening a preview.
 */
export function TemplateThumb({
  templateKey,
  themeColor,
  heroUrl,
  className,
}: {
  templateKey: string;
  themeColor: string;
  heroUrl: string | null;
  className?: string;
}) {
  const Sketch = SKETCHES[templateKey as TemplateKey] ?? SKETCHES["growth-shoreline"];
  return (
    <span aria-hidden="true" className={cn("flex aspect-[4/3] w-full overflow-hidden text-left", className)}>
      <Sketch theme={themeColor} photo={heroUrl} />
    </span>
  );
}
