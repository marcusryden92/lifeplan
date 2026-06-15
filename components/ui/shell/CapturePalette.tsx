"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useCapture } from "./CaptureContext";
import { Caption } from "../Caption";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { usePlatform } from "@/hooks/usePlatform";
import type { Planner } from "@/types/prisma";
import {
  overlay,
  dialog,
  header,
  input,
  hintsRow,
  kbd,
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
      isReady: false,
      duration: 0,
      deadline: null,
      starts: null,
      dependency: null,
      completedStartTime: null,
      completedEndTime: null,
      priority: 5,
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
      router.push("/circadium/capture");
    } else {
      setOpen(false);
    }
  };

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
            <span className={kbd}>esc</span>
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
          <div className={hintsRow}>
            <Caption>save to inbox</Caption>
            <span className={kbd}>
              <CornerDownLeft size={11} strokeWidth={2.4} />
            </span>
            <Caption style={{ marginLeft: 12 }}>save & triage</Caption>
            <span className={kbd}>
              {modKey}
              <CornerDownLeft
                size={11}
                strokeWidth={2.4}
                style={{ marginLeft: 3 }}
              />
            </span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
