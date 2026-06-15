"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { ChevronDown, CornerDownLeft, Plus, Sparkles } from "lucide-react";
import { Button, Caption, CategoryDot, Loader } from "@/components/ui";
import { useCalendarProvider } from "@/context/CalendarProvider";
import { useSelector } from "react-redux";
import { usePlatform } from "@/hooks/usePlatform";
import { useListKeyboardNav } from "@/hooks/useListKeyboardNav";
import useClickOutside from "@/hooks/useClickOutside";
import { deleteGoal } from "@/utils/goalPageHandlers";
import type { RootState } from "@/redux/store";
import type { Planner, Category } from "@/types/prisma";
import type { PlannerType } from "@/lib/generated/db-client";
import {
  page,
  subHeader,
  pageTitle,
  titleSummary,
  spacer,
  kbdHint,
  kbd,
  mainGrid,
  queueRail,
  queueHead,
  queueTitle,
  quickAdd,
  quickAddInput,
  queueList,
  queueRow,
  queueRowActive,
  queueRowTitle,
  queueRowAge,
  queueEmpty,
  main,
  breadcrumb,
  card,
  itemTitle,
  typeGrid,
  typeCard,
  typeCardActive,
  typeCardDanger,
  typeCardLabel,
  typeCardSub,
  typeCardKbd,
  fieldGrid,
  field,
  fieldLabel,
  fieldInput,
  actionRow,
  footerHint,
  emptyMain,
  emptyMainTitle,
  categoryTrigger,
  categoryTriggerLabel,
  categoryTriggerEmpty,
  categoryTriggerChevron,
  categoryDropdownWrap,
  categoryDropdown,
  categoryDropdownItem,
  categoryDropdownItemActive,
  categoryDropdownItemMuted,
} from "./page.css";

type TriageType = "task" | "plan" | "goal";

function ageLabel(createdAt: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

// Items that need triage: top-level, not completed, no duration set.
// Goals enter the queue too — their duration is 0 by default and triage is
// where the user assigns a deadline + category before opening it up for
// subtasks.
function isUnprocessed(item: Planner): boolean {
  if (item.parentId) return false;
  if (item.completedEndTime) return false;
  return !item.duration || item.duration === 0;
}

export default function CapturePage() {
  const router = useRouter();
  const { userId, planner, categories, updatePlannerArray, updateAll } =
    useCalendarProvider();
  const isLoaded = useSelector((state: RootState) => state.calendar.isLoaded);
  const { modKey } = usePlatform();

  const queue = useMemo(
    () =>
      planner
        .filter(isUnprocessed)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        ),
    [planner],
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [jot, setJot] = useState("");

  // Pin selection to the first queue item when nothing is selected, or when
  // the previous selection drops out (saved / trashed). Stays put across
  // re-renders while still on a valid item.
  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !queue.find((q) => q.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  const selected = useMemo(
    () => (selectedId ? queue.find((q) => q.id === selectedId) ?? null : null),
    [queue, selectedId],
  );

  // Draft state — local edits before commit. Reset whenever the selected
  // item changes so the right side never shows stale form values.
  const [draftType, setDraftType] = useState<TriageType>("task");
  const [draftDuration, setDraftDuration] = useState<number>(30);
  const [draftDeadline, setDraftDeadline] = useState<string>("");
  const [draftStarts, setDraftStarts] = useState<string>("");
  const [draftCategoryId, setDraftCategoryId] = useState<string>("");

  useEffect(() => {
    if (!selected) return;
    setDraftType(
      selected.plannerType === "plan"
        ? "plan"
        : selected.plannerType === "goal"
          ? "goal"
          : "task",
    );
    setDraftDuration(selected.duration > 0 ? selected.duration : 30);
    setDraftDeadline(
      selected.deadline ? selected.deadline.slice(0, 10) : "",
    );
    setDraftStarts(
      selected.starts ? selected.starts.slice(0, 16) : "",
    );
    setDraftCategoryId(selected.categoryId ?? "");
  }, [selected]);

  const advanceAfterSelectedId = useCallback(
    (id: string) => {
      const idx = queue.findIndex((q) => q.id === id);
      const next = queue[idx + 1] ?? queue[idx - 1] ?? null;
      setSelectedId(next ? next.id : null);
    },
    [queue],
  );

  const handleQuickAdd = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      const t = jot.trim();
      if (!t) return;
      const now = new Date().toISOString();
      const newItem: Planner = {
        id: uuidv4(),
        title: t,
        parentId: null,
        plannerType: "task",
        isReady: false,
        duration: 0,
        deadline: null,
        starts: null,
        dependency: null,
        completedStartTime: null,
        completedEndTime: null,
        priority: 5,
        userId,
        color: null,
        locationId: null,
        useParentLocation: false,
        categoryId: null,
        createdAt: now,
        updatedAt: now,
      };
      updatePlannerArray((prev: Planner[]) => [...prev, newItem]);
      setJot("");
    },
    [jot, userId, updatePlannerArray],
  );

  const commitSelected = useCallback(
    (markReady: boolean) => {
      if (!selected) return;
      const id = selected.id;
      const isGoal = draftType === "goal";
      // Goals need subtasks before they can be marked ready (enforced on the
      // item detail). Tasks need a deadline, plans need a start time. If the
      // user asked to mark-ready but the prerequisites aren't met, fall back
      // to saving as a draft rather than persisting an invalid state.
      const eligibleForReady =
        !isGoal &&
        (draftType === "plan" ? draftStarts.length > 0 : draftDeadline.length > 0);
      const nextReady = markReady && eligibleForReady;
      const nowIso = new Date().toISOString();
      const deadlineIso = draftDeadline
        ? new Date(draftDeadline).toISOString()
        : null;
      const startsIso =
        draftType === "plan" && draftStarts
          ? new Date(draftStarts).toISOString()
          : null;
      updatePlannerArray((prev: Planner[]) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                plannerType: draftType,
                duration: isGoal ? 0 : Math.max(1, draftDuration),
                deadline: deadlineIso,
                starts: startsIso,
                categoryId: draftCategoryId || null,
                isReady: nextReady,
                updatedAt: nowIso,
              }
            : p,
        ),
      );
      advanceAfterSelectedId(id);
    },
    [
      selected,
      draftType,
      draftDuration,
      draftDeadline,
      draftStarts,
      draftCategoryId,
      updatePlannerArray,
      advanceAfterSelectedId,
    ],
  );

  const skipSelected = useCallback(() => {
    if (!selected) return;
    advanceAfterSelectedId(selected.id);
  }, [selected, advanceAfterSelectedId]);

  const trashSelected = useCallback(() => {
    if (!selected) return;
    const id = selected.id;
    deleteGoal({ updateAll, taskId: id, parentId: null });
    advanceAfterSelectedId(id);
  }, [selected, updateAll, advanceAfterSelectedId]);

  // Global keyboard handlers — only when no input has focus, so typing in
  // the quick-add or a field doesn't trigger type switches.
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") (target as HTMLElement).blur();
        return;
      }
      // Skip events originating inside the category picker so arrow keys
      // navigate the dropdown instead of the queue, and Enter commits the
      // dropdown selection instead of the triage item.
      if (target?.closest("[data-capture-picker]")) return;
      if (e.key === "1") {
        setDraftType("task");
      } else if (e.key === "2") {
        setDraftType("plan");
      } else if (e.key === "3") {
        setDraftType("goal");
      } else if (e.key.toLowerCase() === "x") {
        e.preventDefault();
        trashSelected();
      } else if (e.key === "Enter") {
        e.preventDefault();
        commitSelected(true);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (queue.length < 2) return;
        e.preventDefault();
        const idx = queue.findIndex((q) => q.id === selected.id);
        if (idx === -1) return;
        const delta = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = (idx + delta + queue.length) % queue.length;
        setSelectedId(queue[nextIdx].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, queue, commitSelected, trashSelected]);

  const selectedCategory: Category | null = useMemo(() => {
    if (!draftCategoryId) return null;
    return categories.find((c) => c.id === draftCategoryId) ?? null;
  }, [categories, draftCategoryId]);

  const TYPE_OPTIONS: Array<{
    key: TriageType;
    label: string;
    sub: string;
    hint: string;
  }> = [
    { key: "task", label: "task", sub: "scheduler picks a slot", hint: "1" },
    { key: "plan", label: "plan", sub: "fixed time", hint: "2" },
    { key: "goal", label: "goal", sub: "holds subtasks", hint: "3" },
  ];

  return (
    <div className={page}>
      <div className={subHeader}>
        <h1 className={pageTitle}>Capture</h1>
        <span className={titleSummary}>
          {queue.length === 0
            ? "Inbox empty"
            : `${queue.length} to triage · raw notes → schedulable items`}
        </span>
        <span className={spacer} />
        <span className={kbdHint}>
          <span className={kbd}>{modKey}</span>
          <span className={kbd}>K</span>
          <Caption>capture</Caption>
        </span>
      </div>

      <div className={mainGrid}>
        <aside className={queueRail}>
          <div className={queueHead}>
            <span className={queueTitle}>Queue</span>
            <Caption>oldest first</Caption>
          </div>

          <div className={quickAdd}>
            <Plus size={14} strokeWidth={2.4} style={{ color: "var(--muted)" }} />
            <input
              className={quickAddInput}
              placeholder="jot anything…"
              value={jot}
              onChange={(e) => setJot(e.target.value)}
              onKeyDown={handleQuickAdd}
            />
            <span className={kbd}>
              <CornerDownLeft size={11} strokeWidth={2.4} />
            </span>
          </div>

          <div className={queueList}>
            {!isLoaded ? (
              <div
                className={queueEmpty}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Loader size="md" label="Loading queue" />
              </div>
            ) : queue.length === 0 ? (
              <div className={queueEmpty}>
                <Sparkles
                  size={20}
                  strokeWidth={2}
                  style={{ margin: "0 auto 6px", opacity: 0.5 }}
                />
                Inbox zero.
                <br />
                Jot something to get started.
              </div>
            ) : (
              queue.map((item) => {
                const active = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${queueRow} ${active ? queueRowActive : ""}`}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <span className={queueRowTitle}>{item.title}</span>
                    <span className={queueRowAge}>{ageLabel(item.createdAt)}</span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className={main}>
          {!isLoaded ? (
            <div className={emptyMain}>
              <Loader size="md" label="Loading triage" />
            </div>
          ) : !selected ? (
            <div className={emptyMain}>
              <Sparkles size={24} strokeWidth={2} style={{ opacity: 0.5 }} />
              <div className={emptyMainTitle}>Nothing to triage</div>
              <div>
                Every captured note has a type, duration, and deadline. Jot
                something on the left, or open Library to keep working.
              </div>
            </div>
          ) : (
            <>
              <div className={breadcrumb}>
                <span>
                  {Math.max(0, queue.findIndex((q) => q.id === selected.id)) + 1}{" "}
                  of {queue.length}
                </span>
                <span>·</span>
                <span>
                  captured{" "}
                  {formatDistanceToNowStrict(new Date(selected.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <div className={card}>
                <h2 className={itemTitle}>{selected.title}</h2>

                <div className={typeGrid}>
                  {TYPE_OPTIONS.map((opt) => {
                    const active = draftType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        className={`${typeCard} ${active ? typeCardActive : ""}`}
                        onClick={() => setDraftType(opt.key)}
                      >
                        <span className={typeCardLabel}>{opt.label}</span>
                        <span className={typeCardSub}>{opt.sub}</span>
                        <span className={typeCardKbd}>key · {opt.hint}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    className={`${typeCard} ${typeCardDanger}`}
                    onClick={trashSelected}
                    title="Delete this item"
                  >
                    <span className={typeCardLabel}>trash</span>
                    <span className={typeCardSub}>not worth doing</span>
                    <span className={typeCardKbd}>key · x</span>
                  </button>
                </div>

                <div className={fieldGrid}>
                  <div className={field}>
                    <span className={fieldLabel}>duration</span>
                    {draftType === "goal" ? (
                      <span className={fieldInput} style={{ opacity: 0.4 }}>
                        —
                      </span>
                    ) : (
                      <input
                        className={fieldInput}
                        type="number"
                        min={1}
                        value={draftDuration}
                        onChange={(e) =>
                          setDraftDuration(Number(e.target.value) || 0)
                        }
                        onFocus={(e) => e.target.select()}
                      />
                    )}
                  </div>

                  {draftType === "plan" ? (
                    <div className={field}>
                      <span className={fieldLabel}>scheduled</span>
                      <input
                        className={fieldInput}
                        type="datetime-local"
                        value={draftStarts}
                        onChange={(e) => setDraftStarts(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div className={field}>
                      <span className={fieldLabel}>deadline</span>
                      <input
                        className={fieldInput}
                        type="date"
                        value={draftDeadline}
                        onChange={(e) => setDraftDeadline(e.target.value)}
                      />
                    </div>
                  )}

                  <div className={field}>
                    <span className={fieldLabel}>category</span>
                    <CategoryPicker
                      categories={categories}
                      value={draftCategoryId}
                      onChange={setDraftCategoryId}
                      selected={selectedCategory}
                    />
                  </div>
                </div>

                <div className={actionRow}>
                  <Button variant="glass" size="sm" onClick={skipSelected}>
                    Skip
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => commitSelected(false)}
                  >
                    Save as draft
                  </Button>
                  <span className={spacer} />
                  <Button
                    variant="solid"
                    size="sm"
                    onClick={() => commitSelected(true)}
                  >
                    {draftType === "goal" ? "Save" : "Save & mark ready"}
                  </Button>
                </div>
              </div>

              <div className={footerHint}>
                <span className={kbd}>
                  <CornerDownLeft size={11} strokeWidth={2.4} />
                </span>
                <Caption>save & next</Caption>
                <span className={kbd}>1</span>
                <span className={kbd}>2</span>
                <span className={kbd}>3</span>
                <Caption>type</Caption>
                <span className={kbd}>x</span>
                <Caption>trash</Caption>
                <span className={spacer} />
                <span
                  role="button"
                  onClick={() => router.push("/circadium/library")}
                  style={{ cursor: "pointer", textDecoration: "underline" }}
                >
                  open Library
                </span>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

type CategoryOption = { id: string; name: string; color?: string | null };

const NO_CATEGORY: CategoryOption = { id: "", name: "No category", color: null };

function CategoryPicker({
  categories,
  value,
  onChange,
  selected,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
  selected: Category | null;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const options: CategoryOption[] = useMemo(
    () => [NO_CATEGORY, ...categories],
    [categories],
  );

  const handleSelect = useCallback(
    (opt: CategoryOption) => {
      onChange(opt.id);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const keyboardNav = useListKeyboardNav<CategoryOption>(
    open ? options : [],
    handleSelect,
  );

  useClickOutside({
    ref: wrapRef,
    onClickOutside: () => setOpen(false),
    isActive: open,
  });

  // Seed the highlight to the current selection when opening so the dropdown
  // doesn't read as "nothing selected" while the field clearly has a value.
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.id === value);
    keyboardNav.setActiveIndex(idx >= 0 ? idx : 0);
    // keyboardNav identity is stable per render but we only want to seed once
    // per open transition; depending only on `open` is the intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const triggerLabel = selected?.name ?? "No category";
  const isEmpty = !selected;

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setOpen(true);
      return;
    }
    if (open && e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    keyboardNav.onKeyDown(e);
  };

  return (
    <div
      className={categoryDropdownWrap}
      ref={wrapRef}
      data-capture-picker="true"
    >
      <button
        ref={triggerRef}
        type="button"
        className={categoryTrigger}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected?.color && (
          <CategoryDot color={selected.color} size={10} glow={false} />
        )}
        <span
          className={`${categoryTriggerLabel} ${
            isEmpty ? categoryTriggerEmpty : ""
          }`}
        >
          {triggerLabel}
        </span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          className={categoryTriggerChevron}
        />
      </button>

      {open && (
        <div className={categoryDropdown} ref={keyboardNav.containerRef}>
          {options.map((opt, i) => {
            const active = keyboardNav.activeIndex === i;
            const isNone = opt.id === "";
            return (
              <button
                key={opt.id || "none"}
                type="button"
                data-knav-index={i}
                className={`${categoryDropdownItem} ${
                  active ? categoryDropdownItemActive : ""
                } ${isNone ? categoryDropdownItemMuted : ""}`}
                onMouseEnter={() => keyboardNav.setActiveIndex(i)}
                onClick={() => handleSelect(opt)}
              >
                {isNone ? (
                  <span
                    aria-hidden
                    style={{
                      display: "inline-block",
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      border: "1px dashed currentColor",
                      opacity: 0.5,
                      flexShrink: 0,
                    }}
                  />
                ) : opt.color ? (
                  <CategoryDot color={opt.color} size={10} glow={false} />
                ) : (
                  <span style={{ width: 10, flexShrink: 0 }} />
                )}
                <span style={{ flex: 1, minWidth: 0 }}>{opt.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
