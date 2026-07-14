"use client";

import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Kbd, Loader, Switch, vars } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { usePlatform } from "@/hooks/usePlatform";
import { reorderQueueMember } from "@/utils/queue-handlers/mutateQueueMembers";
import { wouldCreateCycleAddingDependency } from "@/utils/precedence/findCycle";
import { describeCycle } from "@/utils/precedence/describeCycle";
import {
  buildRootSpans,
  buildGraphLanes,
  layoutGraph,
  ZOOM_MIN_PX_PER_DAY,
  ZOOM_MAX_PX_PER_DAY,
  type GraphTickUnits,
} from "./_lib/graphModel";
import { GraphCanvas } from "./_components/GraphCanvas";
import { MarkerMenu } from "./_components/MarkerMenu";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  headerControls,
  controlGroup,
  controlLabel,
  zoomSlider,
  legendRow,
  legendItem,
  legendKeys,
  kbdHint,
  errorBanner,
  canvasCard,
  emptyMain,
} from "./page.css";

// Logarithmic zoom: slider 0..100 maps to the model's px-per-day range, so
// each step feels proportionally the same at both ends.
const zoomToPxPerDay = (t: number): number =>
  Math.round(
    ZOOM_MIN_PX_PER_DAY *
      Math.pow(ZOOM_MAX_PX_PER_DAY / ZOOM_MIN_PX_PER_DAY, t / 100),
  );

// Roughly 30 px/day on the 6..960 log range.
const DEFAULT_ZOOM = 32;

function LegendSwatch({
  dashed,
  arrow,
  color,
  opacity,
}: {
  dashed?: boolean;
  arrow?: boolean;
  color: string;
  opacity?: number;
}) {
  return (
    <svg width={26} height={10} aria-hidden>
      <line
        x1={0}
        y1={5}
        x2={arrow ? 18 : 26}
        y2={5}
        style={{
          stroke: color,
          strokeOpacity: opacity ?? 1,
          strokeWidth: 1.5,
          strokeDasharray: dashed ? "4 3" : undefined,
        }}
      />
      {arrow && (
        <path
          d="M 25 5 l -7 -4 l 0 8 z"
          style={{ fill: color, fillOpacity: opacity ?? 1 }}
        />
      )}
    </svg>
  );
}

export default function GraphPage() {
  const {
    userId,
    isLoaded,
    planner,
    categories,
    queues,
    dependencies,
    calendar,
    weekStartDay,
    queueCategoryByRootId,
    updateQueueArray,
    updateDependencyArray,
  } = useCalendarProvider();

  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [showCompleted, setShowCompleted] = useState(false);
  const [hoverLabels, setHoverLabels] = useState(true);
  const [markers, setMarkers] = useState<GraphTickUnits>({
    hour: true,
    day: true,
    week: true,
    month: true,
  });
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const { modKey } = usePlatform();
  const pxPerDay = zoomToPxPerDay(zoom);

  const handleZoomDelta = useCallback((delta: number) => {
    setZoom((prev) => Math.max(0, Math.min(100, prev + delta)));
  }, []);

  const spans = useMemo(
    () => buildRootSpans(calendar, planner),
    [calendar, planner],
  );
  const lanes = useMemo(
    () =>
      buildGraphLanes({
        planner,
        queues,
        dependencies,
        categories,
        spans,
        showCompleted,
      }),
    [planner, queues, dependencies, categories, spans, showCompleted],
  );
  const layout = useMemo(
    () => layoutGraph(lanes, { pxPerDay, now }),
    [lanes, pxPerDay, now],
  );
  const nodeCount = useMemo(
    () => lanes.reduce((sum, lane) => sum + lane.nodes.length, 0),
    [lanes],
  );

  const handleAddDependency = (predecessorId: string, successorId: string) => {
    const cycle = wouldCreateCycleAddingDependency(
      queues,
      dependencies,
      predecessorId,
      successorId,
      planner,
    );
    if (cycle) {
      setCycleError(
        `That link would create a loop: ${describeCycle(cycle, planner, queues)}`,
      );
      return;
    }
    setCycleError(null);
    const nowIso = new Date().toISOString();
    updateDependencyArray((prev) =>
      prev.some(
        (d) =>
          d.predecessorId === predecessorId && d.successorId === successorId,
      )
        ? prev
        : [
            ...prev,
            {
              id: uuidv4(),
              predecessorId,
              successorId,
              userId,
              createdAt: nowIso,
              updatedAt: nowIso,
            },
          ],
    );
  };

  const handleRemoveDependency = (edgeId: string) => {
    setCycleError(null);
    updateDependencyArray((prev) => prev.filter((d) => d.id !== edgeId));
  };

  const handleReorderMember = (
    queueId: string,
    plannerId: string,
    toIndex: number,
  ) => {
    const result = reorderQueueMember({
      queues,
      dependencies,
      queueId,
      plannerId,
      toIndex,
      planner,
    });
    if (!result.ok) {
      setCycleError(
        `That order would create a loop: ${describeCycle(result.cycle, planner, queues)}`,
      );
      return;
    }
    setCycleError(null);
    updateQueueArray(result.queues);
  };

  const hasAnything = nodeCount > 0 || queues.length > 0;

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Graph</h1>
        <span className={titleSummary}>
          {queues.length} queue{queues.length === 1 ? "" : "s"} ·{" "}
          {dependencies.length} dependenc
          {dependencies.length === 1 ? "y" : "ies"} · {nodeCount} item
          {nodeCount === 1 ? "" : "s"}
        </span>
        <div className={headerControls}>
          <MarkerMenu value={markers} onChange={setMarkers} />
          <div className={controlGroup}>
            <span className={controlLabel}>Hover labels</span>
            <Switch
              checked={hoverLabels}
              onCheckedChange={setHoverLabels}
              aria-label="Show item names on hover"
            />
          </div>
          <div className={controlGroup}>
            <span className={controlLabel}>Show completed</span>
            <Switch
              checked={showCompleted}
              onCheckedChange={setShowCompleted}
              aria-label="Show completed items"
            />
          </div>
          <div className={controlGroup}>
            <span className={controlLabel}>Zoom</span>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={zoomSlider}
              aria-label="Zoom timeline"
            />
          </div>
        </div>
      </div>

      <div className={legendRow}>
        <span className={legendItem}>
          <LegendSwatch color={vars.muted} arrow opacity={0.75} />
          dependency
        </span>
        <span className={legendItem}>
          <LegendSwatch color={vars.status.error} dashed arrow opacity={0.8} />
          out of order
        </span>
        <span className={legendKeys}>
          <span className={kbdHint}>
            <Kbd>scroll</Kbd>
            pan
          </span>
          <span className={kbdHint}>
            <Kbd>shift</Kbd>
            <Kbd>scroll</Kbd>
            vertical
          </span>
          <span className={kbdHint}>
            <Kbd>{modKey}</Kbd>
            <Kbd>scroll</Kbd>
            zoom
          </span>
        </span>
      </div>

      {cycleError && <div className={errorBanner}>{cycleError}</div>}

      <div className={canvasCard}>
        {!isLoaded ? (
          <div className={emptyMain}>
            <Loader size="md" label="Loading graph" />
          </div>
        ) : !hasAnything ? (
          <div className={emptyMain}>
            Nothing to map yet — goals, queues, and dependencies show up here as
            a timeline of what happens when.
          </div>
        ) : (
          <GraphCanvas
            layout={layout}
            weekStartDay={weekStartDay}
            markers={markers}
            planner={planner}
            queues={queues}
            dependencies={dependencies}
            categories={categories}
            queueCategoryByRootId={queueCategoryByRootId}
            onAddDependency={handleAddDependency}
            onRemoveDependency={handleRemoveDependency}
            onReorderMember={handleReorderMember}
            onLinkRefused={setCycleError}
            hoverLabels={hoverLabels}
            onZoomDelta={handleZoomDelta}
          />
        )}
      </div>
    </div>
  );
}
