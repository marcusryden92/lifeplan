"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AiMode } from "@/generated/client";
import { updateAiMode } from "@/actions/settings";
import {
  clearAiKey,
  getAiKeyHint,
  loadAiKey,
  storeAiKey,
  validateAiKey,
} from "@/lib/aiKey";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// BYOK access state = server-known mode (User.aiMode) + whether THIS device
// holds a key in the vault. The decrypted key itself is never in React state;
// consumers pull it per call via getApiKey().
//
//   ready     — BYOK and a key is stored on this device
//   needs-key — BYOK but no key here (new device, or key removed)
//   off       — user opted out (or never decided; null gates the same)
//   loading   — the vault lookup for this device hasn't resolved yet
export type AiAccessStatus = "loading" | "ready" | "needs-key" | "off";

export type SaveKeyResult = { ok: true } | { ok: false; message: string };

type AiAccessContextValue = {
  mode: AiMode | null;
  status: AiAccessStatus;
  keyHint: string | null;
  // Validates against Anthropic, stores encrypted on this device, and flips
  // the server mode to BYOK when needed.
  saveKey: (apiKey: string) => Promise<SaveKeyResult>;
  removeKey: () => Promise<void>;
  setMode: (mode: AiMode) => Promise<void>;
  getApiKey: () => Promise<string | null>;
};

const AiAccessContext = createContext<AiAccessContextValue | null>(null);

export function AiAccessProvider({
  initialMode,
  children,
}: {
  initialMode: AiMode | null;
  children: ReactNode;
}) {
  const user = useCurrentUser();
  const userId = user?.id ?? null;

  const [mode, setModeState] = useState<AiMode | null>(initialMode);
  const [keyHint, setKeyHint] = useState<string | null>(null);
  const [keyChecked, setKeyChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setKeyChecked(false);
    setKeyHint(null);
    if (!userId) return;
    getAiKeyHint(userId).then((hint) => {
      if (cancelled) return;
      setKeyHint(hint);
      setKeyChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const saveKey = useCallback(
    async (apiKey: string): Promise<SaveKeyResult> => {
      if (!userId) return { ok: false, message: "Not signed in." };
      const validation = await validateAiKey(apiKey);
      if (!validation.ok) return validation;
      try {
        await storeAiKey(userId, apiKey);
      } catch (err) {
        return { ok: false, message: (err as Error).message };
      }
      setKeyHint(await getAiKeyHint(userId));
      setKeyChecked(true);
      if (mode !== AiMode.BYOK) {
        const result = await updateAiMode(AiMode.BYOK);
        if (result?.error) {
          return {
            ok: false,
            message:
              "The key is stored on this device, but turning the assistant on failed — try again.",
          };
        }
        setModeState(AiMode.BYOK);
      }
      return { ok: true };
    },
    [userId, mode],
  );

  const removeKey = useCallback(async () => {
    if (!userId) return;
    await clearAiKey(userId);
    setKeyHint(null);
  }, [userId]);

  const setMode = useCallback(async (next: AiMode) => {
    // The action reports failures as {error}, not a throw — surface them as a
    // throw so callers' catch paths work and local state never lies.
    const result = await updateAiMode(next);
    if (result?.error) throw new Error(result.error);
    setModeState(next);
  }, []);

  const getApiKey = useCallback(async () => {
    if (!userId) return null;
    return loadAiKey(userId);
  }, [userId]);

  const status: AiAccessStatus = useMemo(() => {
    if (mode !== AiMode.BYOK) return "off";
    if (!keyChecked) return "loading";
    return keyHint ? "ready" : "needs-key";
  }, [mode, keyChecked, keyHint]);

  const value = useMemo(
    () => ({ mode, status, keyHint, saveKey, removeKey, setMode, getApiKey }),
    [mode, status, keyHint, saveKey, removeKey, setMode, getApiKey],
  );

  return (
    <AiAccessContext.Provider value={value}>{children}</AiAccessContext.Provider>
  );
}

export function useAiAccess(): AiAccessContextValue {
  const ctx = useContext(AiAccessContext);
  if (!ctx) {
    return {
      mode: null,
      status: "off",
      keyHint: null,
      saveKey: () =>
        Promise.resolve({ ok: false as const, message: "AI access unavailable." }),
      removeKey: () => Promise.resolve(),
      setMode: () => Promise.resolve(),
      getApiKey: () => Promise.resolve(null),
    };
  }
  return ctx;
}
