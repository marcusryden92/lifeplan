"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Car,
  Train,
  Bike,
  Footprints,
  MapPin,
  Plus,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import * as locationActions from "@/actions/locations";
import type { RootState } from "@/redux/store";
import {
  upsertLocation,
  removeLocation,
  type SerializedLocation,
} from "@/redux/slices/schedulingSettingsSlice";
import type { Location, TravelTime } from "@/types/prisma";
import type { TransportMode } from "@/lib/generated/db-client";
import { LumenConfirmModal } from "@/app/circadium/items/[id]/_components/LumenConfirmModal";
import { TravelMatrix } from "./_components/TravelMatrix";
import { AddLocationModal } from "./_components/AddLocationModal";
import { EditTravelTimeModal } from "./_components/EditTravelTimeModal";
import {
  EditLocationModal,
  type EditLocationDraft,
} from "./_components/EditLocationModal";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  spacer,
  headActions,
  segmentedControl,
  segmentedThumb,
  segmentedButton,
  successBanner,
  errorBanner,
  mainGrid,
  rail,
  railHead,
  railBody,
  railFooter,
  railNote,
  railRow,
  railRowPin,
  railRowMeta,
  railRowName,
  railRowAddress,
  railRowTags,
  railRowTag,
  railRowTagDot,
  railNewButton,
  matrixPane,
  matrixHead,
  matrixTitle,
  matrixSubtitle,
  matrixLegend,
  legendDot,
  legendDotRush,
  legendDotRegular,
  legendDotNight,
  matrixEmpty,
  matrixFooter,
  matrixFooterAction,
} from "./page.css";

const MAX_LOCATIONS = 10;

const TRANSPORT_MODES: ReadonlyArray<{
  key: TransportMode;
  label: string;
  Icon: LucideIcon;
}> = [
  { key: "DRIVING", label: "Driving", Icon: Car },
  { key: "TRANSIT", label: "Transit", Icon: Train },
  { key: "BICYCLING", label: "Bike", Icon: Bike },
  { key: "WALKING", label: "Walk", Icon: Footprints },
];

// Helper: narrow a Prisma Location to the serialized shape Redux holds.
const serialize = (loc: Location): SerializedLocation => ({
  id: loc.id,
  name: loc.name,
  address: loc.address ?? "",
  placeId: loc.placeId,
});

export default function LocationsPage() {
  // NOTE: this page does NOT refetch locations on mount. UserProvider already
  // loads them on auth via fetchAllSchedulingData and pushes them into Redux.
  // A page-level dispatch raced with useCalendarServerSync's diff hook and
  // could cascade-delete locations on the server if the racing fetch ever
  // returned an empty list. Trust Redux as the source of truth.
  const dispatch = useDispatch();
  const { categories } = useCalendarProvider();

  // Locations are the source of truth in Redux so this screen's optimistic
  // mutations are immediately visible to every other screen that selects
  // from state.schedulingSettings.locations.
  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );

  // All travel times across every transport mode are kept in memory; the
  // matrix filters by the active mode in a memo so toggling between
  // driving/transit/bike/walk is instant instead of a server roundtrip.
  const [allTravelTimes, setAllTravelTimes] = useState<TravelTime[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("DRIVING");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [editingLocation, setEditingLocation] =
    useState<SerializedLocation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editPair, setEditPair] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  // Initial load: travel times for all modes + default transport. Locations
  // come from Redux via UserProvider so they aren't fetched here.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [allTimes, defaultMode] = await Promise.all([
          locationActions.fetchTravelTimes(),
          locationActions.getDefaultTransportMode(),
        ]);
        if (cancelled) return;
        setAllTravelTimes(allTimes);
        setTransportMode(defaultMode);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const travelTimes = useMemo(
    () => allTravelTimes.filter((tt) => tt.transportMode === transportMode),
    [allTravelTimes, transportMode],
  );

  const categoryDefaultsByLocation = useMemo(() => {
    const map = new Map<string, { name: string; color: string | null }[]>();
    for (const cat of categories) {
      if (!cat.locationId) continue;
      const list = map.get(cat.locationId) ?? [];
      list.push({ name: cat.name, color: cat.color });
      map.set(cat.locationId, list);
    }
    return map;
  }, [categories]);

  const isTimeVaryingMode =
    transportMode === "DRIVING" || transportMode === "TRANSIT";

  const hasCustomOverride = travelTimes.some(
    (tt) =>
      tt.customRushHourMinutes !== null ||
      tt.customRegularMinutes !== null ||
      tt.customNightMinutes !== null,
  );

  const selectedTravelTime = editPair
    ? travelTimes.find(
        (tt) =>
          tt.fromLocationId === editPair.from &&
          tt.toLocationId === editPair.to,
      ) ?? null
    : null;
  const editFromLocation = editPair
    ? locations.find((l) => l.id === editPair.from) ?? null
    : null;
  const editToLocation = editPair
    ? locations.find((l) => l.id === editPair.to) ?? null
    : null;

  const handleTransportChange = async (mode: TransportMode) => {
    setTransportMode(mode);
    try {
      await locationActions.updateDefaultTransportMode(mode);
    } catch (err) {
      console.error("Failed to persist transport mode", err);
    }
  };

  // Add is server-first because the row's id is server-generated. The
  // returned row goes straight into Redux so the rest of the app sees the
  // new location without a separate sync step.
  const handleAdd = async (
    name: string,
    placeId: string,
    sessionToken?: string,
  ) => {
    try {
      setError(null);
      const created = await locationActions.createLocation({
        name,
        placeId,
        sessionToken,
      });
      dispatch(upsertLocation(serialize(created)));
      flashSuccess(`Added "${name}".`);
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
      throw err;
    }
  };

  // Edit flows are optimistic — the Redux dispatch happens before the server
  // round-trip so the rail updates instantly. On failure we restore the
  // original snapshot and surface the error.
  const handleSaveEdit = async (draft: EditLocationDraft) => {
    if (!editingLocation) return;
    const original = editingLocation;
    const trimmedName = draft.name.trim();

    const optimistic: SerializedLocation = {
      ...original,
      name: trimmedName,
    };
    dispatch(upsertLocation(optimistic));
    setEditingLocation(null);

    try {
      const updated = await locationActions.updateLocation(original.id, {
        name: trimmedName !== original.name ? trimmedName : undefined,
        placeId: draft.placeId,
        sessionToken: draft.sessionToken,
      });
      dispatch(upsertLocation(serialize(updated)));
      if (draft.placeId && draft.placeId !== original.placeId) {
        // updateLocation deletes affected travel times server-side so the
        // matrix re-fetches them; drop them client-side to match.
        setAllTravelTimes((prev) =>
          prev.filter(
            (tt) =>
              tt.fromLocationId !== updated.id &&
              tt.toLocationId !== updated.id,
          ),
        );
      }
      flashSuccess("Location updated.");
    } catch (err) {
      dispatch(upsertLocation(original));
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const original = locations.find((l) => l.id === deletingId);
    if (!original) return;
    const deletedId = deletingId;
    const droppedTravels = allTravelTimes.filter(
      (tt) =>
        tt.fromLocationId === deletedId || tt.toLocationId === deletedId,
    );

    dispatch(removeLocation(deletedId));
    setAllTravelTimes((prev) =>
      prev.filter(
        (tt) =>
          tt.fromLocationId !== deletedId && tt.toLocationId !== deletedId,
      ),
    );
    setDeletingId(null);
    setEditingLocation(null);

    try {
      await locationActions.deleteLocation(deletedId);
      flashSuccess("Location deleted.");
    } catch (err) {
      dispatch(upsertLocation(original));
      setAllTravelTimes((prev) => [...prev, ...droppedTravels]);
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleFetchMissing = async () => {
    if (locations.length < 2) {
      setError("Add at least 2 locations to fetch travel times.");
      return;
    }
    try {
      setWorking(true);
      setError(null);
      const result =
        await locationActions.fetchMissingTravelTimes(transportMode);
      const fresh = await locationActions.fetchTravelTimes();
      setAllTravelTimes(fresh);
      flashSuccess(
        result.fetched > 0
          ? `Fetched ${result.fetched} travel time${result.fetched > 1 ? "s" : ""}.`
          : "All travel times are up to date.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch travel times",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleRefreshAll = async () => {
    if (locations.length < 2) {
      setError("Add at least 2 locations to refresh travel times.");
      return;
    }
    try {
      setWorking(true);
      setError(null);
      const result =
        await locationActions.refreshAllTravelTimes(transportMode);
      const fresh = await locationActions.fetchTravelTimes();
      setAllTravelTimes(fresh);
      flashSuccess(`Refreshed ${result.updated} travel times.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to refresh travel times",
      );
    } finally {
      setWorking(false);
    }
  };

  const handleSaveOverrides = async (
    travelTimeId: string,
    overrides: {
      customRushHourMinutes: number | null;
      customRegularMinutes: number | null;
      customNightMinutes: number | null;
    },
  ) => {
    try {
      const updated = await locationActions.updateTravelTimeOverride(
        travelTimeId,
        overrides,
      );
      setAllTravelTimes((prev) =>
        prev.map((tt) => (tt.id === travelTimeId ? updated : tt)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save overrides",
      );
    }
  };

  const handleClearAllOverrides = async () => {
    setConfirmClearAll(false);
    try {
      setWorking(true);
      await Promise.all(
        travelTimes
          .filter(
            (tt) =>
              tt.customRushHourMinutes !== null ||
              tt.customRegularMinutes !== null ||
              tt.customNightMinutes !== null,
          )
          .map((tt) =>
            locationActions.clearTravelTimeOverrides(tt.id),
          ),
      );
      const fresh = await locationActions.fetchTravelTimes();
      setAllTravelTimes(fresh);
      flashSuccess("All overrides cleared.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear overrides",
      );
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className={page}>
        <div className={subHeader}>
          <h1 className={pageTitle}>Locations</h1>
          <span className={titleSummary}>Loading…</span>
        </div>
      </div>
    );
  }

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Locations</h1>
        <span className={titleSummary}>
          {locations.length} of {MAX_LOCATIONS} saved
          {locations.length >= 2 && " · travel times between every pair"}
        </span>
        {error && <div className={errorBanner}>{error}</div>}
        {success && !error && (
          <div className={successBanner}>{success}</div>
        )}
        <span className={spacer} />
        <div className={headActions}>
          <TransportModeSegmented
            value={transportMode}
            onChange={handleTransportChange}
          />
          <Button
            variant="glass"
            size="sm"
            onClick={handleFetchMissing}
            disabled={working || locations.length < 2}
          >
            <RefreshCw size={12} strokeWidth={2.2} />
            Fetch missing
          </Button>
          <Button
            variant="glass"
            size="sm"
            onClick={handleRefreshAll}
            disabled={working || locations.length < 2}
          >
            <RefreshCw size={12} strokeWidth={2.2} />
            Refresh all
          </Button>
        </div>
      </div>

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railHead}>Locations</div>
          <div className={railBody}>
            {locations.length === 0 ? (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 12.5,
                  color: "var(--muted)",
                }}
              >
                No locations yet — add one to get started.
              </div>
            ) : (
              locations.map((loc) => {
                const tags = categoryDefaultsByLocation.get(loc.id) ?? [];
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={railRow}
                    onClick={() => setEditingLocation(loc)}
                    aria-label={`Edit ${loc.name}`}
                  >
                    <span className={railRowPin}>
                      <MapPin size={13} strokeWidth={2.2} />
                    </span>
                    <span className={railRowMeta}>
                      <span className={railRowName}>{loc.name}</span>
                      <span className={railRowAddress}>
                        {loc.address || loc.placeId}
                      </span>
                      {tags.length > 0 && (
                        <span className={railRowTags}>
                          {tags.map((t) => (
                            <span key={t.name} className={railRowTag}>
                              {t.color && (
                                <span
                                  className={railRowTagDot}
                                  style={{ background: t.color }}
                                />
                              )}
                              {t.name}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div className={railFooter}>
            <button
              type="button"
              className={railNewButton}
              onClick={() => setAddOpen(true)}
              disabled={locations.length >= MAX_LOCATIONS}
            >
              <Plus size={13} strokeWidth={2.4} />
              {locations.length >= MAX_LOCATIONS
                ? `Max ${MAX_LOCATIONS} reached`
                : "Add location"}
            </button>
            <span className={railNote}>
              Up to {MAX_LOCATIONS} locations · deleting cascades to travel
              times
            </span>
          </div>
        </aside>

        <section className={matrixPane}>
          <div className={matrixHead}>
            <h2 className={matrixTitle}>Travel matrix</h2>
            <span className={matrixSubtitle}>
              {isTimeVaryingMode
                ? "from row · to column · 3 time-of-day values"
                : "from row · to column · minutes (constant)"}
            </span>
            {isTimeVaryingMode && (
              <span className={matrixLegend}>
                <span>
                  <span className={`${legendDot} ${legendDotRegular}`} />
                  regular
                </span>
                <span>
                  <span className={`${legendDot} ${legendDotRush}`} />
                  rush
                </span>
                <span>
                  <span className={`${legendDot} ${legendDotNight}`} />
                  night
                </span>
              </span>
            )}
          </div>

          {locations.length < 2 ? (
            <div className={matrixEmpty}>
              <div>Add at least 2 locations to see the travel matrix.</div>
            </div>
          ) : travelTimes.length === 0 ? (
            <div className={matrixEmpty}>
              <div>No travel times yet for {transportMode.toLowerCase()}.</div>
              <Button
                variant="solid"
                size="sm"
                onClick={handleFetchMissing}
                disabled={working}
              >
                <RefreshCw size={12} strokeWidth={2.2} />
                Fetch travel times
              </Button>
            </div>
          ) : (
            <>
              <TravelMatrix
                locations={locations}
                travelTimes={travelTimes}
                transportMode={transportMode}
                onEditPair={(from, to) => setEditPair({ from, to })}
                onFetchMissing={handleFetchMissing}
              />
              <div className={matrixFooter}>
                <span>
                  Cells tinted amber are custom overrides; click any cell to
                  edit all three periods.
                </span>
                <span style={{ flex: 1 }} />
                <button
                  type="button"
                  className={matrixFooterAction}
                  disabled={!hasCustomOverride || working}
                  onClick={() => setConfirmClearAll(true)}
                >
                  Clear all overrides
                </button>
              </div>
            </>
          )}

        </section>
      </div>

      <AddLocationModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={handleAdd}
      />

      <EditLocationModal
        open={!!editingLocation}
        location={editingLocation}
        onClose={() => setEditingLocation(null)}
        onSave={handleSaveEdit}
        onRequestDelete={() => {
          if (editingLocation) setDeletingId(editingLocation.id);
        }}
      />

      <EditTravelTimeModal
        open={!!editPair}
        travelTime={selectedTravelTime}
        fromLocation={editFromLocation}
        toLocation={editToLocation}
        transportMode={transportMode}
        onClose={() => setEditPair(null)}
        onSave={handleSaveOverrides}
      />

      <LumenConfirmModal
        open={!!deletingId}
        title="Delete location?"
        tone="danger"
        confirmLabel="Delete"
        body={
          <p style={{ margin: 0 }}>
            Delete &ldquo;
            {locations.find((l) => l.id === deletingId)?.name ?? "this location"}
            &rdquo;? This will also remove all travel times to and from it.
            Items and categories that point at it will fall back to
            &ldquo;Anywhere&rdquo;.
          </p>
        }
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />

      <LumenConfirmModal
        open={confirmClearAll}
        title="Clear all overrides?"
        tone="danger"
        confirmLabel="Clear all"
        body={
          <p style={{ margin: 0 }}>
            Remove every custom travel-time override and revert to Google&apos;s
            values? You can re-customize individual cells afterwards.
          </p>
        }
        onCancel={() => setConfirmClearAll(false)}
        onConfirm={handleClearAllOverrides}
      />
    </div>
  );
}

// Sliding-thumb segmented control identical to the library filter strip's
// pattern. Kept local since this is the only segment list on the page.
function TransportModeSegmented({
  value,
  onChange,
}: {
  value: TransportMode;
  onChange: (next: TransportMode) => void;
}) {
  const n = TRANSPORT_MODES.length;
  const activeIdx = Math.max(
    0,
    TRANSPORT_MODES.findIndex((o) => o.key === value),
  );
  return (
    <div
      className={segmentedControl}
      style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
    >
      <span
        className={segmentedThumb}
        aria-hidden
        style={{
          width: `calc(${100 / n}% - ${6 / n}px)`,
          transform: `translateX(${activeIdx * 100}%)`,
        }}
      />
      {TRANSPORT_MODES.map((o) => (
        <button
          key={o.key}
          type="button"
          className={segmentedButton}
          data-active={o.key === value}
          onClick={() => onChange(o.key)}
        >
          <o.Icon size={11} strokeWidth={2.4} />
          {o.label}
        </button>
      ))}
    </div>
  );
}
