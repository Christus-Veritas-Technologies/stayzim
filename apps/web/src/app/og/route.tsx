import { ImageResponse } from "next/og";

import { OG_HEADERS, OG_SIZE, ogFonts, ogMark } from "@/lib/og";

/** StayZim's own share card (/og), for the landing page and every page on stayzim.co.zw. */
export async function GET() {
  const [mark, fonts] = await Promise.all([ogMark(), ogFonts()]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          color: "#FFFFFF",
          fontFamily: "Instrument Sans",
          background: "linear-gradient(135deg, #0096BE 0%, #007DA2 45%, #006483 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img> */}
          {mark ? <img src={mark} alt="" width={72} height={72} style={{ borderRadius: 18, boxShadow: "0 0 0 3px rgba(255,255,255,0.35)" }} /> : null}
          <div style={{ display: "flex", fontFamily: "Familjen Grotesk", fontSize: 44, fontWeight: 700 }}>StayZim</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Familjen Grotesk", fontSize: 84, fontWeight: 700, lineHeight: 1.02, letterSpacing: "-0.025em", maxWidth: 940 }}>
            Your own lodge website, booked on WhatsApp.
          </div>
          <div style={{ display: "flex", marginTop: 26, fontSize: 32, color: "rgba(255,255,255,0.86)" }}>0% commission · Live in about a minute · Made in Mutare</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28 }}>
          <div style={{ display: "flex", fontWeight: 600 }}>stayzim.co.zw</div>
          <div style={{ display: "flex", padding: "12px 26px", borderRadius: 999, background: "#FFFFFF", color: "#006483", fontWeight: 600 }}>Free for 2 days</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts, headers: OG_HEADERS },
  );
}
