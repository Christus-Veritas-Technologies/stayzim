"use client";

import { Button } from "@stayzim/ui/components/button";
import { Input } from "@stayzim/ui/components/input";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRef } from "react";

/**
 * A short list of one-line entries (house rules): add, edit, move and remove,
 * with suggestions that add themselves in one tap. Enter in the last row adds the next.
 */
export function ListEditor({
  items,
  onChange,
  max,
  maxLength,
  addLabel,
  placeholder,
  suggestions = [],
  itemLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  max: number;
  maxLength: number;
  addLabel: string;
  placeholder: string;
  suggestions?: string[];
  /** For screen readers: "House rule 2" */
  itemLabel: string;
}) {
  const list = useRef<HTMLUListElement>(null);
  const reduceMotion = useReducedMotion();
  const unused = suggestions.filter((suggestion) => !items.some((item) => item.trim().toLowerCase() === suggestion.toLowerCase()));
  const full = items.length >= max;

  function focusRow(index: number) {
    requestAnimationFrame(() => list.current?.querySelectorAll("input")[index]?.focus());
  }

  function add(text = "") {
    if (full) return;
    onChange([...items, text]);
    if (!text) focusRow(items.length);
  }

  function move(index: number, by: number) {
    const next = [...items];
    next.splice(index + by, 0, next.splice(index, 1)[0]!);
    onChange(next);
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length > 0 ? (
        <ul ref={list} className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {items.map((item, index) => (
              <motion.li
                // Rows have no ids; the position is the identity while editing
                key={index}
                initial={reduceMotion ? false : { opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                transition={{ duration: 0.16 }}
                className="flex items-center gap-1.5"
              >
                <Input
                  value={item}
                  onChange={(event) => onChange(items.map((entry, position) => (position === index ? event.target.value : entry)))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      if (index === items.length - 1 && item.trim()) add();
                      else focusRow(index + 1);
                    }
                  }}
                  maxLength={maxLength}
                  placeholder={placeholder}
                  aria-label={`${itemLabel} ${index + 1}`}
                />
                <span className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down">
                    <ArrowDown />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onChange(items.filter((_, position) => position !== index))}
                    aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                    className="hover:text-danger"
                  >
                    <X />
                  </Button>
                </span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => add()} disabled={full}>
          <Plus />
          {addLabel}
        </Button>
        <span className="text-xs text-muted-2 tabular-nums">
          {items.length} of {max}
        </span>
      </div>

      {unused.length > 0 && !full ? (
        <div className="flex flex-wrap gap-1.5">
          {unused.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => add(suggestion)}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-dashed border-line-2 bg-white px-3 text-[12.5px] font-medium text-muted transition-colors hover:border-brand/40 hover:text-brand"
            >
              <Plus className="size-3" />
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
