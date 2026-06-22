"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import {
  overlay,
  modal,
  modalTitle,
  modalBody,
  modalActions,
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
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={overlay} />
        <Dialog.Content className={modal} aria-describedby={undefined}>
          <Dialog.Title className={modalTitle}>{title}</Dialog.Title>
          <div className={modalBody}>{body}</div>
          <div className={modalActions}>
            {extraActions}
            <Button variant="glass" size="sm" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={tone === "danger" ? "danger" : "glassInk"}
              size="sm"
              onClick={onConfirm}
              data-danger={tone === "danger" ? "true" : undefined}
            >
              {confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
