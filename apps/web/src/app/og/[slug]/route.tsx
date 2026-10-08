import { ImageResponse } from "next/og";

import { lodgePlace } from "@/lib/lodge";
import { mediumPhoto, OG_HEADERS, OG_SIZE, ogFonts, ogPhoto } from "@/lib/og";
import { getSite } from "@/lib/site";

/**
 * A lodge's share card (/og/{slug}): its hero photo with the name, the place and
 * the lowest room price, so a link on WhatsApp or Facebook looks like the lodge.
 * Served from StayZim's own domain, so it works for subdomains and own domains alike.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const site = await getSite((await params).slug);
  if (!site || site.status !== "LIVE") return new Response("Not found", { status: 404 });

  const [photo, fonts] = await Promise.all([ogPhoto(mediumPhoto(site.heroUrl, site.heroSrcSet)), ogFonts()]);
  const place = lodgePlace(site);
  const prices = site.rooms.map((room) => room.price).filter((price) => price > 0);
  const from = prices.length > 0 ? Math.min(...prices) : null;
  const book = site.booking.mode === "request" ? "Book direct, online or on WhatsApp" : "Book direct on WhatsApp";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: site.themeColor, fontFamily: "Instrument Sans" }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse draws plain <img>
          <img src={photo} alt="" width={OG_SIZE.width} height={OG_SIZE.height} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: photo
              ? "linear-gradient(180deg, rgba(8,16,20,0) 30%, rgba(8,16,20,0.55) 62%, rgba(8,16,20,0.88) 100%)"
              : "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0.35) 100%)",
          }}
        />
        <div style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", width: "100%", padding: "56px 64px", color: "#FFFFFF" }}>
          {place ? <div style={{ display: "flex", fontSize: 30, color: "rgba(255,255,255,0.86)", marginBottom: 8 }}>{place}</div> : null}
          <div style={{ display: "flex", fontFamily: "Familjen Grotesk", fontSize: site.name.length > 26 ? 66 : 82, fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.02em" }}>
            {site.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 28, fontSize: 28 }}>
            {from ? (
              <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "#FFFFFF", color: "#0C181F", fontWeight: 600 }}>From ${from} a night</div>
            ) : null}
            <div style={{ display: "flex", padding: "10px 22px", borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "2px solid rgba(255,255,255,0.4)", fontWeight: 600 }}>{book}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts, headers: OG_HEADERS },
  );
}
