"use client";

import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
import type { TravelTime, Location } from "@/types/prisma";
import {
  MODAL_FADE_MS,
  overlay,
  modal,
  header,
  title,
  subtitle,
  periodList,
  periodRow,
  periodName,
  periodInput,
  googleHint,
  revertBtn,
  footer,
  footerSpacer,
} from "./EditTravelTimeModal.css";

type Period = "rush" | "regular" | "night";

interface EditTravelTimeModalProps {
  open: boolean;
  travelTime: TravelTime | null;
  fromLocation: Location | null;
  toLocation: Location | null;
  onClose: () => void;
  onSave: (
    travelTimeId: string,
    next: {
      customRushHourMinutes: number | null;
      customRegularMinutes: number | null;
      customNightMinutes: number | null;
    },
  ) => Promise<void>;
}

export function EditTravelTimeModal({
  open,
  travelTime,
  fromLocation,
  toLocation,
  onClose,
  onSave,
}: EditTravelTimeModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [dataState, setDataState] = useState<"open" | "closed">(
    open ? "open" : "closed",
  );

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const id = requestAnimationFrame(() => setDataState("open"));
      return () => cancelAnimationFrame(id);
    }
    setDataState("closed");
    const t = setTimeout(() => setShouldRender(false), MODAL_FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  // Drafts mirror the current effective values for each period. They reset
  // whenever the modal is opened on a fresh travel-time entry.
  const [rushDraft, setRushDraft] = useState("");
  const [regDraft, setRegDraft] = useState("");
  const [nightDraft, setNightDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !travelTime) return;
    setRushDraft(
      String(
        travelTime.customRushHourMinutes ?? travelTime.googleRushHourMinutes,
      ),
    );
    setRegDraft(
      String(
        travelTime.customRegularMinutes ?? travelTime.googleRegularMinutes,
      ),
    );
    setNightDraft(
      String(travelTime.customNightMinutes ?? travelTime.googleNightMinutes),
    );
  }, [open, travelTime]);

  if (!shouldRender || !travelTime) return null;

  const parse = (s: string): number | null => {
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };

  // null = custom equals Google value, so we drop the override and revert to
  // Google's number. The save handler treats null as "clear override".
  const overrideFor = (
    draft: string,
    googleValue: number,
  ): number | null => {
    const n = parse(draft);
    if (n === null || n === googleValue) return null;
    return n;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(travelTime.id, {
        customRushHourMinutes: overrideFor(
          rushDraft,
          travelTime.googleRushHourMinutes,
        ),
        customRegularMinutes: overrideFor(
          regDraft,
          travelTime.googleRegularMinutes,
        ),
        customNightMinutes: overrideFor(
          nightDraft,
          travelTime.googleNightMinutes,
        ),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const revertOne = (period: Period) => {
    if (period === "rush") {
      setRushDraft(String(travelTime.googleRushHourMinutes));
    } else if (period === "regular") {
      setRegDraft(String(travelTime.googleRegularMinutes));
    } else {
      setNightDraft(String(travelTime.googleNightMinutes));
    }
  };

  const periodConfig: {
    key: Period;
    label: string;
    draft: string;
    setDraft: (s: string) => void;
    googleValue: number;
    hasCustom: boolean;
  }[] = [
    {
      key: "rush",
      label: "Rush",
      draft: rushDraft,
      setDraft: setRushDraft,
      googleValue: travelTime.googleRushHourMinutes,
      hasCustom: travelTime.customRushHourMinutes !== null,
    },
    {
      key: "regular",
      label: "Regular",
      draft: regDraft,
      setDraft: setRegDraft,
      googleValue: travelTime.googleRegularMinutes,
      hasCustom: travelTime.customRegularMinutes !== null,
    },
    {
      key: "night",
      label: "Night",
      draft: nightDraft,
      setDraft: setNightDraft,
      googleValue: travelTime.googleNightMinutes,
      hasCustom: travelTime.customNightMinutes !== null,
    },
  ];

  return (
    <div
      className={overlay}
      data-state={dataState}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={modal}>
        <div className={header}>
          <h2 className={title}>
            {fromLocation?.name ?? "From"} → {toLocation?.name ?? "To"}
          </h2>
          <span className={subtitle}>
            Travel time in minutes. Override any period; clear to revert to
            Google&apos;s value.
          </span>
        </div>

        <div className={periodList}>
          {periodConfig.map((p) => {
            const draftNum = parse(p.draft);
            const willOverride =
              draftNum !== null && draftNum !== p.googleValue;
            const canRevert = willOverride || p.hasCustom;
            return (
              <div key={p.key} className={periodRow}>
                <span className={periodName}>{p.label}</span>
                <input
                  className={periodInput}
                  type="number"
                  min={0}
                  max={999}
                  value={p.draft}
                  onChange={(e) => p.setDraft(e.target.value)}
                />
                <span className={googleHint}>Google: {p.googleValue} min</span>
                <button
                  type="button"
                  className={revertBtn}
                  onClick={() => revertOne(p.key)}
                  disabled={!canRevert}
                  aria-label={`Revert ${p.label.toLowerCase()} to Google value`}
                  title="Revert to Google value"
                >
                  <RotateCcw size={12} strokeWidth={2.2} />
                </button>
              </div>
            );
          })}
        </div>

        <div className={footer}>
          <span className={footerSpacer} />
          <Button variant="glass" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
