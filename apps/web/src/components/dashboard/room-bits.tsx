import { Badge } from "@stayzim/ui/components/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@stayzim/ui/components/tooltip";
import { cn } from "@stayzim/ui/lib/utils";
import { ImagePlus } from "lucide-react";

import { AMENITIES, AMENITIES_ON_CARD, roomNeedsPhoto, type Room } from "@/lib/lodge";

/** The room's cover photo, or a dashed tile asking for one. */
export function RoomThumb({ room, className }: { room: Room; className?: string }) {
  const cover = room.photos[0];
  if (!cover) {
    return (
      <span
        className={cn(
          "flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-line-2 bg-surface text-soft",
          className,
        )}
        aria-hidden="true"
      >
        <ImagePlus className="size-4" />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- photos come from our upload server
    <img src={cover.url} alt="" loading="lazy" className={cn("h-10 w-14 shrink-0 rounded-lg bg-surface object-cover", className)} />
  );
}

/** ON SITE, or NEEDS PHOTO while it has none. */
export function RoomStatus({ room }: { room: Room }) {
  return roomNeedsPhoto(room) ? (
    <Badge status variant="warning">
      Needs photo
    </Badge>
  ) : (
    <Badge status variant="success">
      On site
    </Badge>
  );
}

/** The amenity icons a guest sees on the room card (the first four). */
export function AmenityIcons({ room }: { room: Room }) {
  const shown = room.amenities.slice(0, AMENITIES_ON_CARD);
  if (shown.length === 0) return <span className="text-[13px] text-soft">None yet</span>;
  return (
    <span className="flex items-center gap-1">
      {shown.map((key) => {
        const amenity = AMENITIES[key];
        if (!amenity) return null;
        const Icon = amenity.icon;
        return (
          <Tooltip key={key}>
            <TooltipTrigger
              render={<span className="flex size-7 items-center justify-center rounded-md border border-line bg-white text-muted" />}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
              <span className="sr-only">{amenity.label}</span>
            </TooltipTrigger>
            <TooltipContent>{amenity.label}</TooltipContent>
          </Tooltip>
        );
      })}
      {room.amenities.length > AMENITIES_ON_CARD ? (
        <span className="text-xs font-semibold text-muted-2">+{room.amenities.length - AMENITIES_ON_CARD}</span>
      ) : null}
    </span>
  );
}
