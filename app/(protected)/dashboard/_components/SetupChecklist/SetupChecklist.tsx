"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Circle, X } from "lucide-react";
import { useAssistant, useCapture } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  card,
  head,
  title,
  dismiss,
  list,
  row,
  rowButton,
  mark,
  markDone,
  label,
  labelDone,
  optional,
} from "./SetupChecklist.css";

const DISMISS_KEY = "circadium.setupChecklist.dismissed";
const AI_KEY = "circadium.setupChecklist.aiStarted";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  optional?: boolean;
  action: () => void;
};

export function SetupChecklist() {
  const router = useRouter();
  const { openAssistant } = useAssistant();
  const { setOpen: setCaptureOpen } = useCapture();
  const { categories, template, planner, locations } = useCalendarProvider();

  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [aiStarted, setAiStarted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    setAiStarted(localStorage.getItem(AI_KEY) === "1");
  }, []);

  const startAi = () => {
    localStorage.setItem(AI_KEY, "1");
    setAiStarted(true);
    openAssistant({ intent: "onboarding" });
  };

  const items: ChecklistItem[] = [
    {
      key: "roles",
      label: "Choose your roles",
      done: categories.length > 0,
      action: () => router.push("/categories"),
    },
    {
      key: "place",
      label: "Add a place",
      done: locations.length > 0,
      action: () => router.push("/locations"),
    },
    {
      key: "week",
      label: "Sketch your week",
      done: template.length > 0,
      action: () => router.push("/calendar"),
    },
    {
      key: "capture",
      label: "Capture your first item",
      done: planner.length > 0,
      action: () => setCaptureOpen(true),
    },
    {
      key: "ai",
      label: "Plan with AI",
      done: aiStarted,
      optional: true,
      action: startAi,
    },
  ];

  // Optional items (Plan with AI) don't gate completion — otherwise an
  // established user who never opened the assistant would see the card forever.
  const allDone = items.filter((i) => !i.optional).every((i) => i.done);

  if (!mounted || dismissed || allDone) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className={card}>
      <div className={head}>
        <h2 className={title}>Finish setting up</h2>
        <button
          type="button"
          className={dismiss}
          onClick={handleDismiss}
          aria-label="Dismiss setup checklist"
        >
          <X size={16} strokeWidth={2.2} />
        </button>
      </div>

      <ul className={list}>
        {items.map((item) =>
          item.done ? (
            <li key={item.key} className={row}>
              <span className={`${mark} ${markDone}`}>
                <Check size={16} strokeWidth={2.6} />
              </span>
              <span className={`${label} ${labelDone}`}>{item.label}</span>
            </li>
          ) : (
            <li key={item.key}>
              <button type="button" className={rowButton} onClick={item.action}>
                <span className={mark}>
                  <Circle size={16} strokeWidth={2} />
                </span>
                <span className={label}>{item.label}</span>
                {item.optional && <span className={optional}>optional</span>}
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
