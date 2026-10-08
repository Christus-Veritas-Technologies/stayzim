# SEO: getting lodge sites and StayZim found

Lodge sites live on `{slug}.stayzim.co.zw` or, once paid for, on the lodge's own domain (`mistvalleylodge.co.zw`). StayZim's own pages are on `stayzim.co.zw`. This is how both get into Google and look right when shared, what's built, and what's next.

**The rule:** demos stay out of search. A site becomes indexable the moment it's paid for, and we tell search engines straight away.

## What's built

### Indexing

- **Demos are hidden.** A demo's pages are `noindex, nofollow`, its `robots.txt` disallows everything and its sitemap is empty (`apps/web/src/app/robots.ts`, `sitemap.ts`, `generateMetadata` in `app/sites/[slug]/page.tsx` and `lib/site-page-route.ts`).
- **Paid sites:**
  - Their `robots.txt` allows everything and names the site's sitemap.
  - The sitemap lists the plan's pages, a page per room (Growth and Pro), and the journal with each post (Pro).
- **StayZim's sitemap** (`stayzim.co.zw/sitemap.xml`) has:
  - the landing page, `/create`, `/lodges`, `/privacy` and `/terms`;
  - **every paid lodge's home page**, from `GET /api/sites`.

  Cross-host entries are fine under a Search Console Domain property (below).
- **`/lodges`:** a public directory of paid lodges by town, linked from the landing footer. It gives every site a link from stayzim.co.zw, which is how Google finds new ones between sitemap reads.
- **IndexNow** (`apps/server/src/lib/indexnow.ts`):
  - When a payment brings a site out of a demo or back online, or moves it to another plan, the API sends its pages to IndexNow on the site's own address. Bing, Yandex, Seznam and Naver take part.
  - The key is `INDEXNOW_KEY`, the same value on the API and web. The web app serves it at `/indexnow-key.txt` on every host, as the `keyLocation`.
  - Unset, or on localhost, nothing is sent.
  - Google doesn't use IndexNow, so for Google it's the sitemaps and links.

### One address per site

- A lodge with its own domain:
  - The subdomain keeps answering, so a domain whose DNS or certificate isn't live yet never takes the site down.
  - Every page's canonical tag names the own domain, which is how Google merges the two.
- `www.{domain}` 308s to `{domain}`, path and query kept (`src/proxy.ts`).
- A page a cheaper plan no longer has 308s to the home page. A room that's gone 307s to `/rooms`. Either way, links already indexed aren't wasted.

### Sharing (Open Graph and X)

- **Lodge pages:**
  - Each shares a 1200×630 card drawn from the hero photo, with the name, place, "From $X a night" and how to book (`app/og/[slug]/route.tsx`).
  - The card is served from stayzim.co.zw, so it works for subdomains and own domains alike.
  - Its `?v=` changes when the photo, name, place, prices or booking mode do, so WhatsApp and Facebook pick up a new card.
  - `og:site_name` is the lodge, the locale is `en_ZW`, and X gets a large card (`lib/share-metadata.ts`).
  - A journal post uses its cover photo.
- **StayZim's pages** share a brand card (`app/og/route.tsx`), with `metadataBase` set to stayzim.co.zw in the root layout.
- **Fonts:** the cards use Familjen Grotesk and Instrument Sans, fetched from Google Fonts once per process. If that fails they fall back to the built-in font, and a photo that's slow or isn't JPEG or PNG gives a card without it.

### Structured data (`lib/structured-data.ts`)

- **Lodge home page:**
  - `LodgingBusiness`: address, geo, check-in and check-out times, a price range, the rooms as `HotelRoom`, and social links.
  - `aggregateRating`, from the Pro review score. It never uses a demo's example reviews.
  - `FAQPage`.
- **Room pages:** `HotelRoom` with an `Offer` per night.
- **Journal posts:** `BlogPosting`.
- **Landing page:** `Organization` (StayZim, Mutare) and `WebSite`.

## To do by hand, once

1. **Search Console, Domain property for `stayzim.co.zw`.** Verify it with a DNS TXT record in Cloudflare. One property covers the apex and every lodge subdomain. Submit `https://stayzim.co.zw/sitemap.xml`; each lodge's sitemap is in its own `robots.txt`.
2. **Bing Webmaster Tools:** import from Search Console. IndexNow pings show up there.
3. **`INDEXNOW_KEY`:** any 8 to 128 letters, digits or hyphens, set on the API and the web service. Check that `https://stayzim.co.zw/indexnow-key.txt` shows it.
4. **Own domains:** add each one as its own Domain property, verified by TXT. StayZim controls DNS for the free `.co.zw` ones.

## Next

- **Owner text over generated text.** Generated copy (`packages/sites/src/copy/`) is varied by a hash, but lodges in the same town and setting can still share sentences. Thin or duplicate pages rank poorly. Nudge owners to write their description and room text: the Design screen already offers "Try other wording", and the setup checklist could ask for a description of 300 characters or more.
- **Google Business Profile:** the Starter promise. Add a guided checklist in the dashboard (claim, photos, the site link, the WhatsApp number), since local results matter more than the site's own ranking for "lodge in Nyanga".
- **Per-lodge favicons:** the root `app/icon.png` file overrides an `icons` entry in a page's metadata, so lodge sites show StayZim's icon today. Serve the lodge's logo from a route (like `/og/{slug}`) and drop the root file icon for lodge hosts.
- **Speed:**
  - Lodge pages fetch with `no-store`. Move to ISR with revalidation when the owner saves.
  - Serve photos as AVIF or WebP through `next/image` with R2.
  - Load only the site's own fonts on lodge pages (today the root layout loads StayZim's too).
- **Measurement:** a Search Console summary per lodge in Analytics (clicks and queries), through the Search Console API on the Domain property.
- **Content pages:** Pro journal posts are real content; suggest topics by setting ("Things to do near Nyanga in winter").
- **Free domain copy:** the plan lists and terms are static. Setting `DOMAIN_STILL_FREE=false` ends the offer in the dashboard but not on the pricing page, so change both together.
