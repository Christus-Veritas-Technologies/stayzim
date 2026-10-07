"use client";

import { cn } from "@stayzim/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * A row of cards that scrolls sideways (swipe on phones), with Back and Next
 * buttons that move one card at a time. `controls` puts the buttons where the
 * template wants them; `counter` reports "1 of 4" for designs that show it.
 */
export function Carousel({
  children,
  className,
  itemClassName,
  label,
  controls = "top",
  buttonClassName,
  activeButtonClassName,
  counterNoun,
  progress = false,
  header,
}: {
  children: ReactNode;
  className?: string;
  /** Width of each card, e.g. "w-[85%] sm:w-[46%] lg:w-[32%]" */
  itemClassName?: string;
  label: string;
  /** "top": beside the header; "bottom": under the row; "none": swipe only */
  controls?: "top" | "bottom" | "none";
  buttonClassName?: string;
  /** The Next button, drawn heavier like the designs */
  activeButtonClassName?: string;
  /** Shows "1 of 4 rooms" under the row */
  counterNoun?: string;
  /** A line under the row that fills as the guest moves along */
  progress?: boolean;
  /** Title and intro, shown with the buttons beside them */
  header?: ReactNode;
}) {
  const row = useRef<HTMLUListElement>(null);
  const items = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: items.length <= 1 });

  const measure = useCallback(() => {
    const element = row.current;
    if (!element) return;
    const first = element.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + parseFloat(getComputedStyle(element).columnGap || "0") : element.clientWidth;
    const end = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
    setIndex(end ? items.length - 1 : Math.min(items.length - 1, Math.round(element.scrollLeft / Math.max(1, step))));
    setEdges({ start: element.scrollLeft <= 4, end });
  }, [items.length]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  function move(by: number) {
    const element = row.current;
    const first = element?.firstElementChild as HTMLElement | null;
    if (!element || !first) return;
    const step = first.offsetWidth + parseFloat(getComputedStyle(element).columnGap || "0");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({ left: by * step, behavior: reduce ? "auto" : "smooth" });
  }

  // Everything fits: no buttons, counter or progress line
  const fits = edges.start && edges.end;
  const buttons =
    controls === "none" || items.length <= 1 || fits ? null : (
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={edges.start}
          aria-label="Back"
          className={cn("flex size-12 items-center justify-center rounded-full border border-black/10 bg-white text-[#0C181F] transition-opacity disabled:opacity-40", buttonClassName)}
        >
          <ArrowLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => move(1)}
          disabled={edges.end}
          aria-label="Next"
          className={cn("flex size-12 items-center justify-center rounded-full bg-[#0F1F28] text-white transition-opacity disabled:opacity-40", activeButtonClassName)}
        >
          <ArrowRight className="size-5" />
        </button>
      </div>
    );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {header || (controls === "top" && buttons) ? (
        <div className="flex flex-wrap items-end justify-between gap-4">
          {header}
          {controls === "top" ? buttons : null}
        </div>
      ) : null}
      <ul
        ref={row}
        onScroll={measure}
        aria-label={label}
        className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:gap-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, position) => (
          <li key={position} className={cn("shrink-0 snap-start", itemClassName)}>
            {item}
          </li>
        ))}
      </ul>
      {!fits && (controls === "bottom" || counterNoun || progress) ? (
        <div className="flex items-center gap-5">
          {progress ? (
            <span className="relative h-px flex-1 bg-current opacity-25" aria-hidden="true">
              <span
                className="absolute inset-y-0 left-0 -my-px h-[2px] bg-current opacity-100 transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${((index + 1) / Math.max(1, items.length)) * 100}%` }}
              />
            </span>
          ) : (
            <span className="flex-1" />
          )}
          {counterNoun ? (
            <span className="shrink-0 text-sm font-medium" aria-live="polite">
              {index + 1} of {items.length} {counterNoun}
            </span>
          ) : null}
          {controls === "bottom" ? buttons : null}
        </div>
      ) : null}
    </div>
  );
}
