"use client";

import { Button } from "@stayzim/ui/components/button";
import { Field, FormMessage } from "@stayzim/ui/components/field";
import { Input, InputGroup, InputGroupAddon, InputGroupInput } from "@stayzim/ui/components/input";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useState, type FormEvent } from "react";

import { useLodge } from "@/components/dashboard/lodge-provider";
import { StepHeading } from "@/components/start/frame";
import type { Lodge } from "@/lib/lodge";

type Row = { key: number; name: string; price: string; sleeps: string };

const MAX_ROWS = 5;

let nextKey = 0;
const emptyRow = (): Row => ({ key: nextKey++, name: "", price: "", sleeps: "2" });

/** Step 3: rooms as quick rows (name, price a night, guests). Amenities and photos can come later. */
export function RoomsStep({ onNext }: { onNext: () => void }) {
  const { lodge, saveWith } = useLodge();
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const already = lodge.rooms.length;

  const update = (key: number, patch: Partial<Row>) => setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const filled = rows.filter((row) => row.name.trim() || row.price.trim());
    const problems: Record<number, string> = {};
    for (const row of filled) {
      const price = Number(row.price);
      const sleeps = Number(row.sleeps);
      if (!row.name.trim()) problems[row.key] = "Add the room's name.";
      else if (!Number.isInteger(price) || price < 1) problems[row.key] = "Add the price a night, in whole dollars.";
      else if (!Number.isInteger(sleeps) || sleeps < 1 || sleeps > 30) problems[row.key] = "How many guests it sleeps (1 to 30).";
    }
    setErrors(problems);
    if (Object.keys(problems).length > 0) return;
    if (filled.length === 0) {
      onNext();
      return;
    }

    setSaving(true);
    setError(null);
    for (const row of filled) {
      const result = await saveWith<{ roomId: string; lodge: Lodge }>("/rooms", "POST", {
        name: row.name.trim(),
        price: Number(row.price),
        sleeps: Number(row.sleeps),
      });
      if (result.error !== undefined) {
        setError(result.error);
        setSaving(false);
        return;
      }
      // Saved: take it off the list, so a retry after an error doesn't add it twice
      setRows((current) => (current.length > 1 ? current.filter((item) => item.key !== row.key) : [emptyRow()]));
    }
    onNext();
  }

  return (
    <>
      <StepHeading title="Add your rooms">
        {already > 0 ? `You have ${already} ${already === 1 ? "room" : "rooms"}. Add more, or carry on.` : "Each room gets its own Book on WhatsApp button. Photos and amenities can come later."}
      </StepHeading>
      <form onSubmit={onSubmit} noValidate>
        <fieldset disabled={saving} className="flex flex-col gap-3">
          <FormMessage>{error}</FormMessage>
          <AnimatePresence initial={false}>
            {rows.map((row, index) => (
              <motion.div
                key={row.key}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 rounded-2xl border border-line p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-muted">Room {already + index + 1}</span>
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}
                        className="-m-2 flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
                        aria-label={`Remove room ${already + index + 1}`}
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                  <Field label="Name" error={errors[row.key]}>
                    <Input value={row.name} onChange={(event) => update(row.key, { name: event.target.value })} placeholder="Garden Cottage" maxLength={60} />
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Price a night">
                      <InputGroup>
                        <InputGroupAddon>$</InputGroupAddon>
                        <InputGroupInput value={row.price} onChange={(event) => update(row.key, { price: event.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="60" />
                      </InputGroup>
                    </Field>
                    <Field label="Sleeps">
                      <Input value={row.sleeps} onChange={(event) => update(row.key, { sleeps: event.target.value.replace(/\D/g, "") })} inputMode="numeric" placeholder="2" />
                    </Field>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {rows.length < MAX_ROWS ? (
            <Button type="button" variant="outline" onClick={() => setRows((current) => [...current, emptyRow()])}>
              <Plus />
              Add another room
            </Button>
          ) : null}
          <Button type="submit" size="lg" className="mt-3 w-full" loading={saving}>
            {saving ? "Saving rooms" : rows.some((row) => row.name.trim() || row.price.trim()) ? "Save and continue" : "Skip for now"}
          </Button>
        </fieldset>
      </form>
    </>
  );
}
