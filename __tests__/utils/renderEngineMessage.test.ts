import type { EngineMessage } from "@/types/prisma";
import {
  buildEngineMessageLookups,
  renderEngineMessage,
} from "@/utils/renderEngineMessage";

// Null-safety for the precedence message types: presentation prose is derived
// from the current entity tree, so a deleted queue or planner on either end
// must degrade to generic labels — never crash, never return null for a
// well-formed payload.

const baseRow = {
  tone: "warn",
  dismissed: false,
  userId: "u",
  createdAt: "",
  updatedAt: "",
};

const emptyLookups = buildEngineMessageLookups([], [], []);

describe("renderEngineMessage precedence types", () => {
  it("QUEUE_SEQUENCE_BROKEN renders with deleted queue and planner", () => {
    const message: EngineMessage = {
      ...baseRow,
      id: "QUEUE_SEQUENCE_BROKEN::gone-queue|gone-planner",
      type: "QUEUE_SEQUENCE_BROKEN",
      payload: {
        type: "QUEUE_SEQUENCE_BROKEN",
        queueId: "gone-queue",
        failedPlannerId: "gone-planner",
      },
    } as unknown as EngineMessage;

    const rendered = renderEngineMessage(message, emptyLookups);
    expect(rendered).not.toBeNull();
    expect(rendered!.tag).toBe("QUEUE");
    expect(rendered!.title).toContain("a queue");
    expect(rendered!.body).toContain("scheduled without waiting");
  });

  it("DEPENDENCY_BROKEN renders both causes with deleted planners", () => {
    for (const cause of ["failed", "unready"] as const) {
      const message: EngineMessage = {
        ...baseRow,
        id: `DEPENDENCY_BROKEN::p|s|${cause}`,
        type: "DEPENDENCY_BROKEN",
        payload: {
          type: "DEPENDENCY_BROKEN",
          predecessorId: "gone-predecessor",
          successorId: "gone-successor",
          cause,
        },
      } as unknown as EngineMessage;

      const rendered = renderEngineMessage(message, emptyLookups);
      expect(rendered).not.toBeNull();
      expect(rendered!.tag).toBe("PREREQUISITE");
      expect(rendered!.body).toContain("scheduled without waiting");
    }
  });

  it("SEQUENCE_PAST_HORIZON renders with a deleted queue on the payload", () => {
    const message: EngineMessage = {
      ...baseRow,
      id: "SEQUENCE_PAST_HORIZON::p|s",
      type: "SEQUENCE_PAST_HORIZON",
      payload: {
        type: "SEQUENCE_PAST_HORIZON",
        source: "queue",
        queueId: "gone-queue",
        predecessorId: "gone-predecessor",
        successorId: "gone-successor",
      },
    } as unknown as EngineMessage;

    const rendered = renderEngineMessage(message, emptyLookups);
    expect(rendered).not.toBeNull();
    expect(rendered!.tag).toBe("HORIZON");
    expect(rendered!.body).toContain("in a queue");
  });

  it("resolves titles from the lookups when the entities exist", () => {
    const planner = [
      { id: "p1", title: "Get a job" },
      { id: "s1", title: "Buy a car" },
    ] as never[];
    const queues = [{ id: "q1", title: "Work", members: [] }] as never[];
    const lookups = buildEngineMessageLookups(planner, [], queues);

    const message: EngineMessage = {
      ...baseRow,
      id: "QUEUE_SEQUENCE_BROKEN::q1|p1",
      type: "QUEUE_SEQUENCE_BROKEN",
      payload: {
        type: "QUEUE_SEQUENCE_BROKEN",
        queueId: "q1",
        failedPlannerId: "p1",
      },
    } as unknown as EngineMessage;

    const rendered = renderEngineMessage(message, lookups);
    expect(rendered!.title).toContain("Work");
    expect(rendered!.body).toContain("Get a job");
  });
});
