import { Planner } from "@/lib/planner-class";

export interface TaskListProps {
  id: string;
  subtasks?: Planner[];
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface TaskListWrapperProps {
  subtasksLength: number;
  parentId?: string;
  subtasksMinimized: boolean;
  itemFocused: boolean;
  children?: React.ReactNode;
}

export interface TaskItemProps {
  taskArray: Planner[];
  task: Planner;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
}

export interface TaskHeaderProps {
  task: Planner;
  headerRef: React.RefObject<HTMLDivElement>; // Reference to the header div
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemFocused: boolean; // Boolean indicating if the item is focused
  subtasksMinimized: boolean; // Boolean indicating if subtasks are minimized
  setSubtasksMinimized: React.Dispatch<React.SetStateAction<boolean>>; // Function to set subtasksMinimized
  handleSetFocusedTask: () => void; // Function to handle setting the focused task
  totalTaskDuration: number; // Total duration of the task
  devMode: boolean; // Boolean indicating if dev mode is active
}

export interface TaskDisplayProps {
  task: Planner;
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemFocused: boolean; // Boolean indicating if the item is focused
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayEdit
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayAddSubtask
  subtasksMinimized: boolean; // Boolean indicating if subtasks are minimized
  setSubtasksMinimized: React.Dispatch<React.SetStateAction<boolean>>; // Function to set subtasksMinimized
  handleSetFocusedTask: () => void; // Function to handle setting the focused task
  devMode: boolean; // Boolean indicating if dev mode is active
}

export interface TaskEditFormProps {
  task: Planner;
  subtasks: Planner[];
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>;
  itemFocused: boolean;
}

export interface AddSubtaskWrapperProps {
  task: Planner;
  subtasks: Planner[];
  displayAddSubtask: boolean;
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  itemFocused: boolean;
}

export interface AddSubtaskProps {
  task: Planner;
  parentId: string;
  isMainParent?: boolean;
  subtasksLength?: number;
}

export interface TaskEditDeleteButtonsProps {
  task: Planner;
  itemFocused: boolean;
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>;
}
