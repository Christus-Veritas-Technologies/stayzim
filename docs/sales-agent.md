# The WhatsApp sales agent

_Built 15 October 2026. Code: `apps/admin/src/server/agent/`. The script it follows: [sales-script.md](sales-script.md)._

Our first $16 of Facebook ads brought 4 real lodge owners and 1 sale, closed on WhatsApp. Busy owners in Zimbabwe chat; they don't fill in forms or learn dashboards. So the funnel runs in WhatsApp:

**Click-to-WhatsApp ad → their first message to wa1 → the agent takes it from there**: their details and photos, their sites built, "1, 2 or 3?", an EcoCash prompt in the chat, and their site handed over once it's paid. Qualification runs on every message; anyone clearly not a fit gets blue ticks and no reply.

## How it works

1. **Messages come in** on the agent's number (`AGENT_ACCOUNTS`, wa1), by the "new message" event or the 2-minute read of its chats. Someone new becomes a lead (source "Messaged us (ad)"). Photos are downloaded and kept (`inbound_media`). Only messages from the last 15 minutes count: the 14-day read when a number connects is recorded, never answered.
2. **A turn runs 10 seconds after their last message** (people send bursts), one per chat at a time.
3. **Qualification (Jev, `typesafe/jev-1.14`)**, every turn. Jev answers typed questions about the conversation and their photos: a place to stay? what do they want? how established? do they need a person? `gate()` in `qualify.ts` decides:
   - **ignore**: clear junk (spam, job seekers, wrong numbers, photos of something else, "not a place to stay" twice). Blue ticks, no reply, stage "Not a fit".
   - **stop**: they asked us to stop. Do not contact.
   - **hand over**: upset, asks for a person, payment trouble, discounts. A short "Kin will message you" and an alert to Kin.
   - **continue**: everything else, including whenever Jev is unsure. A lost lodge costs more than one reply to a stranger. Someone we've made sites for is never ignored.
4. **The reply (Claude Haiku 5.5, fallback GPT-6 Luna)** with the sales script and tools:
   - `save_details`: their place's name, town, email, name, kind, rooms.
   - `make_sites`: the $15 and $30 sites, plus Pro for 8+ rooms or established places, with their photos. It sends the approved options message itself.
   - `choose_site`, `start_ecocash` (a payment link plus the EcoCash prompt) or `send_payment_link`, `check_payment`.
   - `hand_over`, `stay_silent` (not interested, "I'll get back to you", conversation over, junk).
   Prices, links and payments only ever come from fixed templates (`templates.ts`), never the model's own words.
5. **Paid** (Paynow, checked every 10 s for 5 minutes, then by the follow-up loop): their site, a claim link to make it theirs, and an alert to Kin.
6. **Follow-ups**: a nudge a day after the options, a last one with the deadline two days later, then nothing.
7. **Alerts to Kin** (+263 78 985 9332, from wa3): sites sent, a choice, paid, a payment failure, a hand-over, the agent failing to reply.

## Switching it on

1. In Coolify, set `OPENROUTER_API_KEY` (openrouter.ai/keys, with some credit) on the resource, and redeploy. `AGENT_ACCOUNTS=wa1` is the default.
2. Make sure wa1 is connected (the WhatsApp page) and **only used for the business**: everyone who messages it gets qualified.
3. **Shadow first.** On the WhatsApp page, set the agent to **Shadow**. It qualifies every message and logs what it would do, without replying. Check the decisions:
   - each lead's agent panel;
   - the replay on real chats: `POST https://admin.stayzim.co.zw/api/outreach/agent/replay` with `{"latest": 20}`;
   - a preview of what it would say to someone: `POST /api/outreach/agent/leads/<lead id>/preview`.
   Both take `Authorization: Bearer <ADMIN_API_TOKEN>` and change nothing.
4. **Live.** Set it to **Live**. Test from a second phone: write as a lodge (photos, details, choose, pay $15), and as junk (it should go silent with blue ticks).
5. **The ads.** In Meta Ads Manager: the Messages objective (or Engagement → Messaging apps), destination **WhatsApp**, the number **+263 77 510 1506**, with a ready-typed first message: "Hi StayZim, I'd like a website for my lodge."

## Controls

- **WhatsApp page → Sales agent**: off, shadow or live (saved; it overrides `AGENT_MODE`), its numbers and models, the cost today and in 30 days, leads by stage and what it did lately.
- **A lead's page → Sales agent**: its stage, Jev's latest answers, follow-ups, the full log with the cost of each call. Buttons:
  - **Take over**: the agent goes quiet for them, and you reply from your phone or the conversation box.
  - **Resume agent**: it carries on and answers anything waiting.
  - **Reply anyway**: for someone marked not a fit.
- **Leads**: an agent badge on each, and the filter Agent: talking, Needs you, Paying, Paid, Not a fit.

## Costs

Every call's cost is logged (`agent_event.cost_usd`):
- Jev costs about $0.04 per million input tokens, with output free: fractions of a cent per message.
- Haiku 5.5 costs $0.10 in and $0.50 out per million tokens: about 1¢ for a whole conversation, photos included.

## The WhatsApp risk

whatsapp-web.js isn't Meta's official API: a number that looks automated can be banned. To keep the risk down:
- wa1 only answers people who message it, and never sends campaigns (campaigns skip agent numbers).
- It types before replying, with a delay that grows with the message.
- It sends one message per turn, and at most two follow-ups.
- If wa1 is banned, the rest of StayZim carries on. Moving to Meta's WhatsApp Cloud API later means changing only the sending and receiving in `outreach/whatsapp.ts`.

## Checking it locally

- `bun test src/server/agent`: the gate's decisions on cases from our real chats, and the templates (under 600 characters, the right prices).
- `bun scripts/agent-tools-check.ts <photos…>`: drives the tools end to end against the local API, through the Paynow stand-in, with no WhatsApp and no models.
