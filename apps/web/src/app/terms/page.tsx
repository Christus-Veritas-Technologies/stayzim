import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";
import { DEMO_DAYS, DEMO_KEEP_DAYS } from "@stayzim/sites";

import { GRACE_DAYS, PLANS } from "@/lib/lodge";

export const metadata: Metadata = {
  title: "Terms",
  description: "The agreement between StayZim and the lodges that use it, in plain words.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "What StayZim gives you",
    body: (
      <>
        <p>
          A website for your lodge on a stayzim.co.zw address, built by us from the photos and details you send, with a Book on WhatsApp
          button on every room. You also get a dashboard to keep your rooms, photos and details up to date.
        </p>
        <p>StayZim takes no commission on your bookings, on any plan.</p>
      </>
    ),
  },
  {
    title: "Plans, the demo and paying",
    body: (
      <>
        <ul>
          <li>
            {PLANS.STARTER.name} is ${PLANS.STARTER.price}, {PLANS.GROWTH.name} ${PLANS.GROWTH.price} and {PLANS.PRO.name} ${PLANS.PRO.price} a
            month, in US dollars. What each plan includes is on stayzim.co.zw.
          </li>
          <li>
            When you sign up, your site goes live as a free demo on the plan you choose, for {DEMO_DAYS} days, with small &quot;demo&quot;
            badges on it. Nothing is charged for the demo.
          </li>
          <li>
            To keep the site live after the demo, pay for a plan. If you don&apos;t, the site goes offline when the demo ends, and we
            delete the demo, its photos and your account {DEMO_KEEP_DAYS} days later.
          </li>
          <li>
            You pay in advance, for 1, 3 or 12 months, online through Paynow (EcoCash, InnBucks, OneMoney or card), or to our EcoCash or
            InnBucks merchant code. We email an invoice 3 days before your paid time ends, the day before and on the day, and a receipt
            when you pay.
          </li>
          <li>
            If a payment is late, your site stays up for {GRACE_DAYS} more days. After that it shows “temporarily unavailable” until you pay;
            your dashboard keeps working so you can, and the site comes back as soon as you do.
          </li>
          <li>
            Your own domain: on any plan you can connect a domain you have; {PLANS.GROWTH.name} and {PLANS.PRO.name} include a free .co.zw
            domain, which StayZim registers for your lodge while you stay on one of those plans.
          </li>
          <li>If we change our prices, we&apos;ll tell you at least 30 days before your next payment.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Your content",
    body: (
      <>
        <p>
          Your lodge&apos;s photos, words and logo stay yours. You let us show them on your site, and use them to set it up and support
          you.
        </p>
        <p>
          You confirm you&apos;re allowed to use the photos and words you give us, and that your prices and details are honest. We may take down
          anything that is unlawful or misleading.
        </p>
      </>
    ),
  },
  {
    title: "Bookings are between you and your guests",
    body: (
      <>
        <p>
          Guests book with you directly, on WhatsApp or, on Growth and Pro, with a booking request from your site that you confirm or decline.
          StayZim isn&apos;t part of the booking: we don&apos;t take payments, set your prices or rules, or handle cancellations and refunds.
          Those are between you and your guest.
        </p>
        <p>
          The bookings calendar is a tool to help you. Keep it up to date (confirm, decline or cancel requests, and close dates you can&apos;t
          take), and use guests&apos; details only for their booking.
        </p>
      </>
    ),
  },
  {
    title: "Using StayZim fairly",
    body: (
      <ul>
        <li>Keep your login to yourself and your staff, and tell us if you think someone else has used it.</li>
        <li>Don&apos;t use your site to mislead guests, or for anything unlawful.</li>
        <li>Don&apos;t try to break, overload or copy the service.</li>
      </ul>
    ),
  },
  {
    title: "Leaving",
    body: (
      <p>
        You can stop at any time: just stop paying, or tell us. Your site goes offline at the end of the month you paid for. If you ask, we
        send you your photos and delete your content. We may close an account that breaks these terms, after telling you why.
      </p>
    ),
  },
  {
    title: "What we can promise",
    body: (
      <p>
        We work hard to keep your site fast and online, but we can&apos;t promise it will never be down, or that it will bring a set number of
        bookings. As far as the law allows, StayZim isn&apos;t responsible for lost bookings or income, and our total responsibility to you is
        limited to what you paid us in the last three months.
      </p>
    ),
  },
  {
    title: "Changes and the law",
    body: (
      <p>
        If we change these terms, we&apos;ll update this page and tell you on WhatsApp or by email before the change applies. These terms
        follow the law of Zimbabwe.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms"
      updated="6 October 2026"
      intro="The agreement between StayZim and the lodges that use it. We've kept it short and in plain words; if anything is unclear, ask us."
      sections={SECTIONS}
    />
  );
}
