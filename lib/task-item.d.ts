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
  itemIsFocused: boolean;
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
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemIsFocused: boolean; // Boolean indicating if the item is focused
  setItemIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
  subtasksMinimized: boolean; // Boolean indicating if subtasks are minimized
  setSubtasksMinimized: React.Dispatch<React.SetStateAction<boolean>>; // Function to set subtasksMinimized
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  devMode: boolean; // Boolean indicating if dev mode is active
}

export interface TaskDisplayProps {
  task: Planner;
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemIsFocused: boolean; // Boolean indicating if the item is focused
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
  itemIsFocused: boolean;
}

export interface AddSubtaskWrapperProps {
  task: Planner;
  subtasks: Planner[];
  displayAddSubtask: boolean;
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>;
  itemIsFocused: boolean;
  displayEdit: boolean;
}

export interface AddSubtaskProps {
  task: Planner;
  parentId: string;
  isMainParent?: boolean;
  subtasksLength?: number;
}

export interface TaskEditDeleteButtonsProps {
  task: Planner;
  itemIsFocused: boolean;
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>;
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface DurationDisplayProps {
  task: Planner;
  itemIsFocused: boolean;
  subtasksLength: number;
  displayEdit: boolean;
}
