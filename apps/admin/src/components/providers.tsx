"use client";

import { Toaster } from "@stayzim/ui/components/sonner";
import { TooltipProvider } from "@stayzim/ui/components/tooltip";
import { MotionConfig } from "framer-motion";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // Light only, like the owner dashboard
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      {/* Honours the OS "reduce motion" setting across every animation */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors />
      </MotionConfig>
    </ThemeProvider>
  );
}
