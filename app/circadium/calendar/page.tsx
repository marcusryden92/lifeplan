"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";
import { format } from "date-fns";
import {
  Glass,
  Caption,
  Button,
  Masthead,
  ConicDot,
  vars,
} from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { getWeekFirstDate, shiftDate } from "@/utils/calendarUtils";
import Calendar from "@/app/(protected)/calendar/components/Calendar";
import { ENGINE_MSGS, ENGINE_SUMMARY, type EngineTone } from "../_mock/calendar";
import "./fullcalendar.css";
import {
  page,
  subHeader,
  rangeTitle,
  navCluster,
  spacer,
  actionCluster,
  mainGrid,
  calendarCard,
  engineCol,
  engineHeader,
  engineHeaderRow,
  engineTitle,
  engineSpacer,
  engineSummary,
  engineList,
  engineCard,
  engineCardHead,
  engineTag,
  engineCardTitle,
  engineCardBody,
  fcWrap,
} from "./page.css";

function toneColor(tone: EngineTone) {
  switch (tone) {
    case "fail":
      return vars.status.error;
    case "warn":
      return vars.status.warning;
    case "done":
      return vars.status.success;
    case "info":
    default:
      return vars.status.info;
  }
}

export default function CalendarPage() {
  const { weekStartDay, manuallyRefreshCalendar } = useCalendarProvider();
  const [initialDate, setInitialDate] = useState<Date>(() =>
    getWeekFirstDate(weekStartDay, new Date()),
  );

  const finalDate = shiftDate(initialDate, 6);
  const range = `${format(initialDate, "MMM d")} – ${format(finalDate, "MMM d")}`;

  const goPrev = () => setInitialDate((d) => shiftDate(d, -7));
  const goNext = () => setInitialDate((d) => shiftDate(d, 7));
  const goToday = () =>
    setInitialDate(getWeekFirstDate(weekStartDay, new Date()));

  return (
    <div className={page}>
      <Masthead>
        <Caption>Vol. 2026</Caption>
        <Caption>Iss. 148</Caption>
        <Caption>{range}</Caption>
        <span style={{ flex: 1 }} />
        <Caption>⌘K capture</Caption>
        <Caption style={{ color: vars.ink }}>Marcus P.</Caption>
      </Masthead>

      <div className={subHeader}>
        <h1 className={rangeTitle}>{range}</h1>
        <div className={navCluster}>
          <Button
            variant="glass"
            size="sm"
            onClick={goPrev}
            aria-label="Previous week"
          >
            <ChevronLeft size={14} strokeWidth={2} />
          </Button>
          <Button variant="glass" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={goNext}
            aria-label="Next week"
          >
            <ChevronRight size={14} strokeWidth={2} />
          </Button>
        </div>
        <span className={spacer} />
        <div className={actionCluster}>
          <Button variant="glass" size="sm">
            Filters · all
          </Button>
          <Button variant="glass" size="sm">
            Week ▾
          </Button>
          <Button variant="solid" size="sm" onClick={manuallyRefreshCalendar}>
            <RotateCw size={13} strokeWidth={2.4} />
            Regenerate
          </Button>
        </div>
      </div>

      <div className={mainGrid}>
        <div className={calendarCard}>
          <div className={`${fcWrap} lumen-calendar`}>
            <Calendar initialDate={initialDate} />
          </div>
        </div>

        <div className={engineCol}>
          <Glass radius="lg" className={engineHeader}>
            <div className={engineHeaderRow}>
              <ConicDot size={10} />
              <span className={engineTitle}>Engine</span>
              <Caption className={engineSpacer}>
                last run · {ENGINE_SUMMARY.lastRun}
              </Caption>
            </div>
            <div className={engineSummary}>
              {ENGINE_SUMMARY.failCount} fail · {ENGINE_SUMMARY.warnCount} warn ·{" "}
              {ENGINE_SUMMARY.placedCount} placed across the week
            </div>
          </Glass>

          <div className={engineList}>
            {ENGINE_MSGS.map((m, i) => {
              const tc = toneColor(m.tone);
              const showFix = m.tone === "fail" || m.tone === "warn";
              return (
                <Glass key={i} radius="lg" className={engineCard}>
                  <div className={engineCardHead}>
                    <span className={engineTag} style={{ background: tc }}>
                      {m.tag}
                    </span>
                    <span className={engineCardTitle}>{m.title}</span>
                  </div>
                  <div className={engineCardBody}>{m.body}</div>
                  {showFix && (
                    <div style={{ marginTop: 8 }}>
                      <Button variant="glass" size="sm">
                        See fixes →
                      </Button>
                    </div>
                  )}
                </Glass>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
