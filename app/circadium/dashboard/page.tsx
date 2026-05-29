"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  Glass,
  Caption,
  Button,
  Masthead,
  CategoryBadge,
  CategoryDot,
  vars,
  useCapture,
} from "@/components/ui";
import { TODAY, areaColor } from "../_mock/dashboard";
import {
  page,
  headerRow,
  greeting,
  summaryLine,
  summaryStrong,
  summaryError,
  headerActions,
  gridWrap,
  leftCard,
  leftCardHeader,
  leftCardTitle,
  agendaList,
  agendaRows,
  agendaRow,
  agendaRowNow,
  agendaTimeCol,
  agendaTime,
  agendaTimeNow,
  agendaDur,
  agendaTitle,
  agendaTitleTravel,
  agendaMeta,
  agendaMetaDimmer,
  agendaWarn,
  agendaOverdue,
  agendaChevron,
  rightCol,
  goalsCard,
  goalsHeader,
  goalsTitle,
  goalRow,
  goalHead,
  goalName,
  goalFraction,
  goalTrack,
  goalFill,
  goalFooter,
  goalNext,
} from "./page.css";

export default function DashboardPage() {
  const { setOpen: setCaptureOpen } = useCapture();

  return (
    <div className={page}>
      <Masthead>
        <Caption>Vol. 2026</Caption>
        <Caption>Iss. 148</Caption>
        <Caption>{TODAY.date}</Caption>
        <span style={{ flex: 1 }} />
        <Caption>⌘K capture</Caption>
        <Caption style={{ color: vars.ink }}>Marcus P.</Caption>
      </Masthead>

      <div className={headerRow}>
        <div>
          <h1 className={greeting}>{TODAY.greeting}.</h1>
          <div className={summaryLine}>
            <span className={summaryStrong}>6</span> things on today ·{" "}
            <span className={summaryStrong}>4h 40m</span> planned ·{" "}
            <span className={summaryError}>1 overdue</span> · 1 scheduled past
            deadline
          </div>
        </div>
        <div className={headerActions}>
          <Button variant="glass" onClick={() => setCaptureOpen(true)}>
            ⌘K capture
          </Button>
          <Link href="/calendar">
            <Button variant="solid">Open calendar →</Button>
          </Link>
        </div>
      </div>

      <div className={gridWrap}>
        <div className={leftCard}>
          <div className={agendaList}>
            <div className={leftCardHeader}>
              <div>
                <h2 className={leftCardTitle}>What to do today</h2>
                <Caption style={{ marginTop: 4, display: "inline-block" }}>
                  scheduler order · 6 items · 4h 40m
                </Caption>
              </div>
              <Link href="/calendar">
                <Button variant="glass" size="sm">
                  Full week →
                </Button>
              </Link>
            </div>

            <div className={agendaRows}>
              {TODAY.agenda.map((e, i) => {
                return (
                  <div
                    key={i}
                    className={`${agendaRow} ${e.now ? agendaRowNow : ""}`}
                  >
                    <div className={agendaTimeCol}>
                      <div
                        className={`${agendaTime} ${e.now ? agendaTimeNow : ""}`}
                      >
                        {e.now ? "NOW" : e.time}
                      </div>
                      <div className={agendaDur}>{e.dur}</div>
                    </div>

                    <div>
                      <div
                        className={`${agendaTitle} ${
                          e.travel ? agendaTitleTravel : ""
                        }`}
                      >
                        {e.title}
                      </div>
                      {!e.travel && (
                        <div className={agendaMeta}>
                          {e.area && e.col && (
                            <CategoryBadge color={areaColor[e.col]}>
                              {e.area}
                            </CategoryBadge>
                          )}
                          {e.where && <Caption>{e.where}</Caption>}
                          {e.kind === "plan" && (
                            <Caption className={agendaMetaDimmer}>
                              · fixed
                            </Caption>
                          )}
                          {e.warn && <span className={agendaWarn}>LATE</span>}
                          {e.overdue && (
                            <span className={agendaOverdue}>OVERDUE</span>
                          )}
                        </div>
                      )}
                    </div>

                    <span className={agendaChevron} aria-hidden>
                      <ChevronRight size={16} strokeWidth={2} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className={rightCol}>
          <Glass radius="lg" className={goalsCard}>
            <div className={goalsHeader}>
              <div>
                <h2 className={goalsTitle}>Priority goals</h2>
                <Caption style={{ marginTop: 3, display: "inline-block" }}>
                  progress · next step
                </Caption>
              </div>
              <Caption>{TODAY.goals.length} active</Caption>
            </div>
            {TODAY.goals.map((g, i) => {
              const ac = areaColor[g.col];
              return (
                <div key={i} className={goalRow}>
                  <div className={goalHead}>
                    <CategoryDot color={ac} size={9} />
                    <span className={goalName}>{g.name}</span>
                    <span className={goalFraction}>{g.sub}</span>
                  </div>
                  <div className={goalTrack}>
                    <div
                      className={goalFill}
                      style={{
                        width: `${g.pct}%`,
                        background: `linear-gradient(90deg, ${ac}, color-mix(in srgb, ${ac} 80%, transparent))`,
                      }}
                    />
                  </div>
                  <div className={goalFooter}>
                    <span className={goalNext}>→ {g.next}</span>
                    <Caption style={{ fontSize: 9.5 }}>by {g.dl}</Caption>
                  </div>
                </div>
              );
            })}
          </Glass>
        </div>
      </div>
    </div>
  );
}
