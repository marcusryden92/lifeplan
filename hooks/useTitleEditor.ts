import { handleUpdateTitle } from "@/utils/calendarEventHandlers";
import { useState, useRef, useEffect } from "react";

interface UseTitleEditorOptions {
  initialTitle: string;
}

const useTitleEditor = ({ initialTitle }: UseTitleEditorOptions) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus and select text when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Update value when initial title changes
  useEffect(() => {
    setValue(initialTitle);
  }, [initialTitle]);

  const startEditing = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (handleUpdateTitle && value.trim() !== "") {
      handleUpdateTitle(value.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(initialTitle); // Reset to original value
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const handleBlur = () => {
    handleSave();
  };

  return {
    isEditing,
    value,
    setValue,
    inputRef,
    startEditing,
    handleSave,
    handleCancel,
    handleKeyDown,
    handleBlur,
  };
};

export default useTitleEditor;
