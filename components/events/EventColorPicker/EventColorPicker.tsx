import styles from "./EventColorPicker.module.css";
import { useDataContext } from "@/context/DataContext";
import { calendarColors } from "@/data/calendarColors";
import { getCompleteTaskTreeIds } from "@/utils/goalPageHandlers";
import { useMemo, useState, useEffect, useRef } from "react";

const EventColorPicker = ({ taskId }: { taskId: string }) => {
  const { setMainPlanner, mainPlanner, currentCalendar } = useDataContext();
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
    return getCompleteTaskTreeIds(mainPlanner, taskId);
  }, [mainPlanner]);

  const currentColor = useMemo(() => {
    const thisTask = mainPlanner.find((item) => item.id === taskId);

    return (thisTask?.color as string) || calendarColors[0];
  }, [mainPlanner, taskId]);

  const handleClickColor = (color: string) => {
    const newPlanner = mainPlanner.map((item) =>
      currentTaskTree.includes(item.id) ? { ...item, color: color } : item
    );

    const newCalendar = currentCalendar.map((item) =>
      currentTaskTree.includes(item.id)
        ? { ...item, backgroundColor: color }
        : item
    );

    setMainPlanner(newPlanner, newCalendar);
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
