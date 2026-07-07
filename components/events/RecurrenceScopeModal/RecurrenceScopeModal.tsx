"use client";

import { Button, ConfirmModal } from "@/components/ui";

interface RecurrenceScopeModalProps {
  open: boolean;
  mode: "move" | "delete";
  planTitle: string;
  onThisOccurrence: () => void;
  onAllOccurrences: () => void;
  onCancel: () => void;
}

export function RecurrenceScopeModal({
  open,
  mode,
  planTitle,
  onThisOccurrence,
  onAllOccurrences,
  onCancel,
}: RecurrenceScopeModalProps) {
  const isDelete = mode === "delete";
  return (
    <ConfirmModal
      open={open}
      title={isDelete ? "Delete recurring plan" : "Move recurring plan"}
      body={`"${planTitle}" repeats. ${
        isDelete ? "Delete" : "Move"
      } just this occurrence, or every occurrence?`}
      confirmLabel="Just this occurrence"
      cancelLabel="Cancel"
      tone={isDelete ? "danger" : "default"}
      onCancel={onCancel}
      onConfirm={onThisOccurrence}
      extraActions={
        <Button variant="glass" size="sm" onClick={onAllOccurrences}>
          Every occurrence
        </Button>
      }
    />
  );
}
