"use client";

import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const avatarVariants = cva(
  "relative inline-flex shrink-0 items-center justify-center overflow-hidden font-semibold select-none",
  {
    variants: {
      /** `person`: round, Msasa peach. `lodge`: rounded square monogram in the lodge's theme colour. */
      shape: {
        person: "rounded-full bg-peach-wash text-rust",
        lodge: "rounded-[9px] bg-highland font-serif text-white",
      },
      size: {
        sm: "size-7 text-[11px]",
        default: "size-[34px] text-[13px]",
        lg: "size-11 text-base",
      },
    },
    compoundVariants: [
      { shape: "lodge", size: "default", className: "text-[15px]" },
      { shape: "lodge", size: "lg", className: "rounded-xl text-lg" },
    ],
    defaultVariants: { shape: "person", size: "default" },
  },
);

/** First letters of the first two words: "Mist Valley Lodge" → "MV". */
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join("") || "?"
  );
}

function Avatar({
  name,
  src,
  className,
  shape,
  size,
  color,
  ...props
}: Omit<AvatarPrimitive.Root.Props, "children"> &
  VariantProps<typeof avatarVariants> & {
    name: string;
    src?: string | null;
    /** Background colour, e.g. the lodge theme colour */
    color?: string;
  }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(avatarVariants({ shape, size }), className)}
      style={color ? { backgroundColor: color } : undefined}
      {...props}
    >
      {src ? <AvatarPrimitive.Image src={src} alt="" className="size-full object-cover" /> : null}
      <AvatarPrimitive.Fallback aria-hidden="true">{initials(name)}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}

export { Avatar, avatarVariants, initials };
