"use client";

import { Search, Sparkles } from "lucide-react";
import { useSearch } from "../SearchContext";
import { useAssistant } from "../AssistantContext";
import { searchButton, assistantButton } from "./CornerActions.css";

export function CornerActions() {
  const { setOpen: setSearchOpen } = useSearch();
  const { openAssistant } = useAssistant();

  return (
    <>
      <button
        type="button"
        className={searchButton}
        onClick={() => setSearchOpen(true)}
        title="Search (Ctrl/Cmd+J)"
        aria-label="Search"
      >
        <Search size={19} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        className={assistantButton}
        onClick={() => openAssistant()}
        title="AI assistant (Ctrl/Cmd+I)"
        aria-label="AI assistant"
      >
        <Sparkles size={20} strokeWidth={2} aria-hidden />
      </button>
    </>
  );
}
