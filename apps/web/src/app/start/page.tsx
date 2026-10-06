"use client";

import { Skeleton } from "@stayzim/ui/components/skeleton";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { LodgeProvider } from "@/components/dashboard/lodge-provider";
import { planFromParam } from "@/components/plan-picker";
import { StartFrame } from "@/components/start/frame";
import { LiveStep } from "@/components/start/live-step";
import { LodgeStep } from "@/components/start/lodge-step";
import { PhotosStep } from "@/components/start/photos-step";
import { RoomsStep } from "@/components/start/rooms-step";
import { authClient } from "@/lib/auth-client";

const STEPS = ["lodge", "photos", "rooms", "live"] as const;
type Step = (typeof STEPS)[number];

function Loading({ step }: { step: number }) {
  return (
    <StartFrame step={step}>
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </StartFrame>
  );
}

/**
 * /start, right after sign-up: the lodge (live as a demo when it's created),
 * then photos, rooms, and "you're live". Each step is in the URL (?step=), so a
 * reload carries on where it was. An owner whose lodge exists already, opening
 * /start without a step, goes to the dashboard.
 */
function StartFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const requested = params.get("step") as Step | null;
  const [step, setStep] = useState<Step>(requested && STEPS.includes(requested) ? requested : "lodge");
  // Bumped when the lodge is created, so the provider loads it
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!isPending && !session) router.replace(`/signup${window.location.search}` as Route);
  }, [isPending, router, session]);

  function go(next: Step) {
    setStep(next);
    router.replace(`/start?step=${next}`, { scroll: false });
    window.scrollTo({ top: 0 });
  }

  const index = STEPS.indexOf(step);
  if (isPending || !session) return <Loading step={index} />;

  return (
    <LodgeProvider
      key={version}
      loading={<Loading step={index} />}
      missing={
        <StartFrame step={0}>
          <LodgeStep
            plan={planFromParam(params.get("plan"))}
            onCreated={() => {
              go("photos");
              setVersion((value) => value + 1);
            }}
          />
        </StartFrame>
      }
    >
      <AfterLodge step={step} requested={requested !== null} onGo={go} />
    </LodgeProvider>
  );
}

/** Steps once the lodge exists. Opened fresh without a step, an existing lodge goes to its dashboard. */
function AfterLodge({ step, requested, onGo }: { step: Step; requested: boolean; onGo: (step: Step) => void }) {
  const router = useRouter();
  const leave = step === "lodge" && !requested;
  useEffect(() => {
    if (leave) router.replace("/dashboard");
  }, [leave, router]);
  if (leave) return <Loading step={0} />;

  const current = step === "lodge" ? "photos" : step;
  return (
    <StartFrame step={STEPS.indexOf(current)}>
      {current === "photos" ? <PhotosStep onNext={() => onGo("rooms")} /> : null}
      {current === "rooms" ? <RoomsStep onNext={() => onGo("live")} /> : null}
      {current === "live" ? <LiveStep /> : null}
    </StartFrame>
  );
}

export default function StartPage() {
  return (
    <Suspense>
      <StartFlow />
    </Suspense>
  );
}
