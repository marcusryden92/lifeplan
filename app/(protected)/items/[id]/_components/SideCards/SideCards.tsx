"use client";

import { useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Caption, ConicDot } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useItem } from "../ItemContext";
import { AI_ACTIONS } from "../../_constants";
import {
  card,
  nextCardHeaderRow,
  nextCardLink,
  nextCardTitle,
  nextCardSub,
  nextCardBody,
  cardHeaderRow,
  cardSectionTitle,
  helperPill,
  helperPillRow,
  helperSuggestion,
  whyText,
} from "./SideCards.css";

export function NextOnCalendarCard() {
  const { item } = useItem();
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

  return (
    <div className={card}>
      <div className={nextCardHeaderRow}>
        <span className={cardSectionTitle}>Next on calendar</span>
        <Link href="/calendar" className={nextCardLink}>
          View calendar →
        </Link>
      </div>
      <div className={nextCardBody}>
        {next ? (
          <>
            <div className={nextCardTitle}>
              {format(new Date(next.start), "EEE")} ·{" "}
              {format(new Date(next.start), "HH:mm")}
            </div>
            <div className={nextCardSub}>
              {next.title} ·{" "}
              {Math.round(
                (new Date(next.end).getTime() -
                  new Date(next.start).getTime()) /
                  60000,
              )}
              m
            </div>
          </>
        ) : (
          <Caption>Not scheduled yet.</Caption>
        )}
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
