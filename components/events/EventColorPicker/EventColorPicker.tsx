import styles from "./EventColorPicker.module.css";
import { useDataContext } from "@/context/DataContext";
import type { CalendarColor } from "@/data/calendarColors";
import { calendarColors } from "@/data/calendarColors";
import { useMemo, useState, useEffect, useRef } from "react";

const EventColorPicker = ({ taskId }: { taskId: string }) => {
  const { setMainPlanner, mainPlanner } = useDataContext();
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

  const currentColor = useMemo(() => {
    const thisTask = mainPlanner.find((item) => item.id === taskId);

    return thisTask?.color || calendarColors[0];
  }, [mainPlanner, taskId]);

  const handleClickColor = (color: CalendarColor) => {
    const newPlanner = mainPlanner.map((item) =>
      item.id === taskId || item.parentId === taskId
        ? { ...item, color: color }
        : item
    );

    setMainPlanner(newPlanner);
  };

  return (
    <div className={styles.container}>
      <div
        style={{
          backgroundColor: currentColor.hex,
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
              key={color.hex}
              onClick={() => {
                handleClickColor(color);
              }}
              style={{ backgroundColor: color.hex }}
              className={styles.colorSquare}
            ></div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventColorPicker;
