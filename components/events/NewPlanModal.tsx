"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { format } from "date-fns";
import { CornerDownLeft } from "lucide-react";
import { Button, Caption, Kbd } from "@/components/ui";
import {
  overlay,
  dialog,
  header,
  input,
  hintsRow,
} from "@/components/ui/shell/CapturePalette/CapturePalette.css";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    setValue("");
  }, [open]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onCreate(trimmed);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    submit();
  };

  const timeRange =
    start && end
      ? `${format(start, "EEE MMM d · HH:mm")} – ${format(end, "HH:mm")}`
      : "";

  const canSubmit = value.trim().length > 0;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={dialog}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className={header}>
            <Caption>{timeRange ? `new plan · ${timeRange}` : "new plan"}</Caption>
          </div>
          <Dialog.Title style={{ position: "absolute", left: -10000 }}>
            New plan
          </Dialog.Title>
          <input
            ref={inputRef}
            className={input}
            placeholder="what's the plan?"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className={hintsRow} style={{ justifyContent: "flex-end" }}>
            <Button variant="glass" size="sm" onClick={onCancel}>
              Cancel
              <Kbd style={{ marginLeft: 8 }}>esc</Kbd>
            </Button>
            <Button
              variant="glassInk"
              size="sm"
              onClick={submit}
              disabled={!canSubmit}
            >
              Create
              <Kbd style={{ marginLeft: 8 }}>
                <CornerDownLeft size={11} strokeWidth={2.4} />
              </Kbd>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
