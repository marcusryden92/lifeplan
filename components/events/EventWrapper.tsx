import React, { ReactNode, useLayoutEffect } from "react";
import { EventImpl } from "@fullcalendar/core/internal";
import { Pin } from "lucide-react";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { formatTime } from "@/utils/calendarUtils";
import { handleDoubleClick } from "@/utils/calendarEventHandlers";
import { vars } from "@/lib/theme";
import {
  TRESPASS_BORDER_COLOR,
  TRESPASS_BORDER_WIDTH,
} from "./trespassBorderStyles";

interface EventExtendedPropsWithTrespassing {
  trespassingStart?: boolean;
  trespassingEnd?: boolean;
  [key: string]: unknown;
}

// OKLCH lightness deltas (0–1) for the template border. Two constants because
// human perception is asymmetric — light strokes on saturated fills read as
// softer than dark strokes of equal numeric shift, so lighten gets a bigger
// number to compensate. Tweak each independently.
const TEMPLATE_BORDER_LIGHTEN = 0.3;
const TEMPLATE_BORDER_DARKEN = 0.3;

// YIQ luminance — perceived brightness from 0 to 255. Threshold ~140 sorts
// saturated mid-tones reliably: yellow/lime/cyan come out "light" and need a
// dark stroke; reds/blues/purples come out "dark" and want a white stroke.
function perceivedBrightness(hex: string | undefined | null): number {
  if (!hex) return 0;
  let s = hex.trim();
  if (s.startsWith("#")) s = s.slice(1);
  if (s.length === 3)
    s = s
      .split("")
      .map((c) => c + c)
      .join("");
  if (s.length !== 6) return 0;
  const r = parseInt(s.slice(0, 2), 16);
  const g = parseInt(s.slice(2, 4), 16);
  const b = parseInt(s.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return 0;
  return (r * 299 + g * 587 + b * 114) / 1000;
}

interface EventWrapperProps {
  event: EventImpl;
  elementRef: React.RefObject<HTMLDivElement>;
  elementHeight: number;
  elementWidth: number;
  isCompleted: boolean;
  showPopover: boolean;
  disableInteraction?: boolean;
  setShowPopover: React.Dispatch<React.SetStateAction<boolean>>;
  setElementHeight: React.Dispatch<React.SetStateAction<number>>;
  setElementWidth: React.Dispatch<React.SetStateAction<number>>;
  setOnHover: React.Dispatch<React.SetStateAction<boolean>>;
  setEventRect: React.Dispatch<React.SetStateAction<DOMRect | null>>;
  children?: ReactNode;
}

const EventWrapper: React.FC<EventWrapperProps> = ({
  event,
  elementRef,
  elementHeight,
  elementWidth,
  isCompleted,
  showPopover,
  disableInteraction = false,
  setShowPopover,
  setElementHeight,
  setElementWidth,
  setOnHover,
  setEventRect,
  children,
}: EventWrapperProps) => {
  const { userSettings } = useCalendarProvider();

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element) {
      setElementHeight(element.offsetHeight);
      setElementWidth(element.offsetWidth);
      element.style.zIndex = showPopover ? "30" : "";
    }
  }, [elementHeight, showPopover]);

  if (!event.start || !event.end) return null;

  const startTime = new Date(event.start);
  const endTime = new Date(event.end);

  const extendedProps =
    event.extendedProps as EventExtendedPropsWithTrespassing;
  const trespassingStart = extendedProps?.trespassingStart ?? false;
  const trespassingEnd = extendedProps?.trespassingEnd ?? false;
  const isPlan = extendedProps?.plannerType === "plan";
  const isTemplate = extendedProps?.eventType === "template";
  const tint = isCompleted
    ? userSettings.styles.events.completedColor
    : event.backgroundColor;
  const trespassPx = `${TRESPASS_BORDER_WIDTH}px`;

  // Three-tier responsive layout. Thresholds tuned against FullCalendar's
  // default slot density: a 30-min event renders at ~28-30px tall, so the
  // regular cutoff lives at 24 to give it the time pill. A 15-min event
  // (~14-16px) falls into compact. Anything below 13 is title-suppressed.
  const tier: "tiny" | "compact" | "regular" =
    elementHeight < 13 ? "tiny" : elementHeight < 24 ? "compact" : "regular";
  const showTitle = tier !== "tiny";
  // Time renders on a row BELOW the title so it never crowds it horizontally.
  // Needs both height room for the second line and a non-trivial width — if
  // either is missing, drop the time and let the title take everything.
  const showTime = tier === "regular" && elementHeight >= 40 && elementWidth >= 70;
  const showPin = isPlan && tier !== "tiny";
  const titleFont = tier === "compact" ? 10 : 11.5;
  const padding =
    tier === "tiny"
      ? "0 4px"
      : tier === "compact"
        ? "1px 8px"
        : "6px 10px";
  const glassFill = `color-mix(in srgb, ${tint} 94%, transparent)`;

  // Templates get a dashed border via OKLCH relative-color syntax — same hue
  // and chroma as the fill, just lightness shifted. Direction is chosen from
  // the fill itself: light fills get a darker stroke, dark fills get a lighter
  // one. Reads correctly in both themes since the contrast is fill-relative.
  const fillBright = perceivedBrightness(tint);
  const goLighter = fillBright < 140;
  const lDelta = goLighter ? TEMPLATE_BORDER_LIGHTEN : -TEMPLATE_BORDER_DARKEN;
  const templateBorder = `oklch(from ${tint} calc(l ${lDelta >= 0 ? "+" : "-"} ${Math.abs(lDelta)}) c h)`;
  const border = isTemplate ? `2px dashed ${templateBorder}` : "none";

  return (
    <div
      ref={elementRef}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        padding,
        borderRadius: 8,
        background: glassFill,
        backdropFilter: "blur(12px) saturate(160%)",
        WebkitBackdropFilter: "blur(12px) saturate(160%)",
        border,
        boxShadow: showPopover
          ? `0 8px 20px color-mix(in srgb, ${vars.ink} 24%, transparent), inset 0 1px 0 rgba(255,255,255,0.32)`
          : `inset 0 1px 0 rgba(255,255,255,0.28)`,
        color: "#fff",
        fontFamily: vars.font.ui,
        ...(trespassingStart && {
          borderTop: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
        ...(trespassingEnd && {
          borderBottom: `${trespassPx} solid ${TRESPASS_BORDER_COLOR}`,
        }),
      }}
      onMouseEnter={() => setOnHover(true)}
      onMouseLeave={() => setOnHover(false)}
      onDoubleClick={(e) =>
        !disableInteraction &&
        handleDoubleClick(e, elementRef, setEventRect, setShowPopover)
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {showPin && (
            <Pin
              size={tier === "compact" ? 9 : 11}
              strokeWidth={2.2}
              aria-hidden
              style={{
                color: "rgba(255,255,255,0.85)",
                flexShrink: 0,
                transform: "rotate(20deg)",
              }}
            />
          )}
          {showTitle && (
            <span
              style={{
                fontSize: titleFont,
                fontWeight: 500,
                fontStyle: "italic",
                color: "#fff",
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {event.title}
            </span>
          )}
        </div>
        {showTime && (
          <span
            style={{
              display: "flex",
              gap: 4,
              fontSize: 10,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            <span>{formatTime(startTime)}</span>
            <span aria-hidden style={{ opacity: 0.6 }}>
              –
            </span>
            <span>{formatTime(endTime)}</span>
          </span>
        )}
      </div>

      {children}
    </div>
  );
};

export default EventWrapper;
