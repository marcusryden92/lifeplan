// EventContent.tsx
import { Check, ArrowRight, Trash2 } from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";
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
} from "@/utils/calendarEventHandlers";
import {
  occurrenceKeyFromEventId,
  plannerIdFromEventId,
  planIsRecurring,
  hasMovedException,
} from "@/utils/planRecurrence";
import { RecurrenceScopeModal } from "../RecurrenceScopeModal";
import { PlannerType } from "@/types/prisma";
import { hoverActions, actionGroup, iconButton } from "./EventContent.css";

interface EventContentProps {
  event: EventImpl;
}

const EventContent: React.FC<EventContentProps> = ({ event }) => {
  const { planner, updateAll, calendar, userSettings } = useCalendarProvider();
  const { plannerType, parentId, completedStartTime, completedEndTime } =
    event.extendedProps;
  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [onHover, setOnHover] = useState<boolean>(false);
  const [showDeleteScope, setShowDeleteScope] = useState<boolean>(false);

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
      {onHover &&
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
    </EventWrapper>
  );
};

export default EventContent;
