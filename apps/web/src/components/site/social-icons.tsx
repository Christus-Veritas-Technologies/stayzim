import type { SocialKey } from "@stayzim/sites";
import type { SVGProps } from "react";

/** Small brand marks for social and listing links, drawn inline (no icon library ships them). */
export function SocialIcon({ network, ...props }: { network: SocialKey } & SVGProps<SVGSVGElement>) {
  const common = { viewBox: "0 0 24 24", width: 18, height: 18, "aria-hidden": true, ...props } as const;
  switch (network) {
    case "facebook":
      return (
        <svg {...common} fill="currentColor">
          <path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H7.9v3h2.6V21z" />
        </svg>
      );
    case "instagram":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case "tiktok":
      return (
        <svg {...common} fill="currentColor">
          <path d="M15.6 3c.3 2.2 1.6 3.7 3.9 3.9v3.1a7.3 7.3 0 0 1-3.8-1.2v6a5.5 5.5 0 1 1-5.5-5.5c.3 0 .6 0 .9.1v3.2a2.4 2.4 0 1 0 1.5 2.2V3z" />
        </svg>
      );
    case "tripadvisor":
      return (
        <svg {...common} fill="none" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="7" cy="13" r="3.5" />
          <circle cx="17" cy="13" r="3.5" />
          <circle cx="7" cy="13" r="1" fill="currentColor" stroke="none" />
          <circle cx="17" cy="13" r="1" fill="currentColor" stroke="none" />
          <path d="M3 9.5c2.5-2 5.6-3 9-3s6.5 1 9 3M12 16.5l-1.3-1.8M12 16.5l1.3-1.8" />
        </svg>
      );
    case "bookingCom":
      return (
        <svg {...common} fill="currentColor">
          <path d="M6 4h5.6c2.6 0 4.1 1.3 4.1 3.4 0 1.3-.7 2.3-1.8 2.8 1.6.4 2.6 1.6 2.6 3.2 0 2.4-1.8 3.9-4.6 3.9H6zm3 2.5v3h2.2c1 0 1.6-.6 1.6-1.5S12.2 6.5 11.2 6.5zm0 5.4v3.3h2.6c1.1 0 1.8-.6 1.8-1.7 0-1-.7-1.6-1.8-1.6z" />
          <circle cx="19" cy="16" r="1.6" />
        </svg>
      );
    case "airbnb":
      return (
        <svg {...common} fill="currentColor" fillRule="evenodd">
          <path d="M12 3c1 0 1.8.7 2.4 1.9l5 10.4c1 2.2-.6 4.7-3 4.7-1.3 0-2.6-.8-4.4-2.8C10.2 19.2 8.9 20 7.6 20c-2.4 0-4-2.5-3-4.7l5-10.4C10.2 3.7 11 3 12 3zm0 2c-.3 0-.6.3-.9.9l-5 10.3c-.4 1 .3 2 1.5 2 .7 0 1.6-.6 3.1-2.2-1.4-1.8-2.1-3.2-2.1-4.3 0-1.7 1.5-3.1 3.4-3.1s3.4 1.4 3.4 3.1c0 1.1-.7 2.5-2.1 4.3 1.5 1.6 2.4 2.2 3.1 2.2 1.2 0 1.9-1 1.5-2l-5-10.3c-.3-.6-.6-.9-.9-.9zm0 5.6c-.8 0-1.4.5-1.4 1.1 0 .6.5 1.6 1.4 2.8.9-1.2 1.4-2.2 1.4-2.8 0-.6-.6-1.1-1.4-1.1z" />
        </svg>
      );
  }
}
