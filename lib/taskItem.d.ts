import { Planner } from "@/prisma/generated/client";

export interface TaskListProps {
  id: string;
  subtasks?: Planner[];
}

export interface TaskListWrapperProps {
  taskId: string;
  subtasksLength: number;
  parentId?: string;
  subtasksMinimized: boolean;
  itemIsFocused: boolean;
  children?: React.ReactNode;
}

export interface TaskItemProps {
  planner: Planner[];
  task: Planner;
}

export interface TaskHeaderProps {
  task: Planner;
  subtasks: Planner[]; // Array of subtasks of type Planner
  itemIsFocused: boolean; // Boolean indicating if the item is focused
  setItemIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
  focusedTask: string | null;
  setFocusedTask: React.Dispatch<React.SetStateAction<string | null>>;
  devMode: boolean; // Boolean indicating if dev mode is active
}

export interface TaskDisplayProps {
  task: Planner;
  itemIsFocused: boolean; // Boolean indicating if the item is focused
  setDisplayEdit: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayEdit
  setDisplayAddSubtask: React.Dispatch<React.SetStateAction<boolean>>; // Function to set displayAddSubtask
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
}

export type ClickedItem = { taskId: string; taskTitle: string } | null;
