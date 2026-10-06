import { cn } from "@stayzim/ui/lib/utils";
import type { CSSProperties } from "react";

import { templateLook } from "@/components/site/templates/looks";

const TONES = {
  light: { page: "#FFFFFF", ink: "#0C181F", line: "rgba(12,24,31,0.12)", card: "#F2F5F7" },
  dark: { page: "#0F1A1F", ink: "#F2F5F7", line: "rgba(255,255,255,0.18)", card: "rgba(255,255,255,0.08)" },
  warm: { page: "#F6EFE4", ink: "#2A1F14", line: "rgba(42,31,20,0.14)", card: "rgba(255,255,255,0.6)" },
};

/** The lodge's hero photo, or a hillside gradient before there is one. */
function Photo({ url, className }: { url: string | null; className?: string }) {
  return (
    <span className={cn("block overflow-hidden bg-[linear-gradient(180deg,#C9D9D2_0%,#7C978B_60%,#3E5A4E_100%)]", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : null}
    </span>
  );
}

function Lines({ ink, widths }: { ink: string; widths: string[] }) {
  return (
    <span className="flex flex-col gap-[3px]">
      {widths.map((width, index) => (
        <span key={index} className="block h-[3px] rounded-full opacity-35" style={{ width, backgroundColor: ink }} />
      ))}
    </span>
  );
}

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
  const look = templateLook(templateKey);
  const tone = TONES[look.tone];
  const accent = look.tone === "dark" ? tone.ink : themeColor;
  const headline = (
    <span
      className={cn("block text-[13px] leading-none font-bold tracking-[-0.01em]", look.font === "serif" ? "font-serif" : "font-display")}
      style={{ color: accent }}
    >
      Aa
    </span>
  );
  const book = <span className="block h-[7px] w-9 rounded-[3px] bg-[#25D366]" />;
  const rooms = (count: number, tall = false) => (
    <span className="grid grid-cols-3 gap-1">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className="flex flex-col gap-[3px] rounded-[4px] p-[3px]" style={{ backgroundColor: tone.card }}>
          <Photo url={heroUrl} className={cn("rounded-[2px]", tall ? "h-5" : "h-3.5")} />
          <span className="block h-[3px] w-3/4 rounded-full opacity-40" style={{ backgroundColor: tone.ink }} />
        </span>
      ))}
    </span>
  );

  return (
    <span
      aria-hidden="true"
      className={cn("flex aspect-[4/3] w-full flex-col overflow-hidden text-left", className)}
      style={{ backgroundColor: tone.page } as CSSProperties}
    >
      {/* Site header */}
      <span className="flex h-4 shrink-0 items-center justify-between border-b px-2" style={{ borderColor: tone.line }}>
        <span className="block h-[4px] w-8 rounded-full opacity-60" style={{ backgroundColor: tone.ink }} />
        <span className="block h-[6px] w-5 rounded-[2px] bg-[#25D366]" />
      </span>

      <span className="flex flex-1 flex-col gap-2 p-2">
        {look.layout === "stack" ? (
          <>
            <Photo url={heroUrl} className="h-[38%] shrink-0 rounded-[4px]" />
            <span className="flex flex-col gap-1.5">
              {headline}
              <Lines ink={tone.ink} widths={["80%", "55%"]} />
              {book}
            </span>
            {rooms(3)}
          </>
        ) : look.layout === "split" ? (
          <>
            <span className="grid flex-1 grid-cols-2 items-center gap-2">
              <span className="flex flex-col gap-1.5">
                {headline}
                <Lines ink={tone.ink} widths={["95%", "70%", "50%"]} />
                {book}
              </span>
              <Photo url={heroUrl} className="h-full min-h-10 rounded-[4px]" />
            </span>
            {rooms(3)}
          </>
        ) : (
          <>
            <span className="flex items-end justify-between gap-2">
              <span className="flex flex-col gap-1.5">
                {headline}
                <Lines ink={tone.ink} widths={["70%"]} />
              </span>
              {book}
            </span>
            {rooms(3, true)}
            {rooms(3, true)}
          </>
        )}
      </span>
    </span>
  );
}
