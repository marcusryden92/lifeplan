import styles from "./EventColorPicker.module.css";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { calendarColors } from "@/data/calendarColors";
import { getCompleteTaskTreeIds } from "@/utils/goalPageHandlers";
import { useMemo, useState, useEffect, useRef } from "react";

const EventColorPicker = ({ taskId }: { taskId: string }) => {
  const { updateAll, planner, calendar } = useCalendarProvider();
  const [paletteIsOpen, setPaletteIsOpen] = useState(false);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPaletteIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const currentTaskTree = useMemo(() => {
    return getCompleteTaskTreeIds(planner, taskId);
  }, [planner]);

  const currentColor = useMemo(() => {
    const thisTask = planner.find((item) => item.id === taskId);

    return (thisTask?.color as string) || calendarColors[0];
  }, [planner, taskId]);

  const handleClickColor = (color: string) => {
    const newPlanner = planner.map((item) =>
      currentTaskTree.includes(item.id) ? { ...item, color: color } : item
    );

    const newCalendar = calendar.map((item) =>
      currentTaskTree.includes(item.id)
        ? { ...item, backgroundColor: color }
        : item
    );

    updateAll(newPlanner, newCalendar);
    setPaletteIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <div
        style={{
          backgroundColor: currentColor,
        }}
        className={styles.currentColorSquare}
        onClick={() => {
          setPaletteIsOpen(true);
        }}
      ></div>
      {paletteIsOpen && (
        <div ref={ref} className={styles.palette}>
          {calendarColors.map((color) => (
            <div
              key={color}
              onClick={() => {
                handleClickColor(color);
              }}
              style={{ backgroundColor: color }}
              className={styles.colorSquare}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventColorPicker;
