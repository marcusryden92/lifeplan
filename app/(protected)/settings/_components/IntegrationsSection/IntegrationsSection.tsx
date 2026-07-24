"use client";

import { useCallback, useMemo, useState } from "react";
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
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useServerAction } from "@/hooks/useServerAction";
import {
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
  const [busySourceId, setBusySourceId] = useState<string | null>(null);

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
                    <span className={sourceUrl}>{source.url}</span>
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
          Direct Google Calendar and Outlook account sync (live updates,
          two-way) is on the roadmap. ICS feeds refresh about once an hour when
          you use the app, or manually with Refresh.
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
    </>
  );
}
