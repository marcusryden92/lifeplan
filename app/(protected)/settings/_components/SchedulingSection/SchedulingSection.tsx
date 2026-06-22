"use client";

import { useCallback } from "react";
import {
  Bike,
  Car,
  Footprints,
  Train,
  type LucideIcon,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { updateDefaultTransportMode } from "@/actions/locations";
import {
  setDefaultTransportMode,
  setEnableTravelEvents,
} from "@/redux/slices/schedulingSettingsSlice";
import type { AppDispatch, RootState } from "@/redux/store";
import type { TransportMode } from "@/prisma/client";
import { useServerAction } from "@/hooks/useServerAction";
import { StatusLine } from "../StatusLine";
import {
  card,
  cardTitle,
  fieldNote,
  rowSplit,
  rowGrow,
  toggleRow,
  toggleMain,
  toggleHead,
  toggleBody,
  toggleSwitch,
  toggleSwitchOn,
  toggleKnob,
  toggleKnobOn,
  transportRow,
  transportBtn,
  transportBtnActive,
  footerRow,
} from "../../page.css";

const MODES: { value: TransportMode; label: string; Icon: LucideIcon }[] = [
  { value: "DRIVING", label: "Driving", Icon: Car },
  { value: "TRANSIT", label: "Transit", Icon: Train },
  { value: "BICYCLING", label: "Cycling", Icon: Bike },
  { value: "WALKING", label: "Walking", Icon: Footprints },
];

export function SchedulingSection() {
  const dispatch = useDispatch<AppDispatch>();
  const transportMode = useSelector(
    (state: RootState) => state.schedulingSettings.defaultTransportMode,
  );
  const enableTravelEvents = useSelector(
    (state: RootState) => state.schedulingSettings.enableTravelEvents,
  );
  const bufferTimeMinutes = useSelector(
    (state: RootState) => state.schedulingSettings.bufferTimeMinutes,
  );

  const saveMode = useCallback(async (mode: TransportMode) => {
    await updateDefaultTransportMode(mode);
    return mode;
  }, []);

  const { run, status, isPending, setSuccess, setError, clear } =
    useServerAction(saveMode);

  const setMode = async (mode: TransportMode) => {
    if (mode === transportMode) return;
    dispatch(setDefaultTransportMode(mode));
    clear();
    const result = await run(mode);
    if (result === undefined) {
      setError("Failed to save transport mode.");
      return;
    }
    setSuccess("Transport mode updated.");
  };

  const toggleTravelEvents = () => {
    dispatch(setEnableTravelEvents(!enableTravelEvents));
  };

  return (
    <>
      <div className={card}>
        <span className={cardTitle}>Default transport mode</span>
        <span className={fieldNote}>
          Used as the baseline mode when calculating travel times between
          locations.
        </span>
        <div className={transportRow}>
          {MODES.map(({ value, label, Icon }) => {
            const active = value === transportMode;
            return (
              <button
                key={value}
                type="button"
                className={`${transportBtn} ${active ? transportBtnActive : ""}`}
                onClick={() => setMode(value)}
                disabled={isPending}
              >
                <Icon size={16} strokeWidth={2} />
                {label}
              </button>
            );
          })}
        </div>
        <div className={footerRow}>
          <StatusLine status={status} />
        </div>
      </div>

      <div className={card}>
        <span className={cardTitle}>Travel events on the calendar</span>
        <div className={toggleRow}>
          <div className={toggleMain}>
            <div className={toggleHead}>Show travel as its own block</div>
            <div className={toggleBody}>
              When on, travel time between two locations appears as a separate
              event on the calendar. When off, it&apos;s absorbed into the
              surrounding events.
            </div>
          </div>
          <button
            type="button"
            className={`${toggleSwitch} ${enableTravelEvents ? toggleSwitchOn : ""}`}
            onClick={toggleTravelEvents}
            aria-pressed={enableTravelEvents}
            aria-label="Toggle travel events"
          >
            <span
              className={`${toggleKnob} ${enableTravelEvents ? toggleKnobOn : ""}`}
            />
          </button>
        </div>
      </div>

      <div className={card}>
        <span className={cardTitle}>Tuning</span>
        <div className={rowSplit}>
          <div className={rowGrow}>
            <div className={toggleHead}>
              Buffer between items · {bufferTimeMinutes} min
            </div>
            <div className={toggleBody}>
              Engine weights and the buffer slider live in the engine drawer on
              the Calendar — open it from the cog in the top-right.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
