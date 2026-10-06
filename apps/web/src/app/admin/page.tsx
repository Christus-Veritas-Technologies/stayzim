import { redirect } from "next/navigation";

/** The team's only screen so far. */
export default function AdminHome() {
  redirect("/admin/requests");
}
