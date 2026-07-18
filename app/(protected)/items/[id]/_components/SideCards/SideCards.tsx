"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { X } from "lucide-react";
import {
  Button,
  Caption,
  Combobox,
  ConfirmModal,
  TypeBadge,
  type ComboboxOption,
} from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import {
  buildDemoteLossManifest,
  demoteRootIntoGoal,
} from "@/utils/goal-handlers/demoteRootIntoGoal";
import { DependencyPickerModal } from "../DependencyPickerModal";
import { plannerIdFromEventId } from "@/utils/planRecurrence";
import { getRootParentId } from "@/utils/goalPageHandlers";
import { isValidDependencyEndpoint } from "@/utils/precedence/endpoints";
import { wouldCreateCycleAddingNodeDependency } from "@/utils/precedence/findCycle";
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

  // Ids already linked either way — hidden from the picker.
  const linkedIds = useMemo(() => {
    const linked = new Set<string>();
    for (const d of dependencies) {
      if (d.successorId === item.id) linked.add(d.predecessorId);
      if (d.predecessorId === item.id) linked.add(d.successorId);
    }
    return linked;
  }, [dependencies, item.id]);

  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAdd = (predecessorId: string | null) => {
    if (!predecessorId) return;
    // Commit-time hard check — the picker ghosts prohibited options, but the
    // add must stand on its own.
    const refusal = wouldCreateCycleAddingNodeDependency(
      planner,
      queues,
      dependencies,
      predecessorId,
      item.id,
    );
    if (refusal === "same-root") {
      setError("Same goal — order is set by the list.");
      return;
    }
    if (refusal) {
      setError(
        `That link would create a loop: ${describeCycle(refusal, planner, queues)}`,
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

  // Dependencies exist between any non-plan nodes whose structural roots are
  // triaged — subtasks included (node-level edges).
  const canHaveDependencies = isValidDependencyEndpoint(plannerById, item.id);

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
            <Button
              variant="glass"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              Add prerequisite…
            </Button>
          </div>
          {error && <div className={depError}>{error}</div>}
          <DependencyPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            anchor={item}
            planner={planner}
            queues={queues}
            dependencies={dependencies}
            linkedIds={linkedIds}
            onPick={handleAdd}
          />

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

const joinTitles = (titles: string[]): string =>
  titles.map((t) => `"${t}"`).join(", ");

// Demote entry point: nest this top-level item as a subtask of another goal.
// The confirm enumerates everything the thunk's central pruning will drop —
// the helper itself never prunes.
export function NestIntoGoalCard() {
  const { item } = useItem();
  const { planner, queues, dependencies, updatePlannerArray } =
    useCalendarProvider();
  const router = useRouter();
  const [pendingTargetId, setPendingTargetId] = useState<string | null>(null);
  const [demoteError, setDemoteError] = useState<string | null>(null);

  const eligible =
    item.parentId == null && item.isTriaged && item.plannerType !== "plan";

  const targetOptions = useMemo<ComboboxOption<string | null>[]>(
    () =>
      planner
        .filter(
          (p) =>
            p.parentId == null &&
            p.isTriaged &&
            p.plannerType === "goal" &&
            p.id !== item.id,
        )
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""))
        .map((p) => ({
          value: p.id,
          label: p.title || "Untitled",
          searchLabel: p.title ?? undefined,
        })),
    [planner, item.id],
  );

  const manifest = useMemo(
    () =>
      pendingTargetId
        ? buildDemoteLossManifest(planner, queues, dependencies, item.id)
        : null,
    [pendingTargetId, planner, queues, dependencies, item.id],
  );

  if (!eligible || targetOptions.length === 0) return null;

  const pendingTarget = pendingTargetId
    ? planner.find((p) => p.id === pendingTargetId)
    : undefined;
  const dropsAnything =
    !!manifest &&
    (manifest.queueTitle !== null || manifest.inboundHostTitles.length > 0);

  const confirmDemote = () => {
    if (!pendingTargetId) return;
    const result = demoteRootIntoGoal(
      planner,
      item.id,
      pendingTargetId,
      queues,
      dependencies,
    );
    setPendingTargetId(null);
    if (!Array.isArray(result)) {
      setDemoteError(result.error);
      return;
    }
    setDemoteError(null);
    updatePlannerArray(result);
    router.push(`/items/${pendingTargetId}/subtasks`);
  };

  return (
    <div className={card}>
      <span className={cardSectionTitle}>Nest under a goal</span>
      <div className={whyText}>
        Move this item and everything under it inside another goal. It stops
        being its own top-level item.
      </div>
      <div className={depPickerRow}>
        <Combobox
          value={null}
          options={targetOptions}
          onChange={(id) => id && setPendingTargetId(id)}
          placeholder="Nest under…"
          ariaLabel="Nest under a goal"
          maxWidth="100%"
        />
      </div>
      {demoteError && <div className={depError}>{demoteError}</div>}

      <ConfirmModal
        open={pendingTargetId !== null}
        title="Nest under goal"
        body={
          <>
            <div>
              <strong>{item.title}</strong> becomes a subtask of{" "}
              <strong>{pendingTarget?.title || "Untitled"}</strong>, adopting
              that goal&apos;s category and readiness.
            </div>
            {manifest?.queueTitle && (
              <div>
                It leaves the <strong>{manifest.queueTitle}</strong> queue.
              </div>
            )}
            {manifest && manifest.dependsOnTitles.length > 0 && (
              <div>
                It keeps waiting for {joinTitles(manifest.dependsOnTitles)}.
              </div>
            )}
            {manifest && manifest.requiredByTitles.length > 0 && (
              <div>
                {joinTitles(manifest.requiredByTitles)} still wait
                {manifest.requiredByTitles.length === 1 ? "s" : ""} for it,
                now as part of the new goal.
              </div>
            )}
            {manifest && manifest.inboundHostTitles.length > 0 && (
              <div>
                Links into it from {joinTitles(manifest.inboundHostTitles)} are
                removed.
              </div>
            )}
            {manifest && manifest.outboundTargetTitles.length > 0 && (
              <div>
                Its links to {joinTitles(manifest.outboundTargetTitles)} stay,
                but now run in the new goal&apos;s order.
              </div>
            )}
            {dropsAnything && (
              <div>
                Dropped connections cannot be restored by promoting it back
                later.
              </div>
            )}
          </>
        }
        confirmLabel="Nest"
        cancelLabel="Cancel"
        onCancel={() => setPendingTargetId(null)}
        onConfirm={confirmDemote}
      />
    </div>
  );
}
