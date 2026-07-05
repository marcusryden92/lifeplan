"use client";

import { Button } from "@/components/ui";
import { StepFrame } from "../_components/StepFrame";
import {
  welcomeCenter,
  brand,
  tagline,
  skipLink,
  footerActions,
} from "../onboarding.css";

type WelcomeStepProps = {
  stepIndex: number;
  totalSteps: number;
  onGetStarted: () => void;
  onSkipSetup: () => void;
  finishing: boolean;
};

export function WelcomeStep({
  stepIndex,
  totalSteps,
  onGetStarted,
  onSkipSetup,
  finishing,
}: WelcomeStepProps) {
  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Welcome to Circadium"
      footer={
        <>
          <button
            type="button"
            className={skipLink}
            onClick={onSkipSetup}
            disabled={finishing}
          >
            Skip setup
          </button>
          <div className={footerActions}>
            <Button variant="glassInk" onClick={onGetStarted}>
              Get started
            </Button>
          </div>
        </>
      }
    >
      <div className={welcomeCenter}>
        <p className={brand}>Circadium</p>
        <p className={tagline}>
          A calendar that plans around your life. You say what matters, and we
          weave it through your week.
        </p>
      </div>
    </StepFrame>
  );
}
