"use client";

import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { CornerDownLeft } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import {
  overlay,
  modal,
  modalTitle,
  modalActions,
  timeRange as timeRangeStyle,
  titleInput,
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
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) setTitle("");
  }, [open]);

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
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={modal}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className={modalTitle}>New plan</Dialog.Title>
          {timeRange && <div className={timeRangeStyle}>{timeRange}</div>}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
