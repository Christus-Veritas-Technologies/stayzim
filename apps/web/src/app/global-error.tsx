"use client";

import "../index.css";
import { MotionConfig } from "framer-motion";
import { TriangleAlert } from "lucide-react";

import { ErrorActions, errorReference, useReportError, type ErrorProps } from "@/components/error-actions";
import { StatusScreen } from "@/components/status-screen";
import { fontVariables } from "@/lib/fonts";

/** Replaces the root layout when it fails, so it brings its own document, styles and fonts. */
export default function GlobalError({ error, retry }: ErrorProps) {
  useReportError(error);
  return (
    <html lang="en">
      <body className={`${fontVariables} bg-white font-sans text-ink antialiased`}>
        <title>Something went wrong · StayZim</title>
        <MotionConfig reducedMotion="user">
          <StatusScreen
            badge={<TriangleAlert className="size-12" strokeWidth={1.75} />}
            title="Something went wrong"
            actions={<ErrorActions retry={retry} />}
            footnote={errorReference(error)}
          >
            StayZim didn't load properly. Try again, and if it keeps happening, message us and we'll sort it out.
          </StatusScreen>
        </MotionConfig>
      </body>
    </html>
  );
}
