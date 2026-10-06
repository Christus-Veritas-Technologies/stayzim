"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@stayzim/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-4", className)} {...props} />;
}

const tabsListVariants = cva("relative z-0 flex w-fit max-w-full items-center gap-1 overflow-x-auto [scrollbar-width:none]", {
  variants: {
    /** `plain`: pills on the page. `track`: pills in a grey track that fills the width (phones). */
    variant: {
      plain: "",
      track: "w-full rounded-full bg-surface-2 p-1 *:data-[slot=tabs-tab]:flex-1",
    },
  },
  defaultVariants: { variant: "plain" },
});

/** Pill tabs. The Kariba pill slides to the selected tab. */
function TabsList({
  className,
  variant,
  children,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant }), className)} {...props}>
      {children}
      <TabsPrimitive.Indicator
        data-slot="tabs-indicator"
        className="absolute top-1/2 left-0 -z-10 h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) -translate-y-1/2 rounded-full bg-primary shadow-brand transition-[translate,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
      />
    </TabsPrimitive.List>
  );
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-full px-[15px] text-[13.5px] font-medium whitespace-nowrap text-muted-2 transition-colors duration-200 outline-none select-none hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/30 data-active:font-semibold data-active:text-white data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("outline-none animate-in fade-in-0 slide-in-from-bottom-1 duration-300 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsPanel, TabsTab, tabsListVariants };
