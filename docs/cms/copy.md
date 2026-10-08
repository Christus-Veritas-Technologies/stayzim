# Generated copy

_Built 8 October 2026. Code: `packages/sites/src/copy/`. Tests: `packages/sites/src/copy.test.ts`._

Every text a lodge site shows, from the hero to the FAQ, is written for that lodge from the few facts the owner gives on `/create`. There's no AI and no network call: the engine picks lines from a large, hand-written set with a stable hash, so every lodge reads differently and the same lodge always reads the same. The owner's own words always win; generated copy is what shows until they write theirs.

## The facts

Asked on `/create` ("Your place" and "Your lodge" steps) and editable in **Lodge info**:

| Fact | Stored on `Lodge` | Used for |
| --- | --- | --- |
| Name | `name` | Everywhere |
| Town or city, country | `town`, `country` (default Zimbabwe) | "in Nyanga", the map, the meta description |
| Type of place | `kind`: lodge, guesthouse, B&B, holiday home, safari camp, hotel, self-catering | Nouns ("rooms" or "tents", "your hosts") |
| Setting | `setting`: mountains, lake, bush, river, city, farm | The view, mornings, evenings, things to do |
| Rooms and a typical price | `roomsHint`, `priceHint` | "4 rooms from $80" until real rooms exist; example rooms |
| Copy seed | `copySeed` | "Try other wording" on the Design screen bumps it |

The keys and labels live in `packages/sites/src/content/facts.ts` (`LODGE_KINDS`, `SETTINGS`, `PRICE_HINTS`, `FACT_LIMITS`). Real rooms replace the hints: `copyForLodge` counts the visible rooms and takes the cheapest price.

## How a line is picked

- **Slots** (`lines.ts`, `LINES`): hero headline and subline, welcome title, opening and body, rooms intro and empty line, gallery, location, contact, about, experiences, reviews and journal titles and intros, highlights, the Book label and the meta description.
- **Pools:** each slot has general lines (`any`) plus lines for each setting and each type. A lodge's own setting and type lines count three times, so a lake lodge mostly reads like a lake lodge.
- **Placeholders:** `{name}`, `{town}`, `{place}`, `{country}`, `{kind}`, `{kinds}`, `{Kind}`, `{host}`, `{rooms}`, `{room}`, `{roomCount}`, `{priceFrom}`, and the setting words `{view}`, `{mornings}`, `{evenings}`, `{landscape}`, `{air}`, `{doing}` (`words.ts`).
- **Missing facts:** a line that needs a fact the lodge hasn't given is never used (no town means no "in {town}" lines).
- **The pick:** FNV-1a hash of `slug:seed:slot` (`fill.ts`), so it's the same on the server, in the browser and in tests. Lists (highlights, about, experiences) use a stable shuffle.
- **Limits:** hero lines must fit `HERO_LIMITS`; a name too long for every headline falls back to the template's own hero text.
- **Extras:** `EXPERIENCES` (things to do, per setting), `FAQS`, `HOUSE_RULES` and `CANCELLATION` feed the example guest info on demo sites.

## Where it shows

- **API:** `GET /api/sites/:slug` sends `copy` with every site, and the dashboard's lodge JSON has it too (`lib/lodge.ts`).
- **Hero and welcome:** the owner's headline, subline and description win; otherwise `copy.hero` and `welcomeDescription(copy)`.
- **Templates and pages** read `site.copy.*` for intros and titles (`roomsIntro`, `roomsEmpty` in `lib/site-content.ts`, Find us, Gallery, Contact, Our story, Things to do, Reviews), and `copy.meta.description` for search results.
- **Design screen:** the generated hero is the placeholder; "Use our wording" clears the owner's text, and "Try other wording" picks other variants.

## Honesty rule

Lines only say what the owner told us. Things to do and FAQs read as invitations ("Ask us about…"), never as claims about the lodge (no "within the hour", no "award-winning"). Keep it that way when adding lines.

## Adding lines

1. Add the sentence to the slot's `any`, `setting` or `kind` list in `lines.ts`, using only the placeholders above.
2. Run `bun test` in `packages/sites`: it fails on an unknown placeholder, on a `{` left unfilled for any type, setting or missing town, on hero lines over the limits, and if a slot has too few variants.
3. Read a few lodges' output: `siteCopy({...})` in a scratch script prints every slot.
