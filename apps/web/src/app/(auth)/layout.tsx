import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner login",
  // Account screens have nothing for search engines
  robots: { index: false, follow: false },
};

/** Each screen renders its own <AuthShell>, so first login can swap the panel for the owner's live site. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
