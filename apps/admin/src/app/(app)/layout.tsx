import { AdminShell } from "@/components/shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
