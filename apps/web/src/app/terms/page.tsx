import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";
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
    title: "Plans, the trial and paying",
    body: (
      <>
        <ul>
          <li>
            {PLANS.STARTER.name} is ${PLANS.STARTER.price}, {PLANS.GROWTH.name} ${PLANS.GROWTH.price} and {PLANS.PRO.name} ${PLANS.PRO.price} a
            month, in US dollars. What each plan includes is on stayzim.co.zw.
          </li>
          <li>Every lodge starts with a free 14-day trial of {PLANS.GROWTH.name}, with the site already built. Nothing is charged during the trial.</li>
          <li>You pay a month at a time, in advance, by Paynow, EcoCash or InnBucks, and send us the proof on WhatsApp. We mark you as paid by hand.</li>
          <li>
            If a payment is late, your site stays up for {GRACE_DAYS} more days. After that it shows “temporarily unavailable” until you pay;
            your dashboard keeps working so you can.
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
      <p>
        Guests book with you directly on WhatsApp. StayZim isn&apos;t part of the booking: we don&apos;t take payments, set your prices or
        rules, or handle cancellations and refunds. Those are between you and your guest.
      </p>
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
