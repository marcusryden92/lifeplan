"use client";

import { useCallback, useState } from "react";
import { Backdrop, Grain } from "@/components/ui";
import { OnboardingFlow } from "./OnboardingFlow";
import { overlayRoot } from "./onboarding.css";

// Rendered in the shell's overlay slot. Its initial visibility is resolved on
// the server (the protected layout reads onboardedAt), so on a fresh load the
// overlay is either present or absent from the first paint — no flash of the
// dashboard before it appears. Completing (or skipping) hides it in place; no
// navigation, no route, so nothing beneath needs to know onboarding exists.
export function OnboardingOverlay({
  initialNeedsOnboarding,
}: {
  initialNeedsOnboarding: boolean;
}) {
  const [show, setShow] = useState(initialNeedsOnboarding);

  const handleComplete = useCallback(() => setShow(false), []);

  if (!show) return null;

  return (
    <div className={overlayRoot}>
      <Backdrop variant="blob" />
      <Grain />
      <OnboardingFlow onComplete={handleComplete} />
    </div>
  );
}
