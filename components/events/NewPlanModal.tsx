"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { useModalStack } from "@/hooks/useModalStack";
import {
  overlay,
  modal,
  modalTitle,
  modalActions,
  timeRange as timeRangeStyle,
  titleInput,
  FADE_MS,
} from "./NewPlanModal.css";
import { kbd } from "@/components/ui/shell/CapturePalette.css";

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
  const { isTop } = useModalStack(open);

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
    const t = setTimeout(() => setShouldRender(false), FADE_MS);
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
      onClick={() => {
        if (isTop) onCancel();
      }}
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
        {timeRange && <div className={timeRangeStyle}>{timeRange}</div>}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            else if (e.key === "Escape" && isTop) onCancel();
          }}
          placeholder="What's the plan?"
          className={titleInput}
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
            <span className={kbd} style={{ marginLeft: 8 }}>
              <CornerDownLeft size={11} strokeWidth={2.4} />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
