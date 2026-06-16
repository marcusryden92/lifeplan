"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Button, vars } from "@/components/ui";
import {
  overlay,
  modal,
  modalTitle,
  modalActions,
  CONFIRM_FADE_MS,
} from "@/app/circadium/items/[id]/_components/LumenConfirmModal.css";

interface NewPlanModalProps {
  open: boolean;
  start: Date | null;
  end: Date | null;
  onCancel: () => void;
  onCreate: (title: string) => void;
}

export function NewPlanModal({
  open,
  start,
  end,
  onCancel,
  onCreate,
}: NewPlanModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [dataState, setDataState] = useState<"open" | "closed">(
    open ? "open" : "closed",
  );
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setTitle("");
      const id = requestAnimationFrame(() => {
        setDataState("open");
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(id);
    }
    setDataState("closed");
    const t = setTimeout(() => setShouldRender(false), CONFIRM_FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  if (!shouldRender) return null;

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  };

  const timeRange =
    start && end
      ? `${format(start, "EEE MMM d · HH:mm")} – ${format(end, "HH:mm")}`
      : "";

  return (
    <div
      className={overlay}
      data-state={dataState}
      onClick={onCancel}
      role="presentation"
    >
      <div
        className={modal}
        data-state={dataState}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <h2 className={modalTitle}>New plan</h2>
        {timeRange && (
          <div
            style={{
              marginTop: 6,
              fontSize: 12.5,
              fontFamily: vars.font.ui,
              color: vars.muted,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {timeRange}
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape") onCancel();
          }}
          placeholder="What's the plan?"
          style={{
            display: "block",
            width: "100%",
            marginTop: 16,
            padding: "10px 12px",
            fontFamily: vars.font.ui,
            fontSize: 14,
            fontWeight: 500,
            color: vars.ink,
            background: vars.glass.bgSoft,
            border: `1px solid ${vars.glass.stroke}`,
            borderRadius: 10,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <div className={modalActions}>
          <Button variant="glass" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="solid"
            size="sm"
            onClick={submit}
            disabled={!title.trim()}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
