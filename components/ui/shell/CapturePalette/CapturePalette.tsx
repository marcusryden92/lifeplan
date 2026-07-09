"use client";

import { space } from "@/lib/theme";
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useCapture } from "../CaptureContext";
import { Caption } from "../../Caption";
import { Button } from "../../Button";
import { Kbd } from "../../Kbd";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { usePlatform } from "@/hooks/usePlatform";
import { PRIORITY_DEFAULT } from "@/utils/plannerPriority";
import type { Planner } from "@/types/prisma";
import {
  overlay,
  dialog,
  header,
  input,
  hintsRow,
} from "./CapturePalette.css";

export function CapturePalette() {
  const { open, setOpen } = useCapture();
  const { modKey } = usePlatform();
  const router = useRouter();
  const { userId, updatePlannerArray } = useCalendarProvider();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
    setValue("");
  }, [open]);

  const saveNote = (): boolean => {
    const t = value.trim();
    if (!t) return false;
    const now = new Date().toISOString();
    const newItem: Planner = {
      id: uuidv4(),
      title: t,
      parentId: null,
      plannerType: "task",
      // Ready by default; the untriaged flag, not readiness, keeps it a draft.
      isReady: true,
      isTriaged: false,
      duration: 0,
      deadline: null,
      starts: null,
      recurrence: null,
      recurrenceExceptions: null,
      splitting: null,
      completedSegments: null,
      sortOrder: 0,
      completedStartTime: null,
      completedEndTime: null,
      priority: PRIORITY_DEFAULT,
      userId,
      color: null,
      locationId: null,
      useParentLocation: false,
      categoryId: null,
      createdAt: now,
      updatedAt: now,
    };
    updatePlannerArray((prev: Planner[]) => [...prev, newItem]);
    setValue("");
    return true;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const saved = saveNote();
    if (!saved) return;
    e.preventDefault();
    if (e.metaKey || e.ctrlKey) {
      setOpen(false);
      router.push("/capture");
    } else {
      setOpen(false);
    }
  };

  const saveToInbox = () => {
    if (saveNote()) setOpen(false);
  };
  const saveAndTriage = () => {
    if (saveNote()) {
      setOpen(false);
      router.push("/capture");
    }
  };

  const canSubmit = value.trim().length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content
          className={dialog}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className={header}>
            <Caption>capture · jot · classify later</Caption>
          </div>
          <Dialog.Title style={{ position: "absolute", left: -10000 }}>
            Capture
          </Dialog.Title>
          <input
            ref={inputRef}
            className={input}
            placeholder="jot anything…"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className={hintsRow} style={{ justifyContent: "flex-end" }}>
            <Button variant="glass" size="sm" onClick={() => setOpen(false)}>
              Cancel
              <Kbd style={{ marginLeft: space["2"] }}>esc</Kbd>
            </Button>
            <Button
              variant="glass"
              size="sm"
              onClick={saveAndTriage}
              disabled={!canSubmit}
            >
              Save & triage
              <Kbd style={{ marginLeft: space["2"] }}>
                {modKey}
                <CornerDownLeft
                  size={11}
                  strokeWidth={2.4}
                  style={{ marginLeft: space["1"] }}
                />
              </Kbd>
            </Button>
            <Button
              variant="glassInk"
              size="sm"
              onClick={saveToInbox}
              disabled={!canSubmit}
            >
              Save
              <Kbd style={{ marginLeft: space["2"] }}>
                <CornerDownLeft size={11} strokeWidth={2.4} />
              </Kbd>
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
