import type { CSSProperties } from "react";

const WHATSAPP_PATH =
  "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z";

/** WhatsApp glyph. The design uses it in ink on green buttons, white on dark, green on white. */
export function WhatsAppIcon({ size = 20, color = "#17201C" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" className="block shrink-0">
      <path d={WHATSAPP_PATH} />
    </svg>
  );
}

/**
 * The StayZim app icon: a white-ringed pin with an "S" on a blue tile. Drawn
 * at 220px like the design source, then scaled to `size`.
 */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  const scaled: CSSProperties = { transform: `scale(${size / 220})` };
  return (
    <div className={`relative shrink-0 ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <div className="absolute top-0 left-0 size-[220px] origin-top-left" style={scaled}>
        <div className="absolute inset-0 overflow-hidden rounded-[50px] bg-[linear-gradient(180deg,#0096BE_0%,#007DA2_55%,#006483_100%)] shadow-[inset_0_2px_0_rgba(255,255,255,0.28)]">
          <div className="absolute top-[30px] right-[30px] size-5 rounded-full bg-peach" />
          <div className="absolute top-[172px] left-[84px] h-3 w-[52px] rounded-full bg-[rgba(0,40,60,0.4)]" />
          <div className="absolute top-8 left-[55px] size-[110px] -rotate-45 rounded-[50%_50%_50%_0] border-[9px] border-white bg-ink shadow-[0_10px_20px_rgba(0,40,60,0.35)]" />
          <span className="absolute top-[30px] left-[55px] flex size-[110px] items-center justify-center font-display text-[62px] font-bold text-white">
            S
          </span>
        </div>
      </div>
    </div>
  );
}

export function Wordmark({ size = 34, className, markClassName }: { size?: number; className?: string; markClassName?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 font-display font-bold tracking-[-0.01em] ${className ?? ""}`}>
      <LogoMark size={size} className={markClassName} />
      StayZim
    </span>
  );
}

/** "01 ── How it works" label above each section heading. */
export function Eyebrow({ index, children, tone = "brand" }: { index: string; children: string; tone?: "brand" | "sky" }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-sm font-semibold ${tone === "sky" ? "text-brand-sky" : "text-brand"}`}
    >
      <span className="font-mono text-[12.5px]">{index}</span>
      <span className="h-px w-7 bg-current opacity-50" />
      {children}
    </span>
  );
}
