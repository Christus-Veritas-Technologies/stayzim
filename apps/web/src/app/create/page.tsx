"use client";

import { Skeleton } from "@stayzim/ui/components/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { findTemplate, type TemplateKey } from "@stayzim/sites";

import { CreateFrame, type CreateStepIndex } from "@/components/create/frame";
import { LiveStep } from "@/components/create/live-step";
import { LodgeStep } from "@/components/create/lodge-step";
import { lookFromParams, LookStep } from "@/components/create/look-step";
import { PhotosStep, previewPhotos } from "@/components/create/photos-step";
import { CreatePreview } from "@/components/create/preview";
import { LodgeProvider, useLodge } from "@/components/dashboard/lodge-provider";
import { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { planFromParam } from "@/components/plan-picker";
import { authClient } from "@/lib/auth-client";
import { siteHost } from "@/lib/lodge";
import { metaCreateStep } from "@/lib/meta-pixel";
import { signupSource, trackCreateStep } from "@/lib/track";

type Step = "look" | "lodge" | "photos" | "live";

const STEPS: Step[] = ["look", "lodge", "photos", "live"];

function stepFromParam(value: string | null): Step {
  return STEPS.includes(value as Step) ? (value as Step) : "look";
}

function Loading({ step }: { step: CreateStepIndex }) {
  return (
    <CreateFrame step={step}>
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-[118px] w-full rounded-2xl xl:hidden" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-11 w-full" />
      </div>
    </CreateFrame>
  );
}

/**
 * /create: the one way in, from the ads and the landing page alike
 * (stayzim.co.zw/create?utm_source=meta&…). A look for the site (the plan
 * comes with it), the lodge's name and WhatsApp, then 3 photos, and the site
 * is live, taking shape beside the form. No email first: a guest account
 * owns the demo until "Claim my site". The step and the look are in the URL
 * (?step=&look=), so a reload carries on.
 */
function CreateFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [step, setStep] = useState<Step>(() => stepFromParam(params.get("step")));
  const [look, setLook] = useState<TemplateKey>(() => lookFromParams(params.get("look"), planFromParam(params.get("plan"))));
  // Bumped when the lodge is made, so the provider loads it
  const [version, setVersion] = useState(0);
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    signupSource();
    trackCreateStep("open");
    metaCreateStep("open");
  }, []);

  function go(next: Step, picked = look) {
    setStep(next);
    router.replace(`/create?step=${next}&look=${picked}`, { scroll: false });
    window.scrollTo({ top: 0 });
  }

  if (isPending) return <Loading step={0} />;

  // Before there's a lodge: the look, then the name and WhatsApp
  const lodgeStep =
    step === "lodge" ? (
      <CreateFrame step={1} preview={<CreatePreview name={name} photos={[]} />} onBack={() => go("look")}>
        <LodgeStep
          plan={findTemplate(look)!.plan}
          template={look}
          name={name}
          onName={setName}
          signedIn={Boolean(session)}
          onBack={() => go("look")}
          onCreated={() => {
            go("photos");
            setVersion((value) => value + 1);
          }}
        />
      </CreateFrame>
    ) : (
      <CreateFrame step={0}>
        <LookStep
          value={look}
          onChange={(key) => {
            setLook(key);
            router.replace(`/create?step=look&look=${key}`, { scroll: false });
          }}
          onNext={() => {
            trackCreateStep("look");
            metaCreateStep("look");
            go("lodge");
          }}
        />
      </CreateFrame>
    );
  if (!session) return lodgeStep;

  return (
    <LodgeProvider key={version} loading={<Loading step={2} />} missing={lodgeStep}>
      <AfterLodge step={step} guest={session.user.isAnonymous === true} resuming={step === "photos" || step === "live"} onGo={go} />
    </LodgeProvider>
  );
}

/**
 * Photos, then live. An owner with a real account who opens /create again
 * (not mid-flow) has a lodge already, so they go to the dashboard. A step
 * from before the lodge (Back, an old link) carries on with the photos.
 */
function AfterLodge({ step, guest, resuming, onGo }: { step: Step; guest: boolean; resuming: boolean; onGo: (step: Step) => void }) {
  const router = useRouter();
  const { lodge } = useLodge();
  const uploads = usePhotoUploads({ limit: 3, existing: lodge.gallery.length });
  const leave = !guest && !resuming;

  useEffect(() => {
    if (leave) router.replace("/dashboard");
  }, [leave, router]);
  if (leave) return <Loading step={2} />;

  const preview = <CreatePreview name={lodge.name} host={siteHost(lodge)} themeColor={lodge.themeColor} photos={previewPhotos(lodge, uploads)} />;
  return step === "live" ? (
    <CreateFrame step={3} preview={preview}>
      <LiveStep />
    </CreateFrame>
  ) : (
    <CreateFrame step={2} preview={preview}>
      <PhotosStep uploads={uploads} onLive={() => onGo("live")} />
    </CreateFrame>
  );
}

export default function CreatePage() {
  return (
    <Suspense>
      <CreateFlow />
    </Suspense>
  );
}
