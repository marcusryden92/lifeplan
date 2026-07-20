"use client";

import { space } from "@/lib/theme";
import { useMemo, useReducer, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapPin, Plus, RefreshCw } from "lucide-react";
import {
  Button,
  ConfirmModal,
  Loader,
  PageHeader,
  SegmentedControl,
  vars,
} from "@/components/ui";
import { useFlashValue } from "@/hooks/useFlashAnimation";
import { useServerAction } from "@/hooks/useServerAction";
import { useCalendarProvider } from "@/context/CalendarProvider";
import * as locationActions from "@/actions/locations";
import {
  serializeLocation,
  serializeTravelTime,
  hasCustomOverride,
  isTimeVarying,
} from "@/utils/locations";
import type { RootState } from "@/redux/store";
import {
  upsertLocation,
  removeLocation,
  setAllTravelTimes,
  upsertTravelTime,
  removeTravelTimesByLocationId,
  setDefaultTransportMode,
  type SerializedLocation,
} from "@/redux/slices/schedulingSettingsSlice";
import type { TransportMode } from "@/generated/client";
import { TravelMatrix } from "./_components/TravelMatrix";
import { AddLocationModal } from "./_components/AddLocationModal";
import { EditTravelTimeModal } from "./_components/EditTravelTimeModal";
import {
  EditLocationModal,
  type EditLocationDraft,
} from "./_components/EditLocationModal";
import {
  MAX_LOCATIONS,
  SUCCESS_MESSAGE_MS,
  TRANSPORT_MODE_OPTIONS,
} from "./_constants";
import {
  page,
  spacer,
  headActions,
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
  amberKeyword,
} from "./page.css";

type ModalState =
  | { kind: "none" }
  | { kind: "add" }
  | { kind: "edit"; location: SerializedLocation }
  | { kind: "travel"; from: string; to: string }
  | { kind: "confirmDelete"; locationId: string }
  | { kind: "confirmClearAll" };

type ModalAction =
  | { type: "OPEN_ADD" }
  | { type: "OPEN_EDIT"; location: SerializedLocation }
  | { type: "OPEN_TRAVEL_EDIT"; from: string; to: string }
  | { type: "CONFIRM_DELETE"; locationId: string }
  | { type: "CONFIRM_CLEAR_ALL" }
  | { type: "CLOSE_ALL" };

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case "OPEN_ADD":
      return { kind: "add" };
    case "OPEN_EDIT":
      return { kind: "edit", location: action.location };
    case "OPEN_TRAVEL_EDIT":
      return { kind: "travel", from: action.from, to: action.to };
    case "CONFIRM_DELETE":
      return { kind: "confirmDelete", locationId: action.locationId };
    case "CONFIRM_CLEAR_ALL":
      return { kind: "confirmClearAll" };
    case "CLOSE_ALL":
      return { kind: "none" };
  }
}

export default function LocationsPage() {
  // NOTE: this page does NOT refetch locations on mount. UserProvider already
  // loads them on auth via fetchAllSchedulingData and pushes them into Redux.
  // A page-level dispatch raced with useCalendarServerSync's diff hook and
  // could cascade-delete locations on the server if the racing fetch ever
  // returned an empty list. Trust Redux as the source of truth.
  const dispatch = useDispatch();
  const { categories, markSynced, updateAll } = useCalendarProvider();

  const locations = useSelector(
    (state: RootState) => state.schedulingSettings.locations,
  );
  const allTravelTimes = useSelector(
    (state: RootState) => state.schedulingSettings.allTravelTimes,
  );
  const transportMode = useSelector(
    (state: RootState) => state.schedulingSettings.defaultTransportMode,
  );
  const isLoaded = useSelector(
    (state: RootState) => state.schedulingSettings.isLoaded,
  );

  const [modal, modalDispatch] = useReducer(modalReducer, { kind: "none" });

  const [error, setError] = useState<string | null>(null);
  const [success, flashSuccess] = useFlashValue<string | null>(
    SUCCESS_MESSAGE_MS,
    null,
  );

  const fetchMissing = useServerAction(locationActions.fetchMissingTravelTimes);
  const working = fetchMissing.isPending;

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

  const timeVarying = isTimeVarying(transportMode);
  const anyCustomOverride = travelTimes.some(hasCustomOverride);

  const editingLocation =
    modal.kind === "edit" ? modal.location : null;
  const editPair =
    modal.kind === "travel" ? { from: modal.from, to: modal.to } : null;
  const deletingId =
    modal.kind === "confirmDelete" ? modal.locationId : null;
  const confirmClearAll = modal.kind === "confirmClearAll";

  const selectedTravelTime = editPair
    ? (travelTimes.find(
        (tt) =>
          tt.fromLocationId === editPair.from &&
          tt.toLocationId === editPair.to,
      ) ?? null)
    : null;
  const editFromLocation = editPair
    ? (locations.find((l) => l.id === editPair.from) ?? null)
    : null;
  const editToLocation = editPair
    ? (locations.find((l) => l.id === editPair.to) ?? null)
    : null;

  const handleTransportChange = async (mode: TransportMode) => {
    const previous = transportMode;
    dispatch(setDefaultTransportMode(mode));
    try {
      await locationActions.updateDefaultTransportMode(mode);
    } catch (err) {
      dispatch(setDefaultTransportMode(previous));
      console.error("Failed to persist transport mode", err);
    }
  };

  // Mirrors the upsertLocation reducer so markSynced can be handed the exact
  // post-dispatch array without waiting for a re-render.
  const upsertIntoList = (
    list: SerializedLocation[],
    row: SerializedLocation,
  ): SerializedLocation[] => {
    const idx = list.findIndex((l) => l.id === row.id);
    if (idx === -1) return [...list, row];
    const next = [...list];
    next[idx] = row;
    return next;
  };

  // Add is server-first because the row's id is server-generated. The
  // returned row goes straight into Redux so the rest of the app sees the
  // new location without a separate sync step. markSynced advances the sync
  // refs so the diff doesn't treat the server-created row as a client change.
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
      const serialized = serializeLocation(created);
      dispatch(upsertLocation(serialized));
      markSynced("locations", upsertIntoList(locations, serialized));
      flashSuccess(`Added "${name}".`);
      modalDispatch({ type: "CLOSE_ALL" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add location");
      throw err;
    }
  };

  // Edit splits two ways:
  //   - name-only changes flow through Redux. The diff in useCalendarServerSync
  //     picks them up and sends location.update.
  //   - placeId changes still hit the server directly so updateLocation can do
  //     the Google Places lookup and cascade-delete travel times.
  const handleSaveEdit = async (draft: EditLocationDraft) => {
    if (!editingLocation) return;
    const original = editingLocation;
    const trimmedName = draft.name.trim();

    if (!draft.placeId) {
      dispatch(
        upsertLocation({
          ...original,
          name: trimmedName,
        }),
      );
      modalDispatch({ type: "CLOSE_ALL" });
      flashSuccess("Location updated.");
      return;
    }

    const optimistic: SerializedLocation = {
      ...original,
      name: trimmedName,
    };
    dispatch(upsertLocation(optimistic));
    modalDispatch({ type: "CLOSE_ALL" });

    try {
      const updated = await locationActions.updateLocation(original.id, {
        name: trimmedName !== original.name ? trimmedName : undefined,
        placeId: draft.placeId,
        sessionToken: draft.sessionToken,
      });
      const serialized = serializeLocation(updated);
      dispatch(upsertLocation(serialized));
      // updateLocation cascades the affected travel times server-side; mirror
      // that in Redux so the matrix shows them as missing immediately, and
      // advance the sync refs so neither shows up as a phantom diff.
      dispatch(removeTravelTimesByLocationId(updated.id));
      markSynced("locations", upsertIntoList(locations, serialized));
      markSynced(
        "travelTimes",
        allTravelTimes.filter(
          (tt) =>
            tt.fromLocationId !== updated.id && tt.toLocationId !== updated.id,
        ),
      );
      flashSuccess("Location updated.");
    } catch (err) {
      dispatch(upsertLocation(original));
      setError(err instanceof Error ? err.message : "Failed to update");
    }
  };

  // Delete is pure Redux dispatch — the diff sends location.destroy and
  // Prisma cascades the related travel times server-side. The client-side
  // travel-time removal keeps the matrix in sync immediately.
  const handleDelete = () => {
    if (!deletingId) return;
    const deletedId = deletingId;
    const original = locations.find((l) => l.id === deletedId);
    if (!original) return;
    dispatch(removeLocation(deletedId));
    dispatch(removeTravelTimesByLocationId(deletedId));
    // Mirror the server's SetNull cascade: planner/category/template rows that
    // pointed at the deleted location fall back to "Anywhere". Routing it
    // through updateAll both nulls the ids and regenerates, so no stale
    // locationId survives in Redux and the calendar drops travel to/from it.
    updateAll(
      (prev) =>
        prev.map((p) =>
          p.locationId === deletedId ? { ...p, locationId: null } : p,
        ),
      undefined,
      (prev) =>
        prev.map((t) =>
          t.locationId === deletedId ? { ...t, locationId: null } : t,
        ),
      (prev) =>
        prev.map((c) =>
          c.locationId === deletedId ? { ...c, locationId: null } : c,
        ),
    );
    modalDispatch({ type: "CLOSE_ALL" });
    flashSuccess("Location deleted.");
  };

  const handleFetchMissing = async () => {
    if (locations.length < 2) {
      setError("Add at least 2 locations to fetch travel times.");
      return;
    }
    setError(null);
    const result = await fetchMissing.run(transportMode);
    if (!result) return;
    const fresh = await locationActions.fetchTravelTimes();
    const serialized = fresh.map(serializeTravelTime);
    dispatch(setAllTravelTimes(serialized));
    markSynced("travelTimes", serialized);
    flashSuccess(
      result.fetched > 0
        ? `Fetched ${result.fetched} travel time${result.fetched > 1 ? "s" : ""}.`
        : "All travel times are up to date.",
    );
  };

  // Travel-time overrides flow through Redux. The diff picks up the changed
  // custom fields and sends travelTime.update.
  const handleSaveOverrides = (
    travelTimeId: string,
    overrides: {
      customRushHourMinutes: number | null;
      customRegularMinutes: number | null;
      customNightMinutes: number | null;
    },
  ) => {
    const current = allTravelTimes.find((tt) => tt.id === travelTimeId);
    if (!current) return;
    dispatch(
      upsertTravelTime({
        ...current,
        ...overrides,
      }),
    );
  };

  const handleClearAllOverrides = () => {
    modalDispatch({ type: "CLOSE_ALL" });
    const customized = travelTimes.filter(hasCustomOverride);
    if (customized.length === 0) return;
    for (const tt of customized) {
      dispatch(
        upsertTravelTime({
          ...tt,
          customRushHourMinutes: null,
          customRegularMinutes: null,
          customNightMinutes: null,
        }),
      );
    }
    flashSuccess("All overrides cleared.");
  };

  const combinedError = error ?? fetchMissing.status?.text ?? null;

  if (!isLoaded) {
    return (
      <div className={page}>
        <PageHeader title="Locations" />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 28px 28px",
            marginBottom: space["12"],
          }}
        >
          <Loader size="md" label="Loading locations" />
        </div>
      </div>
    );
  }

  return (
    <div className={page}>
      <PageHeader title="Locations">
        {combinedError && <div className={errorBanner}>{combinedError}</div>}
        {success && !combinedError && (
          <div className={successBanner}>{success}</div>
        )}
        <span className={spacer} />
        <div className={headActions}>
          <SegmentedControl<TransportMode>
            value={transportMode}
            onChange={handleTransportChange}
            options={TRANSPORT_MODE_OPTIONS}
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
        </div>
      </PageHeader>

      <div className={mainGrid}>
        <aside className={rail}>
          <div className={railHead}>Locations</div>
          <div className={railBody}>
            {locations.length === 0 ? (
              <div
                style={{
                  padding: "12px 8px",
                  fontSize: 12.5,
                  color: vars.muted,
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
                    onClick={() =>
                      modalDispatch({ type: "OPEN_EDIT", location: loc })
                    }
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
            <Button
              variant="ghost"
              size="sm"
              className={railNewButton}
              onClick={() => modalDispatch({ type: "OPEN_ADD" })}
              disabled={locations.length >= MAX_LOCATIONS}
            >
              <Plus size={13} strokeWidth={2.4} />
              {locations.length >= MAX_LOCATIONS
                ? `Max ${MAX_LOCATIONS} reached`
                : "Add location"}
            </Button>
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
              {timeVarying
                ? "from row · to column · 3 time-of-day values"
                : "from row · to column · minutes (constant)"}
            </span>
            {timeVarying && (
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
          ) : working ? (
            <div className={matrixEmpty}>
              <Loader size="md" label="Refreshing travel times" />
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
                onEditPair={(from, to) =>
                  modalDispatch({ type: "OPEN_TRAVEL_EDIT", from, to })
                }
                onFetchMissing={handleFetchMissing}
              />
              <div className={matrixFooter}>
                <span>
                  Cells tinted <span className={amberKeyword}>amber</span> are
                  custom overrides; click any cell to edit all three periods.
                </span>
                <span style={{ flex: 1 }} />
                <Button
                  variant="ghost"
                  size="sm"
                  className={matrixFooterAction}
                  disabled={!anyCustomOverride || working}
                  onClick={() => modalDispatch({ type: "CONFIRM_CLEAR_ALL" })}
                >
                  Clear all overrides
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <AddLocationModal
        open={modal.kind === "add"}
        onClose={() => modalDispatch({ type: "CLOSE_ALL" })}
        onAdd={handleAdd}
      />

      <EditLocationModal
        open={modal.kind === "edit"}
        location={editingLocation}
        onClose={() => modalDispatch({ type: "CLOSE_ALL" })}
        onSave={handleSaveEdit}
        onRequestDelete={() => {
          if (editingLocation)
            modalDispatch({
              type: "CONFIRM_DELETE",
              locationId: editingLocation.id,
            });
        }}
      />

      <EditTravelTimeModal
        open={modal.kind === "travel"}
        travelTime={selectedTravelTime}
        fromLocation={editFromLocation}
        toLocation={editToLocation}
        transportMode={transportMode}
        onClose={() => modalDispatch({ type: "CLOSE_ALL" })}
        onSave={handleSaveOverrides}
      />

      <ConfirmModal
        open={!!deletingId}
        title="Delete location?"
        tone="danger"
        confirmLabel="Delete"
        body={
          <p style={{ margin: 0 }}>
            Delete &ldquo;
            {locations.find((l) => l.id === deletingId)?.name ??
              "this location"}
            &rdquo;? This will also remove all travel times to and from it.
            Items and categories that point at it will fall back to
            &ldquo;Anywhere&rdquo;.
          </p>
        }
        onCancel={() => modalDispatch({ type: "CLOSE_ALL" })}
        onConfirm={handleDelete}
      />

      <ConfirmModal
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
        onCancel={() => modalDispatch({ type: "CLOSE_ALL" })}
        onConfirm={handleClearAllOverrides}
      />
    </div>
  );
}
