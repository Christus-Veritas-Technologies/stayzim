/** Copy and sample data for the landing page, straight from the design. */

export const NAV_LINKS = [
  { id: "how-it-works", label: "How it works" },
  { id: "examples", label: "Examples" },
  { id: "pricing", label: "Pricing", badge: "2 days free" },
  { id: "questions", label: "Questions" },
] as const;

/** Hero location pills. Desktop positions are offsets from the page centre, so they hold at any width ≥ xl. */
export const LOCATIONS = [
  { name: "Vumba", color: "#1E4A3B", side: "left", offset: 492, top: 232, featured: true },
  { name: "Nyanga", color: "#8A4B2A", side: "left", offset: 596, top: 380, featured: true },
  { name: "Chimanimani", color: "#6B4F36", side: "left", offset: 570, top: 600, featured: true },
  { name: "Mutare", color: "#4A4A45", side: "left", offset: 676, top: 200, featured: false },
  { name: "Kariba", color: "#1D5C7A", side: "right", offset: 488, top: 226, featured: true },
  { name: "Victoria Falls", color: "#755EAF", side: "right", offset: 610, top: 372, featured: true },
  { name: "Bulawayo", color: "#1E4A3B", side: "right", offset: 580, top: 590, featured: true },
  { name: "Borrowdale", color: "#8A4B2A", side: "right", offset: 680, top: 216, featured: false },
] as const;

export type Lodge = {
  initials: string;
  name: string;
  area: string;
  summary: string;
  colourName: string;
  colour: string;
  domain: string;
  /** Hero photo stand-in */
  photo: string;
  /** Room photo stand-in */
  roomPhoto: string;
  price: string;
};

export const LODGES: Lodge[] = [
  {
    initials: "MV",
    name: "Mist Valley Lodge",
    area: "Nyanga",
    summary: "3 rooms · from $85 / night",
    colourName: "Highland",
    colour: "#1E4A3B",
    domain: "mistvalley.stayzim.co.zw",
    photo: "linear-gradient(160deg,#B7CFC2 0%,#8FAE9C 50%,#4A6656 100%)",
    roomPhoto: "linear-gradient(160deg,#DCEBE4 0%,#B7CFC2 55%,#8FAE9C 100%)",
    price: "$85 / night",
  },
  {
    initials: "MR",
    name: "Msasa Ridge",
    area: "Vumba",
    summary: "4 rooms · from $95 / night",
    colourName: "Msasa bronze",
    colour: "#8A4B2A",
    domain: "msasaridge.stayzim.co.zw",
    photo: "linear-gradient(160deg,#E9BFA3 0%,#C98E6B 55%,#9A6A4E 100%)",
    roomPhoto: "linear-gradient(160deg,#F1E6DA 0%,#DCC6AF 60%,#BFA287 100%)",
    price: "$95 / night",
  },
  {
    initials: "LC",
    name: "Lakeview Cabins",
    area: "Kariba",
    summary: "6 cabins · from $110 / night",
    colourName: "Kariba blue",
    colour: "#1D5C7A",
    domain: "lakeview.stayzim.co.zw",
    photo: "linear-gradient(160deg,#A9D3E3 0%,#6FAFC7 50%,#3D6378 100%)",
    roomPhoto: "linear-gradient(160deg,#E6ECEF 0%,#C9D3D8 60%,#9EADB5 100%)",
    price: "$110 / night",
  },
];

export type Plan = {
  id: "starter" | "growth" | "pro";
  name: string;
  tagline: string;
  description: string;
  price: string;
  cta: string;
  features: string[];
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Get found",
    description: "For new guesthouses and Airbnbs that need to be online.",
    price: "$20",
    cta: "Try Starter free",
    features: [
      "Lodge site on yourlodge.stayzim.co.zw",
      "Rooms, gallery and map on one page",
      "Book on WhatsApp button",
      "Google Business setup",
      "Connect a domain you already have",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    tagline: "Get booked",
    description: "For most lodges. Know who visits and book them direct.",
    price: "$40",
    cta: "Try Growth free for 2 days",
    features: [
      "Everything in Starter",
      "Booking calendar: guests pick dates on your site, you confirm",
      "Visitor analytics",
      "A free .co.zw domain, like yourlodge.co.zw",
    ],
    featured: true,
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Get full",
    description: "For busy lodges with 5+ rooms, or owners living abroad.",
    price: "$75",
    cta: "Try Pro free",
    features: [
      "Everything in Growth",
      "We look after your Booking.com and Airbnb photos and text",
      "2 SEO blog posts a month",
      "Priority WhatsApp support",
    ],
  },
];

export const QUESTIONS = [
  {
    q: "How do guests book?",
    a: "On Starter, every room has a Book on WhatsApp button. On Growth and Pro, guests pick their dates on your site and send a booking you confirm in one tap (or automatically), with WhatsApp one tap away too.",
  },
  {
    q: "Do I have to leave Booking.com?",
    a: "No. Keep your listing. StayZim turns guests who already found you, like repeat guests and people who follow you on Facebook, into direct bookings.",
  },
  {
    q: "How do I pay?",
    a: "Monthly, by Paynow, EcoCash or InnBucks. Send your proof of payment on WhatsApp and we mark you as paid.",
  },
  {
    q: "What if I want to cancel?",
    a: "Message us. Your site stays live until the end of the month you paid for.",
  },
];

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Demo lodges", href: "#examples" },
      { label: "Pricing", href: "#pricing" },
      { label: "Questions", href: "#questions" },
    ],
  },
  {
    title: "For owners",
    links: [
      { label: "Log in", href: "/login" },
      { label: "Try it free", href: "/create" },
      { label: "Message us", whatsapp: "general" },
    ],
  },
  {
    title: "Where we work",
    links: [{ label: "Nyanga and Vumba" }, { label: "Kariba" }, { label: "Victoria Falls" }, { label: "Harare" }],
  },
  {
    title: "Pay with",
    links: [{ label: "Paynow" }, { label: "EcoCash" }, { label: "InnBucks" }],
  },
] as const;
