"use client";

import { useEffect, useRef, useState } from "react";

/** Text cut to 3 lines, with "More" when there's more to read. */
export function ClampedText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const check = () => setClamped(element.scrollHeight > element.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <p ref={ref} className={open ? "whitespace-pre-line" : "line-clamp-3 whitespace-pre-line"}>
        {text}
      </p>
      {clamped || open ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="-my-2 py-2 text-[13px] font-semibold text-[var(--theme)] hover:underline"
        >
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
