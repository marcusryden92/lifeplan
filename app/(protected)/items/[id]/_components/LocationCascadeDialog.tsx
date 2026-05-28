"use client";

import React from "react";
import { Button } from "@/components/ui/Button.legacy";

interface LocationCascadeDialogProps {
  open: boolean;
  onClose: () => void;
  onApplyToThis: () => void;
  onApplyToAll: () => void;
}

export function LocationCascadeDialog({
  open,
  onClose,
  onApplyToThis,
  onApplyToAll,
}: LocationCascadeDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-4 shadow-lg max-w-sm mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-gray-700 mb-4">
          Apply this location to all subtasks?
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onApplyToThis}>
            This item only
          </Button>
          <Button size="sm" onClick={onApplyToAll}>
            All subtasks
          </Button>
        </div>
      </div>
    </div>
  );
}
