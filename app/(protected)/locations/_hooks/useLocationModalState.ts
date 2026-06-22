"use client";

import { useEffect, useState } from "react";
import * as locationActions from "@/actions/locations";

interface UseLocationModalStateArgs {
  open: boolean;
  // Re-run reset when this changes (e.g. the modal's target location changes
  // while it stays open). Pass a stable identity (id, or null) to keep it
  // simple.
  resetKey?: string | null;
}

interface UseLocationModalStateResult {
  sessionToken: string | null;
  resetSignal: number;
}

// On every modal open (and whenever resetKey shifts), regenerates the Google
// Places session token and emits a fresh `resetSignal` callers can hang their
// own form-reset effects off of.
export function useLocationModalState({
  open,
  resetKey = null,
}: UseLocationModalStateArgs): UseLocationModalStateResult {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (!open) return;
    setSessionToken(null);
    setResetSignal((n) => n + 1);
    locationActions
      .createSessionToken()
      .then(setSessionToken)
      .catch(() => setSessionToken(null));
  }, [open, resetKey]);

  return { sessionToken, resetSignal };
}
