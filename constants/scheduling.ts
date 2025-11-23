import {
  AlertCircle,
  Clock,
  Calendar,
  Zap,
  CalendarDays,
  Timer,
} from "lucide-react";

export const RULE_TYPES = [
  { value: "URGENCY", label: "Urgency (Deadline-based)", Icon: AlertCircle },
  { value: "EARLIEST_SLOT", label: "Earliest Available Slot", Icon: Clock },
  { value: "PREFERRED_TIME", label: "Preferred Time Windows", Icon: Calendar },
  { value: "ENERGY_LEVEL", label: "Energy Level Matching", Icon: Zap },
  {
    value: "DAY_PREFERENCE",
    label: "Day-of-Week Preference",
    Icon: CalendarDays,
  },
  { value: "BUFFER_TIME", label: "Buffer Time Between Tasks", Icon: Timer },
];

export type RuleType = (typeof RULE_TYPES)[number];
