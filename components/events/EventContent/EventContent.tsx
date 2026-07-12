// EventContent.tsx
import { Check, ArrowRight, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { floorMinutes } from "@/utils/calendarUtils";
import EventPopover from "../EventPopover";
import EventWrapper from "../EventWrapper";
import { EventImpl } from "@fullcalendar/core/internal";
import {
  handleClickCompleteTask,
  handleClickDelete,
  handlePostponeTask,
  applyOccurrenceDelete,
  applySeriesDelete,
  applyOccurrenceMove,
  applySeriesMove,
  applyEventResize,
  applyEventStartEdit,
} from "@/utils/calendarEventHandlers";
import {
  occurrenceKeyFromEventId,
  plannerIdFromEventId,
  planIsRecurring,
  hasMovedException,
} from "@/utils/planRecurrence";
import {
  isChunkEventId,
  isCompletedSegmentEventId,
} from "@/utils/taskSplitting";
import { RecurrenceScopeModal } from "../RecurrenceScopeModal";
import { PlannerType } from "@/types/prisma";
import { hoverActions, actionGroup, iconButton } from "./EventContent.css";

interface EventContentProps {
  event: EventImpl;
}

const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const { planner, updateAll, updatePlannerArray, calendar, userSettings } =
    useCalendarProvider();
  const isMobile = useIsMobile();
  const { plannerType, parentId, completedStartTime, completedEndTime } =
    event.extendedProps;
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [onHover, setOnHover] = useState<boolean>(false);
  const [showDeleteScope, setShowDeleteScope] = useState<boolean>(false);
  const [pendingMoveScope, setPendingMoveScope] = useState<{
    newStart: Date;
    deltaMs: number;
  } | null>(null);

  // Completion is derived from the event data; the override only bridges the
  // gap between the optimistic click and the regen/sync confirming it. State
  // seeded once from props would go stale when the event updates in place.
  // FullCalendar recycles these components across regens, so the override must
  // also reset when the instance starts rendering a DIFFERENT event — without
  // the event.id dep, completing a chunk marked whatever event inherited the
  // recycled instance (usually the neighbor) as completed too.
  const propsCompleted = !!(completedStartTime && completedEndTime);
  const [optimisticCompleted, setOptimisticCompleted] = useState<
    boolean | null
  >(null);
  const isCompleted = optimisticCompleted ?? propsCompleted;

  useEffect(() => {
    setOptimisticCompleted(null);
  }, [event.id, propsCompleted]);

  if (!event.start || !event.end) return null;

  const currentTime = new Date();
  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const red = userSettings.styles.events.errorColor;

  const displayPostponeButton =
    !isCompleted && floorMinutes(currentTime) > floorMinutes(startTime);

  const occurrenceKey = occurrenceKeyFromEventId(event.id);
  const occurrencePlanId =
    occurrenceKey !== null ? plannerIdFromEventId(event.id) : null;
  const occurrencePlan = occurrencePlanId
    ? planner.find((p) => p.id === occurrencePlanId)
    : undefined;
  const isRecurringOccurrence =
    !!occurrencePlan && planIsRecurring(occurrencePlan);

  const onDelete = () => {
    if (isRecurringOccurrence) {
      // An already-customized occurrence skips the prompt — deleting a moved
      // one-off always means "just this one".
      if (
        occurrencePlanId &&
        occurrenceKey !== null &&
        hasMovedException(occurrencePlan.recurrenceExceptions, occurrenceKey)
      ) {
        applyOccurrenceDelete(
          updateAll,
          occurrencePlanId,
          occurrenceKey,
          event.id,
        );
        setShowPopover(false);
        return;
      }
      setShowPopover(false);
      setShowDeleteScope(true);
      return;
    }
    handleClickDelete(
      event,
      elementRef,
      calendar,
      updateAll,
      plannerType as string,
      (parentId as string) ?? null,
      red,
      setShowPopover,
    );
  };

  const onComplete = () => {
    handleClickCompleteTask(
      event,
      isCompleted,
      (value) =>
        setOptimisticCompleted(
          typeof value === "function" ? value(isCompleted) : value,
        ),
      planner,
      calendar,
      updateAll,
    );
  };

  const onPostpone = () => handlePostponeTask(event, calendar, updateAll);

  // Engine-materialized slices of a split task: a form "end" edit would write
  // the chunk's length into the task's total duration.
  const isDerivedSlice =
    isChunkEventId(event.id) || isCompletedSegmentEventId(event.id);
  const canEditEnd =
    !isCompleted && !isDerivedSlice && !event.extendedProps.isTemplateItem;
  // Task/goal starts are engine-placed; only plans anchor their own start.
  const canEditStart = canEditEnd && plannerType === PlannerType.plan;

  // Duration change for tasks/goals triggers an inline engine regen, so the
  // tile may legitimately re-place to a new slot after the edit.
  const onEditEndTime = (newEnd: Date) => {
    if (!event.start) return;
    applyEventResize(updateAll, event.id, new Date(event.start), newEnd);
  };

  const onEditStartTime = (newStart: Date) => {
    if (!event.start) return;
    if (isRecurringOccurrence && occurrencePlanId && occurrenceKey !== null) {
      // An already-customized occurrence skips the prompt — moving a moved
      // one-off always means "just this one".
      if (hasMovedException(occurrencePlan.recurrenceExceptions, occurrenceKey)) {
        applyOccurrenceMove(
          updatePlannerArray,
          occurrencePlanId,
          occurrenceKey,
          newStart,
        );
        return;
      }
      setShowPopover(false);
      setPendingMoveScope({
        newStart,
        deltaMs: newStart.getTime() - new Date(event.start).getTime(),
      });
      return;
    }
    applyEventStartEdit(updatePlannerArray, event.id, newStart);
  };

  return (
    <EventWrapper
      event={event}
      elementRef={elementRef}
      elementHeight={elementHeight}
      elementWidth={elementWidth}
      setElementHeight={setElementHeight}
      setElementWidth={setElementWidth}
      setOnHover={setOnHover}
      setEventRect={setEventRect}
      isCompleted={isCompleted}
      showPopover={showPopover}
      setShowPopover={setShowPopover}
    >
      {/* Touch taps fire an emulated mouseenter, so without the gate these
          would appear on tap and linger — mobile gets the bottom sheet. */}
      {!isMobile &&
        onHover &&
        elementHeight > 40 &&
        elementWidth > 70 &&
        !event.extendedProps.isTemplateItem && (
          <div className={hoverActions}>
            <button onClick={onDelete} className={iconButton} aria-label="Delete">
              <Trash2 size={14} strokeWidth={2} />
            </button>
            <div className={actionGroup}>
              {(event.extendedProps.plannerType === PlannerType.goal ||
                event.extendedProps.plannerType === PlannerType.task) && (
                <>
                  <button
                    onClick={onComplete}
                    className={iconButton}
                    aria-label="Complete"
                  >
                    <Check size={14} strokeWidth={2.2} />
                  </button>
                  <button
                    disabled={!displayPostponeButton}
                    onClick={onPostpone}
                    className={iconButton}
                    aria-label="Postpone"
                  >
                    <ArrowRight size={14} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          </div>
        )}

      {showPopover && eventRect && (
        <EventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          isCompleted={isCompleted}
          displayPostponeButton={displayPostponeButton}
          onClose={() => setShowPopover(false)}
          onDelete={onDelete}
          onComplete={onComplete}
          onPostpone={onPostpone}
          onEditStartTime={canEditStart ? onEditStartTime : undefined}
          onEditEndTime={canEditEnd ? onEditEndTime : undefined}
          setShowPopover={setShowPopover}
        />
      )}

      {isRecurringOccurrence && (
        <RecurrenceScopeModal
          open={showDeleteScope}
          mode="delete"
          planTitle={occurrencePlan.title}
          onThisOccurrence={() => {
            if (occurrencePlanId && occurrenceKey !== null) {
              applyOccurrenceDelete(
                updateAll,
                occurrencePlanId,
                occurrenceKey,
                event.id,
              );
            }
            setShowDeleteScope(false);
          }}
          onAllOccurrences={() => {
            if (occurrencePlanId) {
              applySeriesDelete(updateAll, occurrencePlanId);
            }
            setShowDeleteScope(false);
          }}
          onCancel={() => setShowDeleteScope(false)}
        />
      )}

      {isRecurringOccurrence && (
        <RecurrenceScopeModal
          open={pendingMoveScope !== null}
          mode="move"
          planTitle={occurrencePlan.title}
          onThisOccurrence={() => {
            if (pendingMoveScope && occurrencePlanId && occurrenceKey !== null) {
              applyOccurrenceMove(
                updatePlannerArray,
                occurrencePlanId,
                occurrenceKey,
                pendingMoveScope.newStart,
              );
            }
            setPendingMoveScope(null);
          }}
          onAllOccurrences={() => {
            if (pendingMoveScope && occurrencePlanId) {
              applySeriesMove(
                updatePlannerArray,
                occurrencePlanId,
                pendingMoveScope.deltaMs,
              );
            }
            setPendingMoveScope(null);
          }}
          onCancel={() => setPendingMoveScope(null)}
        />
      )}
    </EventWrapper>
  );
};

export default EventContent;
