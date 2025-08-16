import styles from "./EventColorPicker.module.css";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { calendarColors } from "@/data/calendarColors";
import { useMemo, useState, useEffect, useRef } from "react";

const TemplateEventColorPicker = ({ templateId }: { templateId: string }) => {
  const { updateTemplateArray, template } = useCalendarProvider();
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
    const thisTemplate = template.find((item) => item.id === templateId);

    return (thisTemplate?.color as string) || calendarColors[0];
  }, [template, templateId]);

  const handleClickColor = (color: string) => {
    updateTemplateArray((prev) =>
      prev.map((template) => {
        return template.id === templateId ? { ...template, color } : template;
      })
    );
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

export default TemplateEventColorPicker;
