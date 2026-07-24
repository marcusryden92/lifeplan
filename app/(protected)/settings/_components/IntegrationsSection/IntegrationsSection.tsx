"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { format } from "date-fns";
import { CalendarPlus, RefreshCw, Trash2 } from "lucide-react";
import type { AppDispatch } from "@/redux/store";
import {
  applyExternalRefresh,
  upsertExternalSource,
  removeExternalSource,
} from "@/redux/slices/externalCalendarSlice";
import {
  addExternalCalendarSource,
  refreshExternalCalendarSource,
  updateExternalCalendarSource,
  deleteExternalCalendarSource,
} from "@/actions/externalCalendars";
import {
  getGoogleCalendarStatus,
  listGoogleCalendars,
  addGoogleCalendarSource,
  disconnectGoogleCalendar,
} from "@/actions/googleCalendar";
import type { GoogleCalendarListEntry } from "@/utils/external-calendar/googleCalendarApi";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useServerAction } from "@/hooks/useServerAction";
import {
  ExternalCalendarKind,
  ExternalCalendarMode,
  type ExternalCalendarSource,
} from "@/types/prisma";
import {
  Button,
  ConfirmModal,
  Input,
  SegmentedControl,
  Switch,
} from "@/components/ui";
import { PopoverColorPicker } from "@/components/events/PopoverColorPicker";
import { StatusLine } from "../StatusLine";
import { card, cardTitle, fieldNote, footerRow } from "../../page.css";
import {
  addForm,
  addRow,
  urlInputWrap,
  nameInputWrap,
  sourceList,
  sourceRow,
  sourceHead,
  sourceName,
  sourceUrl,
  sourceMeta,
  sourceError,
  sourceControls,
  controlSpacer,
  enabledLabel,
  disabledNote,
  emptyNote,
  removeBtnDanger,
  googleRow,
  googleLabel,
  googleTitle,
  googleHint,
  calendarPickerList,
  calendarPickerRow,
  calendarDot,
  calendarPickerName,
  calendarPickerRole,
} from "./IntegrationsSection.css";

type ModeKey = "BUSY" | "VISUAL";

const MODE_OPTIONS: { key: ModeKey; label: string }[] = [
  { key: "BUSY", label: "Blocks time" },
  { key: "VISUAL", label: "Overlay only" },
];

const FALLBACK_DOT_COLOR = "#8b8b8b";

export function IntegrationsSection() {
  const dispatch = useDispatch<AppDispatch>();
  const { updateAll, externalSources, externalEvents } = useCalendarProvider();

  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [confirmRemove, setConfirmRemove] =
    useState<ExternalCalendarSource | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);

  // null = status still loading.
  const [google, setGoogle] = useState<{
    connected: boolean;
    email?: string | null;
  } | null>(null);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerCalendars, setPickerCalendars] = useState<
    GoogleCalendarListEntry[] | null
  >(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [addingCalendarId, setAddingCalendarId] = useState<string | null>(null);

  useEffect(() => {
    void getGoogleCalendarStatus().then(setGoogle);
  }, []);

  // The OAuth callback lands back here with ?google=connected|error.
  useEffect(() => {
    const flag = new URLSearchParams(window.location.search).get("google");
    if (!flag) return;
    setGoogleNotice(
      flag === "connected"
        ? "Google account connected."
        : "Google connection failed — try again.",
    );
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const googleSources = useMemo(
    () =>
      externalSources.filter((s) => s.kind === ExternalCalendarKind.GOOGLE),
    [externalSources],
  );
  const googleSourceCount = googleSources.length;

  const connectedGoogleCalendarIds = useMemo(
    () => new Set(googleSources.map((s) => s.url)),
    [googleSources],
  );

  const eventCountBySource = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of externalEvents) {
      counts.set(event.sourceId, (counts.get(event.sourceId) ?? 0) + 1);
    }
    return counts;
  }, [externalEvents]);

  const addAction = useServerAction(addExternalCalendarSource);

  const handleAdd = useCallback(async () => {
    if (!url.trim()) return;
    addAction.clear();
    const result = await addAction.run({
      url,
      name: name.trim() || undefined,
    });
    if (!result) return;
    if (!result.success) {
      addAction.setError(result.error);
      return;
    }
    dispatch(
      applyExternalRefresh({ source: result.source, events: result.events }),
    );
    updateAll();
    setUrl("");
    setName("");
    addAction.setSuccess(
      `Connected "${result.source.name}" — ${result.events.length} events imported.`,
    );
  }, [url, name, addAction, dispatch, updateAll]);

  const handleRefresh = useCallback(
    async (source: ExternalCalendarSource) => {
      setBusySourceId(source.id);
      try {
        const result = await refreshExternalCalendarSource(source.id);
        if (result.success) {
          dispatch(
            applyExternalRefresh({
              source: result.source,
              events: result.events,
            }),
          );
          updateAll();
        } else if (result.source) {
          dispatch(upsertExternalSource(result.source));
        }
      } finally {
        setBusySourceId(null);
      }
    },
    [dispatch, updateAll],
  );

  const handlePatch = useCallback(
    async (
      source: ExternalCalendarSource,
      patch: Parameters<typeof updateExternalCalendarSource>[1],
      regen: boolean,
    ) => {
      // Optimistic: the row and the regen reflect the change immediately;
      // the server result settles it, a failure rolls both back.
      dispatch(upsertExternalSource({ ...source, ...patch }));
      if (regen) updateAll();
      const result = await updateExternalCalendarSource(source.id, patch);
      if (result.success) {
        dispatch(upsertExternalSource(result.source));
      } else {
        dispatch(upsertExternalSource(source));
        if (regen) updateAll();
      }
    },
    [dispatch, updateAll],
  );

  const openPicker = useCallback(async () => {
    setPickerOpen(true);
    setPickerError(null);
    setPickerCalendars(null);
    const result = await listGoogleCalendars();
    if (result.success) {
      setPickerCalendars(result.calendars);
    } else {
      setPickerCalendars([]);
      setPickerError(result.error);
    }
  }, []);

  const handleAddGoogle = useCallback(
    async (calendar: GoogleCalendarListEntry) => {
      setAddingCalendarId(calendar.id);
      setPickerError(null);
      try {
        const result = await addGoogleCalendarSource({
          calendarId: calendar.id,
          name: calendar.summary,
          color: calendar.backgroundColor,
        });
        if (result.success) {
          dispatch(
            applyExternalRefresh({
              source: result.source,
              events: result.events,
            }),
          );
          updateAll();
        } else {
          setPickerError(result.error);
        }
      } finally {
        setAddingCalendarId(null);
      }
    },
    [dispatch, updateAll],
  );

  const handleDisconnect = useCallback(async () => {
    setConfirmDisconnect(false);
    const result = await disconnectGoogleCalendar();
    if (!result.success) return;
    setGoogle({ connected: false });
    setPickerOpen(false);
    setPickerCalendars(null);
    for (const id of result.removedSourceIds) {
      dispatch(removeExternalSource(id));
    }
    if (result.removedSourceIds.length > 0) updateAll();
    setGoogleNotice(
      result.revoked
        ? "Google account disconnected."
        : "Disconnected here, but Google couldn't confirm the access was revoked. To be safe, remove Circadium under your Google account's Security → Third-party access.",
    );
  }, [dispatch, updateAll]);

  const handleRemove = useCallback(async () => {
    if (!confirmRemove) return;
    const source = confirmRemove;
    const events = externalEvents.filter((e) => e.sourceId === source.id);
    setConfirmRemove(null);
    // Optimistic: the source and its events leave the calendar immediately;
    // a failed delete restores them wholesale.
    dispatch(removeExternalSource(source.id));
    updateAll();
    const result = await deleteExternalCalendarSource(source.id);
    if (!result.success) {
      dispatch(applyExternalRefresh({ source, events }));
      updateAll();
    }
  }, [confirmRemove, externalEvents, dispatch, updateAll]);

  return (
    <>
      <div className={card}>
        <span className={cardTitle}>Connected calendars</span>
        <span className={fieldNote}>
          Subscribe to a calendar feed by URL (ICS). Google Calendar, Outlook,
          and Apple Calendar all provide a private &ldquo;secret address&rdquo;
          you can paste here. Imported events show on your calendar and, by
          default, block the scheduler from placing work over them.
        </span>

        <div className={addForm}>
          <div className={addRow}>
            <span className={urlInputWrap}>
              <Input
                placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
                value={url}
                autoComplete="off"
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
              />
            </span>
            <span className={nameInputWrap}>
              <Input
                placeholder="Name (optional)"
                value={name}
                maxLength={50}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleAdd();
                }}
              />
            </span>
            <Button
              variant="glass"
              size="sm"
              onClick={() => void handleAdd()}
              disabled={addAction.isPending || !url.trim()}
            >
              <CalendarPlus size={12} strokeWidth={2.2} />
              {addAction.isPending ? "Connecting…" : "Connect"}
            </Button>
          </div>
          <div className={footerRow}>
            <StatusLine status={addAction.status} />
          </div>
        </div>

        <div className={googleRow}>
          <div className={googleLabel}>
            <span className={googleTitle}>
              {google?.connected
                ? `Google account · ${google.email ?? "connected"}`
                : "Google account"}
            </span>
            <span className={googleHint}>
              {googleNotice ??
                (google?.connected
                  ? "Import calendars this account can see — coworkers, rooms, secondary calendars."
                  : "Connect to import calendars shared with you (coworkers, rooms) without hunting for feed URLs.")}
            </span>
          </div>
          {google?.connected ? (
            <>
              <Button
                variant="glass"
                size="sm"
                onClick={() =>
                  pickerOpen ? setPickerOpen(false) : void openPicker()
                }
              >
                <CalendarPlus size={12} strokeWidth={2.2} />
                {pickerOpen ? "Hide calendars" : "Add from Google"}
              </Button>
              <Button
                variant="glass"
                size="sm"
                className={removeBtnDanger}
                onClick={() => setConfirmDisconnect(true)}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              variant="glass"
              size="sm"
              disabled={google === null}
              onClick={() => {
                window.location.href = "/api/integrations/google/connect";
              }}
            >
              Connect Google
            </Button>
          )}
        </div>

        {pickerOpen && (
          <div className={calendarPickerList}>
            {pickerError && <span className={sourceError}>{pickerError}</span>}
            {pickerCalendars === null ? (
              <span className={emptyNote}>Loading calendars…</span>
            ) : (
              pickerCalendars.map((calendar) => {
                const already = connectedGoogleCalendarIds.has(calendar.id);
                const adding = addingCalendarId === calendar.id;
                return (
                  <div key={calendar.id} className={calendarPickerRow}>
                    <span
                      aria-hidden
                      className={calendarDot}
                      style={{
                        background:
                          calendar.backgroundColor ?? FALLBACK_DOT_COLOR,
                      }}
                    />
                    <span className={calendarPickerName}>
                      {calendar.summary}
                    </span>
                    <span className={calendarPickerRole}>
                      {calendar.primary
                        ? "primary"
                        : calendar.accessRole === "freeBusyReader"
                          ? "free/busy only"
                          : calendar.accessRole}
                    </span>
                    <Button
                      variant="glass"
                      size="sm"
                      disabled={already || adding}
                      onClick={() => void handleAddGoogle(calendar)}
                    >
                      {already ? "Added" : adding ? "Adding…" : "Add"}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {externalSources.length === 0 ? (
          <span className={emptyNote}>No calendars connected yet.</span>
        ) : (
          <div className={sourceList}>
            {externalSources.map((source) => {
              const count = eventCountBySource.get(source.id) ?? 0;
              const pending = busySourceId === source.id;
              return (
                <div
                  key={source.id}
                  className={`${sourceRow}${source.enabled ? "" : ` ${disabledNote}`}`}
                >
                  <div className={sourceHead}>
                    <span className={sourceName}>{source.name}</span>
                    <span className={sourceUrl}>
                      {source.kind === ExternalCalendarKind.GOOGLE
                        ? `Google · ${source.url}`
                        : source.url}
                    </span>
                  </div>
                  <div className={sourceControls}>
                    <SegmentedControl
                      options={MODE_OPTIONS}
                      value={source.mode as ModeKey}
                      onChange={(key) =>
                        void handlePatch(
                          source,
                          { mode: key as ExternalCalendarMode },
                          true,
                        )
                      }
                    />
                    <PopoverColorPicker
                      currentColor={source.color ?? FALLBACK_DOT_COLOR}
                      onChange={(color) =>
                        void handlePatch(source, { color }, false)
                      }
                    />
                    <span className={controlSpacer} />
                    <span className={enabledLabel}>
                      Enabled
                      <Switch
                        checked={source.enabled}
                        onCheckedChange={(checked) =>
                          void handlePatch(source, { enabled: checked }, true)
                        }
                        aria-label={`Enable ${source.name}`}
                      />
                    </span>
                    <Button
                      variant="glass"
                      size="sm"
                      onClick={() => void handleRefresh(source)}
                      disabled={pending}
                    >
                      <RefreshCw size={12} strokeWidth={2.2} />
                      {pending ? "Refreshing…" : "Refresh"}
                    </Button>
                    <Button
                      variant="glass"
                      size="sm"
                      className={removeBtnDanger}
                      onClick={() => setConfirmRemove(source)}
                    >
                      <Trash2 size={12} strokeWidth={2.2} />
                      Remove
                    </Button>
                  </div>
                  {source.lastError ? (
                    <span className={sourceError}>
                      Last refresh failed: {source.lastError}
                    </span>
                  ) : (
                    <span className={sourceMeta}>
                      {count} events
                      {source.lastFetchedAt
                        ? ` · refreshed ${format(
                            new Date(source.lastFetchedAt),
                            "MMM d, HH:mm",
                          )}`
                        : ""}
                      {source.mode === "VISUAL"
                        ? " · overlay only — the scheduler may place work over these events"
                        : ""}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={card}>
        <span className={cardTitle}>Provider sync</span>
        <span className={fieldNote}>
          Google calendars added through your connected account refresh via the
          Google Calendar API; ICS feeds re-fetch their URL. Both refresh about
          once an hour when you use the app, or manually with Refresh. Direct
          Outlook account sync and two-way sync are on the roadmap.
        </span>
      </div>

      <ConfirmModal
        open={confirmRemove !== null}
        title={`Remove "${confirmRemove?.name ?? ""}"?`}
        confirmLabel="Remove"
        body={
          <p style={{ margin: 0 }}>
            The subscription and its imported events are removed from your
            calendar. The source calendar itself is untouched, and you can
            reconnect the URL at any time.
          </p>
        }
        onCancel={() => setConfirmRemove(null)}
        onConfirm={() => void handleRemove()}
      />

      <ConfirmModal
        open={confirmDisconnect}
        tone="danger"
        title="Disconnect Google account?"
        confirmLabel="Disconnect"
        body={
          <p style={{ margin: 0 }}>
            Circadium&apos;s access to your Google Calendar is revoked and every
            calendar imported through this account
            {googleSourceCount > 0 ? ` (${googleSourceCount})` : ""}, along with
            their events, is removed from your calendar. Your Google Calendar
            itself is untouched, and you can reconnect at any time.
          </p>
        }
        onCancel={() => setConfirmDisconnect(false)}
        onConfirm={() => void handleDisconnect()}
      />
    </>
  );
}
