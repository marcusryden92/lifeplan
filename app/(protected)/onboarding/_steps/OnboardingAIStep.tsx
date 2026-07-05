"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui";
import { AIDraftModal } from "@/components/draft/AIDraftModal/AIDraftModal";
import {
  frameWrap,
  card,
  cardWide,
  topRow,
  progress,
  segment,
  segmentFilled,
  skipLink,
  title as titleCls,
  subtitle as subtitleCls,
  aiWorkspace,
  footer,
  footerActions,
} from "../onboarding.css";

type AssistantState = {
  hasChanges: boolean;
  isStreaming: boolean;
  save: () => void;
};

type OnboardingAIStepProps = {
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onFinish: () => void;
  onSkip: () => void;
  finishing: boolean;
};

export function OnboardingAIStep({
  stepIndex,
  totalSteps,
  onBack,
  onFinish,
  onSkip,
  finishing,
}: OnboardingAIStepProps) {
  const [assistant, setAssistant] = useState<AssistantState>({
    hasChanges: false,
    isStreaming: false,
    save: () => {},
  });

  // Save & continue applies the assistant's proposals (which calls onSaved =
  // onFinish); with nothing proposed it just finishes.
  const handleContinue = () => {
    if (assistant.hasChanges) assistant.save();
    else onFinish();
  };

  return (
    <div className={frameWrap}>
      <div className={`${card} ${cardWide}`}>
        <div className={topRow}>
          <div className={progress}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <span
                key={i}
                className={`${segment} ${i <= stepIndex ? segmentFilled : ""}`}
              />
            ))}
          </div>
          <button
            type="button"
            className={skipLink}
            onClick={onSkip}
            disabled={finishing}
          >
            Skip
          </button>
        </div>

        <div>
          <h1 className={titleCls}>Plan your first goals with AI</h1>
          <p className={subtitleCls}>
            Chat to draft goals across your areas, then Save &amp; continue to
            keep them. Nothing is added until you do.
          </p>
        </div>

        <div className={aiWorkspace}>
          <AIDraftModal
            embedded
            open
            onClose={() => {}}
            focus={null}
            intent="onboarding"
            onSaved={onFinish}
            onStateChange={setAssistant}
          />
        </div>

        <div className={footer}>
          <Button
            variant="glass"
            onClick={onBack}
            disabled={finishing || assistant.isStreaming}
          >
            Back
          </Button>
          <div className={footerActions}>
            <Button
              variant="glassInk"
              onClick={handleContinue}
              disabled={finishing || assistant.isStreaming}
            >
              <Sparkles size={15} strokeWidth={2.2} />
              {assistant.hasChanges ? "Save & continue" : "Finish"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
