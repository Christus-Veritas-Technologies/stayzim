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
        <p>When we set up your lodge, we keep:</p>
        <ul>
          <li>your name, email address and a scrambled (hashed) copy of your password, so you can log in;</li>
          <li>if you sign in with Google, the email address on your Google account, matched to the one we already have;</li>
          <li>what you put on your site: the lodge name, description, location, phone and WhatsApp numbers, rooms, prices and photos;</li>
          <li>change requests you send us, and our replies;</li>
          <li>your plan, and when you paid. We never see or keep card details: you pay by Paynow, EcoCash or InnBucks.</li>
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
          Bookings themselves happen in WhatsApp, between the guest and the lodge: StayZim doesn&apos;t see those chats.
        </p>
      </>
    ),
  },
  {
    title: "Visitors to stayzim.co.zw",
    body: (
      <p>
        On our own site we count page views and which buttons are tapped, with the page, the website or advert that sent you, your browser,
        and the same kind of random number in your browser. We use it to see which adverts and parts of the page work. We don&apos;t keep IP
        addresses for these visits.
      </p>
    ),
  },
  {
    title: "Who else handles the information",
    body: (
      <>
        <p>We don&apos;t sell personal information or share it for advertising. A few services help us run StayZim:</p>
        <ul>
          <li>Cloudflare stores lodge photos and logos, and may sit in front of our sites to keep them fast and safe;</li>
          <li>our hosting provider runs our servers and database;</li>
          <li>our email provider (Spacemail) sends password reset emails;</li>
          <li>Google, only if you choose to sign in with Google;</li>
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
        visitor number described above in your browser&apos;s storage. We don&apos;t use advertising cookies.
      </p>
    ),
  },
  {
    title: "How long we keep it",
    body: (
      <p>
        We keep owner accounts and lodge content while the lodge uses StayZim. When a lodge leaves, we take its site down and, if the owner
        asks, delete its photos, content and visit records.
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
