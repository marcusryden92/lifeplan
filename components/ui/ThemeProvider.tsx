"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { lumenLight, lumenDark, vars, type ThemeVars } from "@/lib/theme";

export type ThemeName = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeName;
  dark: boolean;
  toggle: () => void;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "lumen.dark";

type UserVarOverrides = Parameters<typeof assignInlineVars<ThemeVars>>[1];

type ThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: ThemeName;
  userVars?: UserVarOverrides;
};

export function ThemeProvider({
  children,
  defaultTheme = "light",
  userVars,
}: ThemeProviderProps) {
  const [dark, setDark] = useState(defaultTheme === "dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setDark(true);
      else if (stored === "0") setDark(false);
    } catch {
      // localStorage unavailable; keep default
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, dark ? "1" : "0");
    } catch {
      // ignore
    }
  }, [dark, hydrated]);

  useEffect(() => {
    const body = document.body;
    const next = dark ? lumenDark : lumenLight;
    body.classList.remove(lumenLight, lumenDark);
    body.classList.add(next);
    return () => {
      body.classList.remove(next);
    };
  }, [dark]);

  const toggle = useCallback(() => setDark((d) => !d), []);
  const setTheme = useCallback(
    (t: ThemeName) => setDark(t === "dark"),
    [],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: dark ? "dark" : "light",
      dark,
      toggle,
      setTheme,
    }),
    [dark, toggle, setTheme],
  );

  const themeClass = dark ? lumenDark : lumenLight;

  const overrideStyle: CSSProperties | undefined = useMemo(() => {
    if (!userVars) return undefined;
    return assignInlineVars(vars, userVars) as CSSProperties;
  }, [userVars]);

  return (
    <ThemeContext.Provider value={value}>
      <div
        className={themeClass}
        data-theme={dark ? "dark" : "light"}
        style={{ display: "contents", ...overrideStyle }}
        suppressHydrationWarning
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  return {
    theme: "light",
    dark: false,
    toggle: () => {},
    setTheme: () => {},
  };
}
