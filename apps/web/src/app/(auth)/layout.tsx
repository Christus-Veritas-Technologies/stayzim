import type { Metadata } from "next";
import Link from "next/link";

import { Wordmark } from "@/components/landing/brand";

export const metadata: Metadata = {
  title: "Owner login",
  // Account screens have nothing for search engines
  robots: { index: false, follow: false },
};

/** Login, password reset and first-login screens: one centred card, phone first. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-surface">
      <header className="px-4 pt-6 pb-2 sm:pt-10">
        <Link href="/" className="mx-auto flex w-max text-[22px] text-brand no-underline" aria-label="StayZim home">
          <Wordmark size={34} />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:items-center sm:pt-0">
        <div className="w-full max-w-[420px] rounded-xl border border-line bg-white p-6 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
