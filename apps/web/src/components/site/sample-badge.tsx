import { cn } from "@stayzim/ui/lib/utils";

/**
 * The small "Example" mark on a demo site's example content (rooms, photos,
 * reviews, questions, posts): StayZim's ink and blue, the same as the demo
 * pill, so it reads as ours and not the lodge's. Example content only exists
 * while the site is a demo and the owner hasn't added their own.
 */
export function SampleBadge({ label = "Example", className }: { label?: string; className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#0C181F]/85 px-2.5 text-[11px] leading-none font-bold tracking-[0.08em] whitespace-nowrap text-white uppercase shadow-sm backdrop-blur",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-[#78CBE7]" aria-hidden="true" />
      {label}
    </span>
  );
}
