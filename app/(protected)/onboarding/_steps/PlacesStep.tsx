"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, SegmentedControl } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import * as locationActions from "@/actions/locations";
import { serializeLocation, serializeTravelTime } from "@/utils/locations";
import {
  upsertLocation,
  setDefaultTransportMode,
  setAllTravelTimes,
  type SerializedLocation,
} from "@/redux/slices/schedulingSettingsSlice";
import type { TransportMode } from "@/generated/client";
import type { RootState } from "@/redux/store";
import { TRANSPORT_MODE_OPTIONS } from "../../locations/_constants";
import { StepFrame } from "../_components/StepFrame";
import { LocationRows, type LocationRow } from "../_components/LocationRows";
import {
  fieldStack,
  fieldLabel,
  fieldHelp,
  footerActions,
  errorText,
} from "../onboarding.css";

type PlacesStepProps = {
  stepIndex: number;
  totalSteps: number;
  rows: LocationRow[];
  onRowsChange: (rows: LocationRow[]) => void;
  onBack: () => void;
  onContinue: () => void;
  onSkip: () => void;
};

function upsertIntoList(
  list: SerializedLocation[],
  row: SerializedLocation,
): SerializedLocation[] {
  const idx = list.findIndex((l) => l.id === row.id);
  if (idx === -1) return [...list, row];
  const next = [...list];
  next[idx] = row;
  return next;
}

export function PlacesStep({
  stepIndex,
  totalSteps,
  rows,
  onRowsChange,
  onBack,
  onContinue,
  onSkip,
}: PlacesStepProps) {
  const dispatch = useDispatch();
  const { locations, markSynced } = useCalendarProvider();
  const transportMode = useSelector(
    (state: RootState) => state.schedulingSettings.defaultTransportMode,
  );

  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    locationActions
      .createSessionToken()
      .then((token) => {
        if (active) setSessionToken(token);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleTransportChange = (mode: TransportMode) => {
    dispatch(setDefaultTransportMode(mode));
    void locationActions.updateDefaultTransportMode(mode).catch(() => {});
  };

  const warmTravelTimes = (currentLocations: SerializedLocation[]) => {
    if (currentLocations.length < 2) return;
    void (async () => {
      try {
        await locationActions.fetchMissingTravelTimes(transportMode);
        const fresh = await locationActions.fetchTravelTimes();
        const serialized = fresh.map(serializeTravelTime);
        dispatch(setAllTravelTimes(serialized));
        markSynced("travelTimes", serialized);
      } catch {
        // Best-effort; the engine falls back to zero travel.
      }
    })();
  };

  const handleContinue = async () => {
    const toCreate = rows.filter(
      (r) => r.selected && !r.createdId && r.name.trim().length > 0,
    );
    if (toCreate.length === 0) {
      warmTravelTimes(locations);
      onContinue();
      return;
    }

    setBusy(true);
    setError(null);
    let currentLocations = locations;
    const nextRows = [...rows];
    try {
      for (const row of toCreate) {
        const created = await locationActions.createLocation({
          name: row.name.trim(),
          placeId: row.selected!.placeId,
          sessionToken: sessionToken ?? undefined,
        });
        const serialized = serializeLocation(created);
        dispatch(upsertLocation(serialized));
        currentLocations = upsertIntoList(currentLocations, serialized);
        markSynced("locations", currentLocations);
        const idx = nextRows.findIndex((r) => r.key === row.key);
        if (idx !== -1) {
          nextRows[idx] = { ...nextRows[idx], createdId: serialized.id };
        }
      }
      onRowsChange(nextRows);
      warmTravelTimes(currentLocations);
      onContinue();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't add that location.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepFrame
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      title="Add your places"
      subtitle="Where you spend your time. We weave travel time between them — skip this and add places later if you like."
      onSkip={onSkip}
      footer={
        <>
          <Button variant="glass" onClick={onBack} disabled={busy}>
            Back
          </Button>
          <div className={footerActions}>
            <Button variant="glassInk" onClick={handleContinue} disabled={busy}>
              {busy ? "Adding…" : "Continue"}
            </Button>
          </div>
        </>
      }
    >
      <div className={fieldStack}>
        <span className={fieldLabel}>How do you usually get around?</span>
        <SegmentedControl
          options={TRANSPORT_MODE_OPTIONS}
          value={transportMode}
          onChange={handleTransportChange}
        />
        <span className={fieldHelp}>
          The default travel mode for estimating time between places.
        </span>
      </div>

      <LocationRows
        rows={rows}
        onChange={onRowsChange}
        sessionToken={sessionToken}
      />

      {error && <span className={errorText}>{error}</span>}
    </StepFrame>
  );
}
