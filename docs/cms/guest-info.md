# Guest info: stay details, FAQ, and social and listing links

_Status: **built** (6 October 2026). All plans. Three small features on one new dashboard page. Read the [CMS architecture](README.md) first._

These are the things guests ask on WhatsApp again and again. Owners can't put them on their site today without a change request:

- "What time can we check in?"
- "Do you take children?"
- "Are you on Instagram?"

## Data

Migration `lodge_guest_info`:

```prisma
model Lodge {
  // … existing fields
  checkInFrom        String?                          // "14:00"
  checkOutBy         String?                          // "10:00"
  houseRules         Json    @default("[]")           // string[]
  cancellationPolicy String?
  faq                Json    @default("[]")           // { q: string; a: string }[]
  socialLinks        Json    @default("{}")           // Partial<Record<SocialKey, string>>
}
```

All of it is optional and additive. The Json columns are read through zod with `.catch` defaults (`[]`, `{}`), so a bad value can never break a site.

## Schema

The schema lives in `packages/sites/src/content/schemas.ts` and is added to `lodgePatch`.

```ts
const time = z.string().regex(/^([01]\d|2[0-3]):[03]0$/, "Pick a time").nullable(); // 30-minute steps
export const guestInfo = z.object({
  checkInFrom: time,
  checkOutBy: time,
  houseRules: z.array(z.string().trim().min(1).max(120, "Keep each rule under 120 characters")).max(10, "Up to 10 house rules"),
  cancellationPolicy: optionalText(600),
  faq: z.array(z.object({
    q: z.string().trim().min(3, "Write the question").max(120),
    a: z.string().trim().min(1, "Write the answer").max(400),
  })).max(8, "Up to 8 questions"),
  socialLinks: socialLinksSchema, // below
});
```

How `socialLinksSchema` checks links:

- Each key is optional and must be an `https://` URL on the network's own hosts:

  | Key | Hosts |
  | --- | --- |
  | facebook | facebook.com, fb.com |
  | instagram | instagram.com |
  | tiktok | tiktok.com |
  | tripadvisor | tripadvisor.com, tripadvisor.co.za, … |
  | bookingCom | booking.com |
  | airbnb | airbnb.com, airbnb.co.za, … |

- An Instagram handle typed as "@mistvalley" becomes `https://instagram.com/mistvalley`. The same goes for TikTok.
- A wrong host gets "That isn't an Instagram link".
- An empty field removes the key.

`LiveSite` gets the same fields after cleaning:

- times stay `string | null`;
- empty lists stay `[]`;
- `socialLinks` becomes an ordered array, `{ key, url, label }[]`, so templates just loop over it.

## Server

- `PATCH /api/lodge` already takes partial updates, so it just validates the new fields with `guestInfo.partial()`.
- `lodgeJson()` adds the fields, and `routes/sites.ts` projects them.
- No new routes.

## Dashboard: the Guest info page

The page is `apps/web/src/app/dashboard/guest-info/page.tsx`, under **My site**, between Gallery and Design. It's added to `nav.ts`, `SITE_PAGES` and `breadcrumb()`.

It's built like Lodge info (`app/dashboard/site/page.tsx`):

- `FormSection`s with Set / Not set badges;
- one draft and one Save, sending only the changed fields (`changesFrom`);
- Discard;
- `UnsavedChangesGuard`;
- the sticky Save bar on phones;
- the live `SitePreview` on wide screens and in a bottom sheet on phones;
- the "Changes saved, they're live on …" toast with View site;
- `RequestChangeHint` at the bottom.

It has three sections.

### 1. Stay details

- **Check-in from** and **Check-out by:** two selects in 30-minute steps (06:00–23:30), each with a "Not set" option. Shown as 14:00 (24-hour, the way Zimbabwean lodges write it).
- **House rules:** a list editor (a new `components/dashboard/list-editor.tsx`, reused by FAQ):
  - each row is an `Input` with a drag handle and a remove button;
  - "Add a rule" adds a row and focuses it;
  - the counter reads "3 of 10";
  - Enter in the last row adds the next one.
- **Starter chips** add a rule in one tap, then disappear from the chips:
  - "No smoking indoors"
  - "Quiet after 22:00"
  - "No pets"
  - "Children welcome"
  - "ID needed at check-in"
- **Cancellation policy:** a `Textarea` with a 0/600 counter. Placeholder: "Free cancellation up to 3 days before arrival. After that, the first night is charged."

### 2. Questions guests ask (FAQ)

- Each entry is a card with Question and Answer fields, drag to reorder, and remove. Up to 8.
- **Suggestions,** as one-tap chips. Each adds the question with an empty answer and focuses the answer field:
  - "Is breakfast included?"
  - "Do you take children?"
  - "Is there parking?"
  - "Can I pay with EcoCash?"
  - "Is there Wi-Fi?"
  - "How do I get there?"
- An empty answer blocks Save with "Write the answer", shown on that card.

### 3. Social and listing links

- Six fields, each with the network's icon and a placeholder:
  - Facebook: `facebook.com/yourlodge`
  - Instagram: `@yourlodge`
  - TikTok
  - TripAdvisor
  - Booking.com
  - Airbnb
- Hint: "Guests trust lodges they can find elsewhere. Links open in a new tab."
- Errors appear inline per field.

### Checklist

The dashboard's setup checklist (`setupSteps` in `apps/web/src/lib/lodge.ts`) gains one step, **"Add guest info"**. It's done when a check-in time is set and at least one FAQ entry is answered.

It isn't required to share the site. The checklist card already allows steps in any order.

## Lodge site (Classic)

The placeholder templates aren't touched.

- **Good to know.** A new section in `classic.tsx` between Gallery and Location, with the anchor `#good-to-know` and a header link ("Info"). It shows:
  - a row of two facts with icons: "Check-in from 14:00" and "Check-out by 10:00", via `stayFacts(site)`;
  - house rules as a short list with check icons;
  - the cancellation policy in a quiet card.

  The whole section is left out when all of it is empty.
- **FAQ.** A section after Good to know, with the anchor `#questions`.
  - It's an accordion made of native `<details>`/`<summary>` elements: no JavaScript, accessible, and light.
  - The chevron rotates with CSS, and the rotation is off with reduce motion.
  - The page also gets `FAQPage` JSON-LD in `app/sites/[slug]/page.tsx`, so Google can show the questions.
- **Social links:**
  - Icon buttons, 44px, using `aria-label` = "Mist Valley on Instagram", in the contact band and the footer.
  - The icons are inline SVGs in `components/site/social-icons.tsx`. lucide has no brand icons.
- **Booking sheet** ([bookings.md](bookings.md)): it shows the times under the dates: "Check-in from 14:00 · Check-out by 10:00".
- **Page weight:** plain HTML only, with no new client components.

## Requests copy

In `apps/web/src/lib/requests.ts`, the TEXT topic's example ("add that we have a new swimming pool to our description") stays, because the description is still the lodge's own text. The OTHER example ("a section about our restaurant") stays as well: custom sections are [Later](README.md#later).

## Tests

- **Unit:**
  - `guestInfo`: times, limits, the URL host checks, and @handle → URL;
  - `stayFacts`;
  - the `.catch` defaults when the Json is garbage.
- **Playwright** (`apps/web/e2e/`):
  1. Set the times, add 2 rules (one from a chip), 2 FAQ entries (one from a suggestion) and an Instagram handle, then save.
  2. The Classic site shows Good to know, the FAQ opens, and the Instagram link points to `https://instagram.com/…`.
  3. Clear everything: the sections disappear.
  4. Run it again at 360px.
- **Lighthouse or the page-weight script:** no growth in first-load JS.

## Done when

- Owners can do all of the above themselves.
- progress.md is ticked.
- architecture.md lists the Guest info page and the Good to know and FAQ sections in the template contract.
