"use client";

import { Card } from "@stayzim/ui/components/card";
import { EmptyState } from "@stayzim/ui/components/empty-state";
import { TriangleAlert } from "lucide-react";

import { ErrorActions, errorReference, useReportError, type ErrorProps } from "@/components/error-actions";
import { Page, PageSection } from "@/components/dashboard/page";

/** A dashboard screen that failed: the sidebar and bottom bar stay, so the owner can go elsewhere. */
export default function DashboardError({ error, retry }: ErrorProps) {
  useReportError(error);
  return (
    <Page>
      <PageSection>
        <Card>
          <EmptyState
            className="py-14"
            icon={<TriangleAlert />}
            title="This screen didn't load"
            description="Something went wrong while showing it. Try again, or message us if it keeps happening."
            action={<ErrorActions retry={retry} size="default" />}
          />
          {errorReference(error) ? <p className="pb-5 text-center text-xs text-muted-2">{errorReference(error)}</p> : null}
        </Card>
      </PageSection>
    </Page>
  );
}
