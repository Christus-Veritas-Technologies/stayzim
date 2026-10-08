"use client";

import { Skeleton } from "@stayzim/ui/components/skeleton";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

import { DEFAULT_COUNTRY, findTemplate, type TemplateKey } from "@stayzim/sites";

import { CreateFrame, type CreateStepIndex } from "@/components/create/frame";
import { LiveStep } from "@/components/create/live-step";
import { LodgeStep, type CreatePlace } from "@/components/create/lodge-step";
import { lookFromParams, LookStep } from "@/components/create/look-step";
import { PhotosStep } from "@/components/create/photos-step";
import { factsFromParams, factsParams, PlaceStep, type CreateFacts } from "@/components/create/place-step";
import { CreatePreview, DEFAULT_THEME, samplePreviewUrl } from "@/components/create/preview";
import { LodgeProvider, useLodge } from "@/components/dashboard/lodge-provider";
import { usePhotoUploads } from "@/components/dashboard/use-photo-uploads";
import { planFromParam } from "@/components/plan-picker";
import { authClient } from "@/lib/auth-client";
import { siteHost } from "@/lib/lodge";
import { metaCreateStep } from "@/lib/meta-pixel";
import { signupSource, trackCreateStep } from "@/lib/track";

type Step = "look" | "place" | "lodge" | "photos" | "live";

const STEPS: Step[] = ["look", "place", "lodge", "photos", "live"];

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
  const [facts, setFacts] = useState<CreateFacts>(() => factsFromParams(params));
  const [place, setPlace] = useState<CreatePlace>({ town: "", country: DEFAULT_COUNTRY });
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

  /** The URL for a step, carrying the look and the answers so far (a reload keeps them). */
  function stepUrl(next: Step, picked = look, answers = facts) {
    const query = factsParams(answers);
    query.set("step", next);
    query.set("look", picked);
    return `/create?${query.toString()}` as const;
  }

  function go(next: Step, picked = look) {
    setStep(next);
    router.replace(stepUrl(next, picked), { scroll: false });
    window.scrollTo({ top: 0 });
  }

  if (isPending) return <Loading step={0} />;

  // Before there's a lodge: the picked design, written from the answers so far
  const preview = <CreatePreview src={samplePreviewUrl({ template: look, name, town: place.town, country: place.country, facts })} name={name} tint={DEFAULT_THEME} />;

  // Before there's a lodge: the look, the place, then the name, town and WhatsApp
  const lodgeStep =
    step === "lodge" ? (
      <CreateFrame step={2} preview={preview} onBack={() => go("place")}>
        <LodgeStep
          plan={findTemplate(look)!.plan}
          template={look}
          name={name}
          onName={setName}
          place={place}
          onPlace={setPlace}
          facts={facts}
          signedIn={Boolean(session)}
          onBack={() => go("place")}
          onCreated={() => {
            go("photos");
            setVersion((value) => value + 1);
          }}
        />
      </CreateFrame>
    ) : step === "place" ? (
      <CreateFrame step={1} preview={preview} onBack={() => go("look")}>
        <PlaceStep
          facts={facts}
          onChange={(answers) => {
            setFacts(answers);
            router.replace(stepUrl("place", look, answers), { scroll: false });
          }}
          onBack={() => go("look")}
          onNext={() => {
            trackCreateStep("place");
            metaCreateStep("place");
            go("lodge");
          }}
        />
      </CreateFrame>
    ) : (
      <CreateFrame step={0} preview={preview}>
        <LookStep
          value={look}
          onChange={(key) => {
            setLook(key);
            router.replace(stepUrl("look", key), { scroll: false });
          }}
          onNext={() => {
            trackCreateStep("look");
            metaCreateStep("look");
            go("place");
          }}
        />
      </CreateFrame>
    );
  if (!session) return lodgeStep;

  return (
    <LodgeProvider key={version} loading={<Loading step={3} />} missing={lodgeStep}>
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
  if (leave) return <Loading step={3} />;

  // The lodge's own site now; it reloads as saved photos arrive
  const preview = (
    <CreatePreview src={`/preview/${lodge.slug}/${lodge.siteTemplate}?bare=1&photos=${lodge.gallery.length}`} name={lodge.name} host={siteHost(lodge)} tint={lodge.themeColor} />
  );
  return step === "live" ? (
    <CreateFrame step={4} preview={preview}>
      <LiveStep />
    </CreateFrame>
  ) : (
    <CreateFrame step={3} preview={preview}>
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
