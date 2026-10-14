import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pay for your website",
  robots: { index: false, follow: false },
};

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
