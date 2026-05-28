"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef } from "react";
import { useCapture } from "./CaptureContext";
import { Caption } from "../Caption";
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

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
          />
          <div className={hintsRow}>
            <Caption>save to inbox</Caption>
            <span className={kbd}>↵</span>
            <Caption style={{ marginLeft: 12 }}>schedule</Caption>
            <span className={kbd}>⌘↵</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
