import {
  CheckSquare,
  Calendar,
  Target,
  CalendarClock,
  Clock,
} from "lucide-react";

export const typeConfig = {
  task: { icon: CheckSquare, color: "bg-amber-500", label: "Task" },
  plan: { icon: CalendarClock, color: "bg-blue-500", label: "Plan" },
  goal: { icon: Target, color: "bg-purple-500", label: "Goal" },
  template: { icon: Calendar, color: "bg-gray-500", label: "Template" },
  travel: { icon: Clock, color: "bg-green-500", label: "Travel" },
};

export const getPriorityColor = (priority: number) => {
  if (priority === 0)
    return "bg-gray-300 hover:bg-gray-300 text-gray-700 hover:text-gray-700";
  if (priority === 1)
    return "bg-green-400 hover:bg-green-400 text-white hover:text-white";
  if (priority === 2)
    return "bg-green-500 hover:bg-green-500 text-white hover:text-white";
  if (priority === 3)
    return "bg-lime-500 hover:bg-lime-500 text-white hover:text-white";
  if (priority === 4)
    return "bg-yellow-400 hover:bg-yellow-400 text-white hover:text-white";
  if (priority === 5)
    return "bg-yellow-500 hover:bg-yellow-500 text-white hover:text-white";
  if (priority === 6)
    return "bg-yellow-600 hover:bg-yellow-600 text-white hover:text-white";
  if (priority === 7)
    return "bg-orange-500 hover:bg-orange-500 text-white hover:text-white";
  if (priority === 8)
    return "bg-orange-600 hover:bg-orange-600 text-white hover:text-white";
  if (priority === 9)
    return "bg-red-500 hover:bg-red-500 text-white hover:text-white";
  return "bg-red-600 hover:bg-red-600 text-white hover:text-white";
};
