import { Copy, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { useCalendarProvider } from "@/context/CalendarProvider";
import { EventImpl } from "@fullcalendar/core/internal";
import { EventTemplate } from "@/types/prisma";

import TemplateEventPopover from "../TemplateEventPopover";
import EventWrapper from "../EventWrapper";
import { hoverRow, hoverBtnGroup, hoverBtn } from "./TemplateEventContent.css";

interface TemplateEventContentProps {
  event: EventImpl;
  onEditTitle: (
    updateTemplateArray: React.Dispatch<React.SetStateAction<EventTemplate[]>>,
    eventTitle: string,
    eventId: string
  ) => void;
  onCopy: () => void;
  onDelete: () => void;
  /** When true, suppresses the in-tile hover delete/duplicate buttons. The
   *  popover still opens — destructive edits are deferred to that surface
   *  (or future "delete all vs. add exception" prompts). */
  hideHoverButtons?: boolean;
}

const TemplateEventContent: React.FC<TemplateEventContentProps> = ({
  event,
  onEditTitle,
  onCopy,
  onDelete,
  hideHoverButtons = false,
}) => {
  const { updateTemplateArray, userSettings } = useCalendarProvider();

  const elementRef = useRef<HTMLDivElement>(null);
  const [elementHeight, setElementHeight] = useState<number>(0);
  const [elementWidth, setElementWidth] = useState<number>(0);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [eventRect, setEventRect] = useState<DOMRect | null>(null);
  const [onHover, setOnHover] = useState<boolean>(false);

  const startTime = event.start ? new Date(event.start) : new Date();
  const endTime = event.end ? new Date(event.end) : new Date();
  const red = userSettings.styles.events.errorColor;

  const handleClickDelete = () => {
    const parentElement = elementRef.current?.closest(
      ".fc-event"
    ) as HTMLElement;
    if (parentElement) {
      parentElement.style.backgroundColor = red;
      parentElement.style.border = `solid 2px ${red}`;
    }
    setTimeout(() => onDelete(), 500);
    setShowPopover(false);
  };

  const handleEditTitle = (newTitle: string) => {
    const id = event.id;
    onEditTitle(updateTemplateArray, newTitle, id);
    setShowPopover(false);
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
      isCompleted={false} // templates are never completed
      showPopover={showPopover}
      setShowPopover={setShowPopover}
    >
      {!hideHoverButtons &&
        onHover &&
        elementHeight > 40 &&
        elementWidth > 70 && (
          <div className={hoverRow}>
            <div className={hoverBtnGroup}>
              <button
                onClick={handleClickDelete}
                className={hoverBtn}
                aria-label="Delete"
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>

            <div className={hoverBtnGroup}>
              <button
                onClick={onCopy}
                className={hoverBtn}
                aria-label="Duplicate"
              >
                <Copy size={14} strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

      {showPopover && eventRect && (
        <TemplateEventPopover
          event={event}
          eventRect={eventRect}
          startTime={startTime}
          endTime={endTime}
          onClose={() => setShowPopover(false)}
          onEdit={handleEditTitle}
          onCopy={() => {
            setShowPopover(false);
            onCopy();
          }}
          onDelete={handleClickDelete}
        />
      )}
    </EventWrapper>
  );
};

export default TemplateEventContent;
