import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** False while the phone or computer has no connection. Online on the server and before hydration. */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Why a Save button is disabled while offline, for <WhyDisabled>. */
export const OFFLINE_REASON = "You're offline. Changes save once you're back.";
