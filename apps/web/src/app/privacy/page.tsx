import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";
import { CONTACT_EMAIL } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What StayZim collects about lodge owners and the guests who visit their sites, and what we do with it.",
};

const SECTIONS: LegalSection[] = [
  {
    title: "Who we are",
    body: (
      <p>
        StayZim builds websites for lodges, guesthouses and Airbnbs in Zimbabwe, where guests book directly on WhatsApp. We run
        stayzim.co.zw, the owner dashboard and every lodge site on a stayzim.co.zw address.
      </p>
    ),
  },
  {
    title: "Lodge owners",
    body: (
      <>
        <p>When you sign up (or we set up your lodge for you), we keep:</p>
        <ul>
          <li>your name, email address and a scrambled (hashed) copy of your password, so you can log in;</li>
          <li>if you sign up or sign in with Google, the name and email address on your Google account;</li>
          <li>what you put on your site: the lodge name, description, location, phone and WhatsApp numbers, rooms, prices and photos;</li>
          <li>change requests you send us, and our replies;</li>
          <li>your plan, your invoices and receipts, and the payments you make: the amount, how you paid, and the mobile money number a payment prompt went to. We never see your card details or PIN: Paynow handles them.</li>
        </ul>
        <p>
          Everything on your lodge site is public, because that is its job. Your login details and change requests are not.
        </p>
      </>
    ),
  },
  {
    title: "Guests who visit a lodge site",
    body: (
      <>
        <p>
          To show owners how their site is doing, lodge sites count visits and taps on Book on WhatsApp (owners on the Growth and Pro plans
          can see them). For each one we record:
        </p>
        <ul>
          <li>the date and time, and which part of the site was opened;</li>
          <li>the kind of device and browser, for example “Phone, Android, Chrome”;</li>
          <li>the IP address, and the country it points to when our network provider tells us;</li>
          <li>the website that sent the guest there, if any;</li>
          <li>a random number saved in the guest&apos;s browser, so repeat visits by the same guest can be grouped. It holds no name or contact details.</li>
        </ul>
        <p>
          The lodge&apos;s owner sees these visits in their dashboard. The owner&apos;s and StayZim&apos;s own visits aren&apos;t counted.
          Chats on WhatsApp are between the guest and the lodge: StayZim doesn&apos;t see them.
        </p>
      </>
    ),
  },
  {
    title: "Guests who send a booking request",
    body: (
      <>
        <p>
          On some lodge sites, guests can pick dates and send a booking request. With it we keep what the guest gives us: their name, WhatsApp
          number, the room, dates and number of guests, and, if they add them, an email address and a note.
        </p>
        <ul>
          <li>Only that lodge&apos;s owner sees them, to confirm or decline the booking. The dates a room is full show on the site, never who booked.</li>
          <li>If the guest gave an email address, they get an email when the lodge confirms, declines or cancels.</li>
          <li>Owners can also note bookings they took on WhatsApp or by phone in the same calendar.</li>
          <li>12 months after the stay we delete the guest&apos;s name, number, email and note. The booking stays, without them, so the owner&apos;s counts add up.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Visitors to stayzim.co.zw",
    body: (
      <p>
        On our own site we count page views and which buttons are tapped, with the page, the website or advert that sent you, your browser,
        and the same kind of random number in your browser. We use it to see which adverts and parts of the page work. We don&apos;t keep IP
        addresses for these visits. When you make a site, we keep the advert or website that sent you with it, and which steps you finished, so we
        know which adverts bring lodges.
        We also use the Meta (Facebook) Pixel on stayzim.co.zw, sign-up and the owner dashboard, so we can tell which Facebook and Instagram
        adverts work: it tells Meta when you view a page, sign up, make your demo or pay (the plan and amount, never card or mobile money
        details). Lodge sites never use it.
      </p>
    ),
  },
  {
    title: "Who else handles the information",
    body: (
      <>
        <p>
          We don&apos;t sell personal information. Apart from the Meta Pixel described above, we don&apos;t share it for
          advertising. A few services help us run StayZim:
        </p>
        <ul>
          <li>Cloudflare stores lodge photos and logos, and may sit in front of our sites to keep them fast and safe;</li>
          <li>our hosting provider runs our servers and database;</li>
          <li>our email provider (Spacemail) sends password reset emails, invoices and receipts;</li>
          <li>Paynow takes payments, and receives the amount, a reference, your email address and, for a phone prompt, your mobile money number;</li>
          <li>Google, only if you choose to sign in with Google;</li>
          <li>Meta, through the Pixel on our own pages, under Meta&apos;s own privacy policy;</li>
          <li>WhatsApp, which carries the chats you start from our buttons, under WhatsApp&apos;s own privacy policy.</li>
        </ul>
      </>
    ),
  },
  {
    title: "Cookies and browser storage",
    body: (
      <p>
        The dashboard uses cookies to keep you logged in on your device, for up to 30 days. Lodge sites and stayzim.co.zw save the random
        visitor number described above in your browser&apos;s storage.
        The Meta Pixel sets Meta&apos;s own cookies on stayzim.co.zw, sign-up and the dashboard; lodge sites have no advertising cookies.
      </p>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        We keep owner accounts and lodge content while the lodge uses StayZim. A demo that was never paid for is deleted, with its photos,
        content, visit records and the account, 30 days after it ended. When a paying lodge leaves, we take its site down and, if the
        owner asks, delete its photos, content and visit records. We keep invoices and receipts as long as the law asks us to.
      </p>
    ),
  },
  {
    title: "Your choices",
    body: (
      <p>
        You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Email{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or message us on WhatsApp, and we&apos;ll reply within a few days. Guests can
        clear the visitor number at any time by clearing their browser&apos;s site data.
      </p>
    ),
  },
  {
    title: "Changes to this page",
    body: <p>If we change how we handle information, we&apos;ll update this page and its date, and tell lodge owners on WhatsApp or by email.</p>,
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy"
      updated="6 October 2026"
      intro="What we collect about lodge owners and the guests who visit their sites, why, and what you can ask us to do with it. In plain words."
      sections={SECTIONS}
    />
  );
}
