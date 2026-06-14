"use client";

import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import {
  Car,
  Train,
  Bike,
  Footprints,
  MapPin,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import * as locationActions from "@/actions/locations";
import {
  setLocations as setLocationsInRedux,
  type SerializedLocation,
} from "@/redux/slices/schedulingSettingsSlice";
import type { Location, TravelTime } from "@/types/prisma";
import type { TransportMode } from "@/lib/generated/db-client";
import { LumenConfirmModal } from "@/app/circadium/items/[id]/_components/LumenConfirmModal";
import { TravelMatrix } from "./_components/TravelMatrix";
import { AddLocationModal } from "./_components/AddLocationModal";
import { EditTravelTimeModal } from "./_components/EditTravelTimeModal";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  spacer,
  headActions,
  transportSeg,
  transportSegBtn,
  transportSegBtnActive,
  successBanner,
  errorBanner,
  mainGrid,
  rail,
  railHead,
  railBody,
  railFooter,
  railNote,
  railRow,
  railRowActive,
  railRowPin,
  railRowMeta,
  railRowName,
  railRowAddress,
  railRowTags,
  railRowTag,
  railRowTagDot,
  railRowActions,
  railIconBtn,
  railRowInput,
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

const TRANSPORT_MODES: {
  value: TransportMode;
  label: string;
  Icon: typeof Car;
}[] = [
  { value: "DRIVING", label: "Driving", Icon: Car },
  { value: "TRANSIT", label: "Transit", Icon: Train },
  { value: "BICYCLING", label: "Bike", Icon: Bike },
  { value: "WALKING", label: "Walk", Icon: Footprints },
];

export default function LocationsPage() {
  const dispatch = useDispatch();
  const { categories } = useCalendarProvider();

  const [locations, setLocations] = useState<Location[]>([]);
  const [travelTimes, setTravelTimes] = useState<TravelTime[]>([]);
  const [transportMode, setTransportMode] = useState<TransportMode>("DRIVING");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
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

  const syncReduxLocations = (next: Location[]) => {
    const serialized: SerializedLocation[] = next.map((loc) => ({
      id: loc.id,
      name: loc.name,
      address: loc.address ?? "",
      placeId: loc.placeId,
    }));
    dispatch(setLocationsInRedux(serialized));
  };

  // Initial load: locations + default transport mode. Travel-times load reacts
  // to the transport mode separately so the user's first interaction with the
  // top toggle pulls fresh data without flicker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [locs, defaultMode] = await Promise.all([
          locationActions.fetchLocations(),
          locationActions.getDefaultTransportMode(),
        ]);
        if (cancelled) return;
        setLocations(locs);
        setTransportMode(defaultMode);
        syncReduxLocations(locs);
        if (locs.length > 0) setSelectedId(locs[0].id);
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const times = await locationActions.fetchTravelTimesByMode(transportMode);
        if (!cancelled) setTravelTimes(times);
      } catch (err) {
        if (!cancelled) console.error("Failed to load travel times", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transportMode]);

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
      const next = [...locations, created];
      setLocations(next);
      syncReduxLocations(next);
      setSelectedId(created.id);
      flashSuccess(`Added "${name}".`);
      setAddOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
      throw err;
    }
  };

  const handleRename = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setEditingNameId(null);
      return;
    }
    try {
      const updated = await locationActions.updateLocationName(id, trimmed);
      const next = locations.map((l) => (l.id === id ? updated : l));
      setLocations(next);
      syncReduxLocations(next);
      setEditingNameId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setError(null);
      await locationActions.deleteLocation(deletingId);
      const next = locations.filter((l) => l.id !== deletingId);
      setLocations(next);
      syncReduxLocations(next);
      setTravelTimes((prev) =>
        prev.filter(
          (tt) =>
            tt.fromLocationId !== deletingId && tt.toLocationId !== deletingId,
        ),
      );
      if (selectedId === deletingId) {
        setSelectedId(next[0]?.id ?? null);
      }
      flashSuccess("Location deleted.");
      setDeletingId(null);
    } catch (err) {
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
      const fresh = await locationActions.fetchTravelTimesByMode(transportMode);
      setTravelTimes(fresh);
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
      const fresh = await locationActions.fetchTravelTimesByMode(transportMode);
      setTravelTimes(fresh);
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
      setTravelTimes((prev) =>
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
      const fresh = await locationActions.fetchTravelTimesByMode(transportMode);
      setTravelTimes(fresh);
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
        <span className={spacer} />
        <div className={headActions}>
          <div className={transportSeg}>
            {TRANSPORT_MODES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                className={`${transportSegBtn} ${value === transportMode ? transportSegBtnActive : ""}`}
                onClick={() => handleTransportChange(value)}
                title={label}
              >
                <Icon size={12} strokeWidth={2.2} />
                {label}
              </button>
            ))}
          </div>
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
          <Button
            variant="solid"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={locations.length >= MAX_LOCATIONS}
          >
            <Plus size={12} strokeWidth={2.4} />
            Add location
          </Button>
        </div>
      </div>

      {error && <div className={errorBanner}>{error}</div>}
      {success && <div className={successBanner}>{success}</div>}

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
                const active = loc.id === selectedId;
                const tags = categoryDefaultsByLocation.get(loc.id) ?? [];
                const isEditing = editingNameId === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    className={`${railRow} ${active ? railRowActive : ""}`}
                    onClick={() => setSelectedId(loc.id)}
                  >
                    <span className={railRowPin}>
                      <MapPin size={13} strokeWidth={2.2} />
                    </span>
                    <span className={railRowMeta}>
                      {isEditing ? (
                        <input
                          className={railRowInput}
                          value={nameDraft}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setNameDraft(e.target.value)}
                          onBlur={() => handleRename(loc.id, nameDraft)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleRename(loc.id, nameDraft);
                            }
                            if (e.key === "Escape") setEditingNameId(null);
                          }}
                        />
                      ) : (
                        <span className={railRowName}>{loc.name}</span>
                      )}
                      <span className={railRowAddress}>
                        {loc.address ?? loc.placeId}
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
                    <span className={railRowActions}>
                      {isEditing ? (
                        <>
                          <span
                            role="button"
                            tabIndex={-1}
                            className={railIconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(loc.id, nameDraft);
                            }}
                            aria-label="Save name"
                          >
                            <Check size={12} strokeWidth={2.4} />
                          </span>
                          <span
                            role="button"
                            tabIndex={-1}
                            className={railIconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNameId(null);
                            }}
                            aria-label="Cancel"
                          >
                            <X size={12} strokeWidth={2.4} />
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            role="button"
                            tabIndex={-1}
                            className={railIconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingNameId(loc.id);
                              setNameDraft(loc.name);
                            }}
                            aria-label={`Rename ${loc.name}`}
                          >
                            <Pencil size={12} strokeWidth={2.2} />
                          </span>
                          <span
                            role="button"
                            tabIndex={-1}
                            className={railIconBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(loc.id);
                            }}
                            aria-label={`Delete ${loc.name}`}
                          >
                            <Trash2 size={12} strokeWidth={2.2} />
                          </span>
                        </>
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
              from row · to column · 3 time-of-day values
            </span>
            <span className={matrixLegend}>
              <span>
                <span className={`${legendDot} ${legendDotRush}`} />
                rush
              </span>
              <span>
                <span className={`${legendDot} ${legendDotRegular}`} />
                regular
              </span>
              <span>
                <span className={`${legendDot} ${legendDotNight}`} />
                night
              </span>
            </span>
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

      <EditTravelTimeModal
        open={!!editPair}
        travelTime={selectedTravelTime}
        fromLocation={editFromLocation}
        toLocation={editToLocation}
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
