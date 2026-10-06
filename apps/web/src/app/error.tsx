"use client";

import { TriangleAlert } from "lucide-react";

import { ErrorActions, errorReference, useReportError, type ErrorProps } from "@/components/error-actions";
import { StatusScreen } from "@/components/status-screen";

/** Errors on the landing page, the login screens and the dashboard's own layout. */
export default function AppError({ error, retry }: ErrorProps) {
  useReportError(error);
  return (
    <StatusScreen
      badge={<TriangleAlert className="size-12" strokeWidth={1.75} />}
      title="Something went wrong"
      actions={<ErrorActions retry={retry} />}
      footnote={errorReference(error)}
    >
      This page didn't load properly. Try again, and if it keeps happening, message us and we'll sort it out.
    </StatusScreen>
  );
}
