"use client";

import { Loader2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/landing/brand";
import { authClient } from "@/lib/auth-client";

/**
 * Placeholder owner dashboard: proves the session end to end. Lodge info,
 * rooms, gallery, analytics and billing come next (see docs/progress.md).
 */
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) router.replace("/login");
    else if (session.user.mustChangePassword) router.replace("/set-password");
  }, [isPending, router, session]);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut();
    router.replace("/login");
  }

  if (isPending || !session || session.user.mustChangePassword) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-surface text-muted-2" role="status">
        <Loader2 size={24} className="animate-spin" aria-hidden="true" />
        <span className="sr-only">Loading your dashboard</span>
      </div>
    );
  }

  const firstName = session.user.name.split(" ")[0] || session.user.name;

  return (
    <div className="min-h-svh bg-surface">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[720px] items-center justify-between px-4">
          <Link href="/" className="text-xl text-brand no-underline" aria-label="StayZim home">
            <Wordmark size={30} />
          </Link>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="inline-flex h-12 items-center gap-2 rounded-md px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-ink focus-visible:outline-2 focus-visible:outline-purple disabled:opacity-70"
          >
            {signingOut ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} strokeWidth={1.5} />}
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-4 py-8">
        <h1 className="font-display text-2xl leading-[30px] font-semibold tracking-[-0.02em]">Hi {firstName}</h1>
        <p className="mt-1.5 text-muted">Signed in as {session.user.email}</p>

        <section className="mt-6 rounded-xl border border-line bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Your dashboard is on its way</h2>
          <p className="mt-2 text-muted">
            Soon you&apos;ll edit your lodge info, rooms and photos here, and see who visits your site. Until then, send
            changes to us on WhatsApp and we&apos;ll make them for you.
          </p>
          <Link
            href="/set-password"
            className="mt-5 inline-flex h-12 items-center rounded-md border border-line-2 px-4 font-semibold text-ink hover:border-muted-2"
          >
            Change password
          </Link>
        </section>
      </main>
    </div>
  );
}
