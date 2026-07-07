"use client";

import { Button, ConfirmModal } from "@/components/ui";

interface RecurrenceScopeModalProps {
  open: boolean;
  mode: "move" | "delete";
  planTitle: string;
  // The recurring entity's noun, used in the title/body copy. Defaults to
  // "plan"; templates pass "template".
  entityLabel?: string;
  onThisOccurrence: () => void;
  onAllOccurrences: () => void;
  onCancel: () => void;
}

export function RecurrenceScopeModal({
  open,
  mode,
  planTitle,
  entityLabel = "plan",
  onThisOccurrence,
  onAllOccurrences,
  onCancel,
}: RecurrenceScopeModalProps) {
  const isDelete = mode === "delete";
  return (
    <ConfirmModal
      open={open}
      title={`${isDelete ? "Delete" : "Move"} recurring ${entityLabel}`}
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
