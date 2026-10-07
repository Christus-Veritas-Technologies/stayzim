"use client";

import { Switch } from "@stayzim/ui/components/switch";
import { Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { siteHost } from "@/lib/lodge";

/** How bookings from the site arrive: waiting for the owner (the default), or confirmed when the nights are free. */
export function BookingSettings() {
  const { lodge, save } = useLodge();
  const [saving, setSaving] = useState(false);

  async function toggle(autoConfirmBookings: boolean) {
    setSaving(true);
    const error = await save("", "PATCH", { autoConfirmBookings });
    setSaving(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(autoConfirmBookings ? "Bookings confirm themselves" : "You confirm each booking", {
      description: autoConfirmBookings
        ? `Guests on ${siteHost(lodge)} are booked straight away when the nights are free.`
        : "New bookings from your site wait for you in Requests.",
    });
  }

  return (
    <label className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-brand-tint text-brand">
        <Zap className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-semibold">Confirm bookings automatically</span>
        <span className="text-[12.5px] text-muted">
          {lodge.autoConfirmBookings
            ? "On: free nights are booked straight away. You can still cancel."
            : "Off: bookings from your site wait for you to confirm them."}
        </span>
      </span>
      <Switch checked={lodge.autoConfirmBookings} onCheckedChange={toggle} disabled={saving} aria-label="Confirm bookings automatically" />
    </label>
  );
}
