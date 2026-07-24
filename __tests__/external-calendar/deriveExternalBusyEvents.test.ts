import {
  deriveExternalBusyEvents,
  isExternalEventBusy,
} from "@/utils/external-calendar/deriveExternalBusyEvents";
import {
  parseModeExceptions,
  serializeModeExceptions,
  toggleModeException,
} from "@/utils/external-calendar/modeExceptions";
import {
  ExternalCalendarKind,
  ExternalCalendarMode,
  type ExternalCalendarSource,
  type ExternalEvent,
} from "@/types/prisma";

function makeSource(
  overrides: Partial<ExternalCalendarSource> = {},
): ExternalCalendarSource {
  return {
    id: "src-1",
    userId: "user-1",
    kind: ExternalCalendarKind.ICS,
    url: "https://example.com/cal.ics",
    name: "Test feed",
    color: null,
    enabled: true,
    mode: ExternalCalendarMode.BUSY,
    modeExceptions: null,
    lastFetchedAt: null,
    lastError: null,
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEvent(overrides: Partial<ExternalEvent> = {}): ExternalEvent {
  return {
    id: "src-1|uid-1|2026-07-10T12:00:00.000Z",
    sourceId: "src-1",
    userId: "user-1",
    uid: "uid-1",
    title: "Dentist",
    start: "2026-07-10T12:00:00.000Z",
    end: "2026-07-10T13:00:00.000Z",
    allDay: false,
    ...overrides,
  };
}

describe("deriveExternalBusyEvents", () => {
  it("includes a BUSY source's events as SimpleEvent-shaped external blocks", () => {
    const busy = deriveExternalBusyEvents([makeSource()], [makeEvent()]);

    expect(busy).toHaveLength(1);
    expect(busy[0].id).toBe("src-1|uid-1|2026-07-10T12:00:00.000Z");
    expect(busy[0].duration).toBe(60);
    expect(busy[0].extendedProps?.eventType).toBe("external");
  });

  it("an exception on a BUSY source makes the event visual-only", () => {
    const source = makeSource({
      modeExceptions: serializeModeExceptions(["uid-1"]),
    });
    expect(deriveExternalBusyEvents([source], [makeEvent()])).toHaveLength(0);
  });

  it("a VISUAL source blocks nothing except excepted events", () => {
    const visual = makeSource({ mode: ExternalCalendarMode.VISUAL });
    expect(deriveExternalBusyEvents([visual], [makeEvent()])).toHaveLength(0);

    const withException = makeSource({
      mode: ExternalCalendarMode.VISUAL,
      modeExceptions: serializeModeExceptions(["uid-1"]),
    });
    expect(
      deriveExternalBusyEvents([withException], [makeEvent()]),
    ).toHaveLength(1);
  });

  it("disabled sources, all-day events, and orphaned events never block", () => {
    expect(
      deriveExternalBusyEvents([makeSource({ enabled: false })], [makeEvent()]),
    ).toHaveLength(0);
    expect(
      deriveExternalBusyEvents(
        [makeSource()],
        [makeEvent({ allDay: true })],
      ),
    ).toHaveLength(0);
    expect(
      deriveExternalBusyEvents(
        [makeSource()],
        [makeEvent({ sourceId: "gone" })],
      ),
    ).toHaveLength(0);
  });

  it("isExternalEventBusy agrees with the derivation", () => {
    const busySource = makeSource();
    const exceptedSource = makeSource({
      modeExceptions: serializeModeExceptions(["uid-1"]),
    });
    expect(isExternalEventBusy(busySource, makeEvent())).toBe(true);
    expect(isExternalEventBusy(exceptedSource, makeEvent())).toBe(false);
    expect(isExternalEventBusy(busySource, makeEvent({ allDay: true }))).toBe(
      false,
    );
  });
});

describe("modeExceptions", () => {
  it("round-trips and toggles", () => {
    expect(parseModeExceptions(null)).toEqual([]);
    expect(parseModeExceptions("not json")).toEqual([]);
    expect(serializeModeExceptions([])).toBeNull();

    const once = toggleModeException(null, "uid-1");
    expect(parseModeExceptions(once)).toEqual(["uid-1"]);
    const twice = toggleModeException(once, "uid-1");
    expect(twice).toBeNull();

    const mixed = toggleModeException(once, "uid-2");
    expect(parseModeExceptions(mixed)).toEqual(["uid-1", "uid-2"]);
  });
});
