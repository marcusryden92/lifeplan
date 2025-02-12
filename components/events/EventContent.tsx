// EventContent.tsx
import {
  TrashIcon,
  DocumentDuplicateIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

import { SimpleEvent } from "@/utils/calendar-generation/calendarGeneration";

interface EventContentProps {
  event: SimpleEvent;
  onEdit: () => void;
  onCopy: () => void;
  onDelete: () => void;
  showButtons: boolean;
}

const EventContent: React.FC<EventContentProps> = ({
  event,
  onEdit,
  onCopy,
  onDelete,
  showButtons,
}) => (
  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
    <span className="p-1" style={{ marginBottom: "auto" }}>
      {event.title}
    </span>
    {showButtons && (
      <div
        className="m-1"
        style={{ display: "flex", justifyContent: "flex-end" }}
      >
        <button onClick={onEdit} style={{ marginLeft: "10px" }}>
          <PencilIcon height="1rem" width="1rem" />
        </button>
        <button onClick={onCopy} style={{ marginLeft: "10px" }}>
          <DocumentDuplicateIcon height="1rem" width="1rem" />
        </button>
        <button onClick={onDelete} style={{ marginLeft: "10px" }}>
          <TrashIcon height="1rem" width="1rem" />
        </button>
      </div>
    )}
  </div>
);

export default EventContent;
