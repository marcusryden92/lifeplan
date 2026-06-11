"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Button, Caption, ConicDot } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useItem } from "./ItemContext";
import {
  card,
  nextCard,
  nextCardLabel,
  nextCardTitle,
  nextCardSub,
  nextCardActions,
  cardHeaderRow,
  cardSectionTitle,
  helperPill,
  helperPillRow,
  helperSuggestion,
  whyText,
} from "./SideCards.css";

const AI_ACTIONS = ["estimate", "split", "tighten", "add taper"];

export function NextOnCalendarCard() {
  const { item, category } = useItem();
  const { calendar } = useCalendarProvider();

  const next = useMemo(() => {
    const now = Date.now();
    const isGoal = item.plannerType === "goal";
    const candidates = calendar
      .filter((e) => {
        if (e.id === item.id) return true;
        if (!isGoal) return false;
        const ext = e.extendedProps as { parentId?: string | null } | undefined;
        return ext?.parentId === item.id;
      })
      .filter((e) => new Date(e.start).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.start).getTime() - new Date(b.start).getTime(),
      );
    return candidates[0];
  }, [calendar, item.id, item.plannerType]);

  const accent = category?.color ?? "var(--lumen-accent-primary, #3b82f6)";

  if (!next) {
    return (
      <div className={card}>
        <div className={cardHeaderRow}>
          <span className={cardSectionTitle}>Next on calendar</span>
        </div>
        <Caption>Not scheduled yet.</Caption>
      </div>
    );
  }

  const start = new Date(next.start);
  const end = new Date(next.end);
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);

  return (
    <div
      className={nextCard}
      style={{
        background: `color-mix(in srgb, ${accent} 14%, transparent)`,
        border: `1px solid color-mix(in srgb, ${accent} 38%, transparent)`,
      }}
    >
      <span className={nextCardLabel}>
        <Caption>Next on calendar</Caption>
      </span>
      <div className={nextCardTitle}>
        {format(start, "EEE")} · {format(start, "HH:mm")}
      </div>
      <div className={nextCardSub}>
        {next.title} · {durationMin}m
      </div>
      <div className={nextCardActions}>
        <Link href="/circadium/calendar">
          <Button variant="glass" size="sm">
            View calendar
          </Button>
        </Link>
      </div>
    </div>
  );
}

export function AIHelperCard() {
  return (
    <div className={card}>
      <div className={cardHeaderRow}>
        <ConicDot size={12} />
        <span className={cardSectionTitle}>AI helper</span>
        <span style={{ marginLeft: "auto" }}>
          <Caption>scoped</Caption>
        </span>
      </div>
      <div className={helperSuggestion}>
        Tighten last 2 weeks · add taper
      </div>
      <div className={helperPillRow}>
        {AI_ACTIONS.map((a) => (
          <span key={a} className={helperPill}>
            ✦ {a}
          </span>
        ))}
      </div>
    </div>
  );
}

export function EngineNotesCard() {
  return (
    <div className={card}>
      <Caption>Engine notes</Caption>
      <div className={whyText}>
        No engine messages for this item yet. Regenerate the calendar to see
        scheduler feedback here.
      </div>
    </div>
  );
}

export function WhyTheseSubtasksCard() {
  const { item } = useItem();
  if (item.plannerType !== "goal") return null;
  return (
    <div className={card}>
      <Caption>Why these subtasks</Caption>
      <div className={whyText}>
        Once the subtask breakdown is settled, the engine will surface its
        reasoning here — sequencing decisions, dependency hints, and any
        re-shuffles caused by deadline pressure.
      </div>
    </div>
  );
}
