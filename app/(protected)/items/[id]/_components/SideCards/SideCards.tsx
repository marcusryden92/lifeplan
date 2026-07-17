"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { X } from "lucide-react";
import {
  Caption,
  Combobox,
  TypeBadge,
  type ComboboxOption,
} from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { plannerIdFromEventId } from "@/utils/planRecurrence";
import { plannerIsCompleted } from "@/utils/plannerCompletion";
import { getRootParentId } from "@/utils/goalPageHandlers";
import { wouldCreateCycleAddingDependency } from "@/utils/precedence/findCycle";
import { describeCycle } from "@/utils/precedence/describeCycle";
import type { PlannerDependency } from "@/types/prisma";
import { useItem } from "../ItemContext";
import {
  card,
  nextCardHeaderRow,
  nextCardLink,
  nextCardTitle,
  nextCardSub,
  nextCardBody,
  cardSectionTitle,
  whyText,
  depGroupLabel,
  depRow,
  depTitleLink,
  depRemove,
  depPickerRow,
  depError,
  depEmpty,
} from "./SideCards.css";

export function NextOnCalendarCard() {
  const { item } = useItem();
  const { calendar } = useCalendarProvider();

  const next = useMemo(() => {
    const now = Date.now();
    const isGoal = item.plannerType === "goal";
    const candidates = calendar
      .filter((e) => {
        if (plannerIdFromEventId(e.id) === item.id) return true;
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

// Every precedence-ish relation on one card: queue membership, dependency
// edges (with the add picker), and detour hosts. Groups render only when they
// apply; the card disappears entirely for items with nothing to connect.
export function ConnectionsCard() {
  const { item } = useItem();
  const {
    userId,
    planner,
    queues,
    dependencies,
    updateDependencyArray,
    queueByPlannerId,
  } = useCalendarProvider();
  const [error, setError] = useState<string | null>(null);

  const queue = queueByPlannerId.get(item.id);

  const plannerById = useMemo(
    () => new Map(planner.map((p) => [p.id, p])),
    [planner],
  );

  const hosts = useMemo(() => {
    if (item.parentId != null) return [];
    return planner
      .filter((p) => p.linkedItemId === item.id)
      .map((placeholder) => {
        const rootId = getRootParentId(planner, placeholder.id);
        const host = rootId ? planner.find((p) => p.id === rootId) : undefined;
        return { placeholder, host };
      })
      .filter(
        (x): x is { placeholder: (typeof planner)[number]; host: NonNullable<typeof x.host> } =>
          !!x.host,
      );
  }, [planner, item.id, item.parentId]);

  const dependsOn = useMemo(
    () =>
      dependencies
        .filter((d) => d.successorId === item.id)
        .map((d) => ({ edge: d, predecessor: plannerById.get(d.predecessorId) }))
        .filter(
          (x): x is { edge: PlannerDependency; predecessor: NonNullable<typeof x.predecessor> } =>
            !!x.predecessor,
        ),
    [dependencies, item.id, plannerById],
  );

  const requiredBy = useMemo(
    () =>
      dependencies
        .filter((d) => d.predecessorId === item.id)
        .map((d) => ({ edge: d, successor: plannerById.get(d.successorId) }))
        .filter(
          (x): x is { edge: PlannerDependency; successor: NonNullable<typeof x.successor> } =>
            !!x.successor,
        ),
    [dependencies, item.id, plannerById],
  );

  // Candidate filter: root, triaged, task|goal, not self, not already
  // linked either way. Cycle-blocked candidates stay listed but annotated —
  // the commit hard-check refuses them with the path shown.
  const { options, blockedIds } = useMemo(() => {
    const linked = new Set<string>();
    for (const d of dependencies) {
      if (d.successorId === item.id) linked.add(d.predecessorId);
      if (d.predecessorId === item.id) linked.add(d.successorId);
    }
    const base = planner.filter(
      (p) =>
        p.parentId == null &&
        p.isTriaged &&
        (p.plannerType === "task" || p.plannerType === "goal") &&
        p.id !== item.id &&
        !linked.has(p.id) &&
        !plannerIsCompleted(p),
    );
    const blocked = new Set<string>();
    const opts: ComboboxOption<string | null>[] = base
      .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
      .map((p) => {
        const cycle = wouldCreateCycleAddingDependency(
          queues,
          dependencies,
          p.id,
          item.id,
          planner,
        );
        if (cycle) blocked.add(p.id);
        return {
          value: p.id,
          label: cycle
            ? `${p.title || "Untitled"} — would create a loop`
            : p.title || "Untitled",
          searchLabel: p.title ?? undefined,
        };
      });
    return { options: opts, blockedIds: blocked };
  }, [planner, dependencies, queues, item.id]);

  const handleAdd = (predecessorId: string | null) => {
    if (!predecessorId) return;
    const cycle = wouldCreateCycleAddingDependency(
      queues,
      dependencies,
      predecessorId,
      item.id,
      planner,
    );
    if (cycle || blockedIds.has(predecessorId)) {
      setError(
        cycle
          ? `That link would create a loop: ${describeCycle(cycle, planner, queues)}`
          : "That link would create a loop.",
      );
      return;
    }
    setError(null);
    const now = new Date().toISOString();
    updateDependencyArray((prev) =>
      prev.some(
        (d) =>
          d.predecessorId === predecessorId && d.successorId === item.id,
      )
        ? prev
        : [
            ...prev,
            {
              id: uuidv4(),
              predecessorId,
              successorId: item.id,
              userId,
              createdAt: now,
              updatedAt: now,
            },
          ],
    );
  };

  const handleRemove = (edgeId: string) => {
    setError(null);
    updateDependencyArray((prev) => prev.filter((d) => d.id !== edgeId));
  };

  // Dependencies only exist between root-level triaged tasks and goals.
  const canHaveDependencies =
    item.parentId == null &&
    item.isTriaged &&
    (item.plannerType === "task" || item.plannerType === "goal");

  if (!canHaveDependencies && !queue && hosts.length === 0) return null;

  return (
    <div className={card}>
      <div className={nextCardHeaderRow}>
        <span className={cardSectionTitle}>Connections</span>
        <Link href="/graph" className={nextCardLink}>
          Graph →
        </Link>
      </div>

      {queue && (
        <>
          <span className={depGroupLabel}>In queue</span>
          <div className={depRow}>
            <Link href="/queues" className={depTitleLink}>
              {queue.title || "Untitled queue"}
            </Link>
          </div>
        </>
      )}

      {canHaveDependencies && (
        <>
          <span className={depGroupLabel}>Depends on</span>
          {dependsOn.length === 0 ? (
            <div className={depEmpty}>No prerequisites.</div>
          ) : (
            dependsOn.map(({ edge, predecessor }) => (
              <div key={edge.id} className={depRow}>
                <TypeBadge size="sm">{predecessor.plannerType}</TypeBadge>
                <Link
                  href={`/items/${predecessor.id}`}
                  className={depTitleLink}
                >
                  {predecessor.title || "Untitled"}
                </Link>
                <button
                  type="button"
                  className={depRemove}
                  onClick={() => handleRemove(edge.id)}
                  aria-label={`Remove dependency on ${predecessor.title || "item"}`}
                >
                  <X size={12} strokeWidth={2.2} />
                </button>
              </div>
            ))
          )}
          <div className={depPickerRow}>
            <Combobox
              value={null}
              options={options}
              onChange={handleAdd}
              placeholder="Add prerequisite…"
              ariaLabel="Add prerequisite"
              maxWidth="100%"
            />
          </div>
          {error && <div className={depError}>{error}</div>}

          {requiredBy.length > 0 && (
            <>
              <span className={depGroupLabel}>Required by</span>
              {requiredBy.map(({ edge, successor }) => (
                <div key={edge.id} className={depRow}>
                  <TypeBadge size="sm">{successor.plannerType}</TypeBadge>
                  <Link href={`/items/${successor.id}`} className={depTitleLink}>
                    {successor.title || "Untitled"}
                  </Link>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {hosts.length > 0 && (
        <>
          <span className={depGroupLabel}>Linked into</span>
          <div className={whyText}>
            This item&apos;s work is spliced into the sequence of:
          </div>
          {hosts.map(({ placeholder, host }) => (
            <div key={placeholder.id} className={depRow}>
              <TypeBadge size="sm">{host.plannerType}</TypeBadge>
              <Link href={`/items/${host.id}`} className={depTitleLink}>
                {host.title || "Untitled"}
              </Link>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
