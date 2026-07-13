"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, ConfirmModal } from "@/components/ui";
import { AIDraftModal } from "@/components/draft/AIDraftModal";
import { StepFrame } from "../_components/StepFrame";
import { aiWorkspace, footerActions } from "../onboarding.css";

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
  // The persisted conversation id from a previous visit to this step, so a
  // refresh mid-interview resumes the same chat; null starts fresh. Reported
  // back (or cleared on an explicit discard) via onConversationIdChange.
  resumeConversationId: string | null;
  onConversationIdChange: (id: string | null) => void;
};

export function OnboardingAIStep({
  stepIndex,
  totalSteps,
  onBack,
  onFinish,
  onSkip,
  finishing,
  resumeConversationId,
  onConversationIdChange,
}: OnboardingAIStepProps) {
  const [assistant, setAssistant] = useState<AssistantState>({
    hasChanges: false,
    isStreaming: false,
    save: () => {},
  });
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Save & continue applies the assistant's proposals (which calls onSaved =
  // onFinish); with nothing proposed it just finishes.
  const handleContinue = () => {
    if (assistant.hasChanges) assistant.save();
    else onFinish();
  };

  // Leaving this step unmounts the assistant, which discards unsaved
  // proposals and the conversation — confirm instead of losing them silently.
  const handleBack = () => {
    if (assistant.hasChanges) setShowBackConfirm(true);
    else onBack();
  };

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      wide
      title="Plan your first goals with AI"
      subtitle="Chat to draft goals across your roles, then Save & continue to keep them. Nothing is added until you do."
      onSkip={onSkip}
      skipDisabled={finishing}
      footer={
        <>
          <Button
            variant="glass"
            onClick={handleBack}
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
        </>
      }
    >
      <div className={aiWorkspace}>
        <AIDraftModal
          embedded
          open
          onClose={() => {}}
          focus={null}
          intent="onboarding"
          onSaved={onFinish}
          onStateChange={setAssistant}
          resumeConversationId={resumeConversationId}
          onConversationIdChange={onConversationIdChange}
        />
      </div>

      <ConfirmModal
        open={showBackConfirm}
        title="Discard the draft?"
        body="Going back closes the assistant and discards its unsaved proposals and this conversation."
        confirmLabel="Discard and go back"
        cancelLabel="Stay here"
        tone="danger"
        onCancel={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          // The dialog promises the conversation is discarded — drop the
          // stored id so returning to this step starts a fresh interview.
          onConversationIdChange(null);
          onBack();
        }}
      />
    </StepFrame>
  );
}
