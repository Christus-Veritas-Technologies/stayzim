"use client";

import { Toaster } from "@stayzim/ui/components/sonner";
import { MotionConfig } from "framer-motion";
import { Suspense } from "react";

import { NavigationProgress } from "@/components/navigation-progress";

import { ThemeProvider } from "./theme-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    // The landing design is light-only
    <ThemeProvider attribute="class" forcedTheme="light" disableTransitionOnChange>
      {/* Honours the OS "reduce motion" setting across every animation */}
      <MotionConfig reducedMotion="user">
        {/* Reads the search params, so it waits in Suspense instead of making every page dynamic */}
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
        <Toaster richColors />
      </MotionConfig>
    </ThemeProvider>
  );
}
