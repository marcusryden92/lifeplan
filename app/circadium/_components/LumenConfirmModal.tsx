"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { useModalStack } from "@/hooks/useModalStack";
import {
  overlay,
  modal,
  modalTitle,
  modalBody,
  modalActions,
  CONFIRM_FADE_MS,
} from "./LumenConfirmModal.css";

type ConfirmTone = "default" | "danger";

interface LumenConfirmModalProps {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
  onCancel: () => void;
  onConfirm: () => void;
  extraActions?: ReactNode;
}

export function LumenConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onCancel,
  onConfirm,
  extraActions,
}: LumenConfirmModalProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [dataState, setDataState] = useState<"open" | "closed">(
    open ? "open" : "closed",
  );
  const { isTop } = useModalStack(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const id = requestAnimationFrame(() => setDataState("open"));
      return () => cancelAnimationFrame(id);
    }
    setDataState("closed");
    const t = setTimeout(() => setShouldRender(false), CONFIRM_FADE_MS);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!isTop || !shouldRender) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isTop, shouldRender, onCancel]);

  if (!shouldRender) return null;

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
        <h2 className={modalTitle}>{title}</h2>
        <div className={modalBody}>{body}</div>
        <div className={modalActions}>
          {extraActions}
          <Button variant="glass" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "danger" ? "solid" : "solid"}
            size="sm"
            onClick={onConfirm}
            data-danger={tone === "danger" ? "true" : undefined}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
