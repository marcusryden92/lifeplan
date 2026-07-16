"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme, vars } from "@/components/ui";
import type {
  MindmapKind,
  MindmapLaidNode,
  MindmapLayout,
} from "../../_lib/mindmapModel";
import { container as containerClass, canvas as canvasClass } from "./MindmapCanvas.css";

type MindmapCanvasProps = {
  layout: MindmapLayout;
  scale: number;
  // Bumped by the page when the layout mode switches, to re-center and refit.
  refitToken?: string | number;
  onZoomDelta: (delta: number) => void;
  onFit: (viewportWidth: number, viewportHeight: number) => void;
};

const TAU = Math.PI * 2;
const MAX_DPR = 2;

type Colors = {
  tileFill: string;
  ink: string;
  inkSoft: string;
  muted: string;
  rule: string;
  glassStroke: string;
  accentPrimary: string;
  accentSecondary: string;
  textOnAccent: string;
  fontFamily: string;
};

// Per-kind draw spec: pill padding, dot radius, font, and which resolved
// color the label uses.
const KIND: Record<
  MindmapKind,
  { padL: number; dotR: number; font: string; text: keyof Colors }
> = {
  root: { padL: 18, dotR: 0, font: "600 15px", text: "textOnAccent" },
  role: { padL: 11, dotR: 4.5, font: "650 13px", text: "ink" },
  category: { padL: 11, dotR: 3.5, font: "550 12px", text: "ink" },
  item: { padL: 11, dotR: 4, font: "500 11.5px", text: "ink" },
  leaf: { padL: 9, dotR: 3, font: "450 11px", text: "inkSoft" },
};

type DrawNode = {
  id: string;
  kind: MindmapKind;
  completed: boolean;
  href: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  cy: number;
  fill: string;
  border: string | null;
  gradFrom: string;
  gradTo: string;
  dotR: number;
  dotX: number;
  dotColor: string;
  borderW: number;
  label: string;
  labelX: number;
  labelFont: string;
  textColor: string;
  countText: string;
  countX: number;
  countColor: string;
  countFont: string;
};

type DrawEdge = {
  x1: number;
  y1: number;
  c1x: number;
  c1y: number;
  c2x: number;
  c2y: number;
  x2: number;
  y2: number;
  fromId: string;
  toId: string;
  stroke: string;
  width: number;
};

type DrawList = { nodes: DrawNode[]; edges: DrawEdge[] };

// Resolve the themed CSS custom properties to concrete color strings the
// canvas can use — read back through a probe so the current theme applies.
function resolveColors(host: HTMLElement): Colors {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  host.appendChild(probe);
  const read = (token: string) => {
    probe.style.color = token;
    return getComputedStyle(probe).color;
  };
  const colors: Colors = {
    tileFill: read(vars.tileFill),
    ink: read(vars.ink),
    inkSoft: read(vars.inkSoft),
    muted: read(vars.muted),
    rule: read(vars.rule),
    glassStroke: read(vars.glass.stroke),
    accentPrimary: read(vars.accent.primary),
    accentSecondary: read(vars.accent.secondary),
    textOnAccent: read(vars.textOnAccent),
    fontFamily: "",
  };
  probe.style.fontFamily = vars.font.ui;
  colors.fontFamily = getComputedStyle(probe).fontFamily || "sans-serif";
  host.removeChild(probe);
  return colors;
}

function ellipsize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (maxWidth <= 0) return "";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let trimmed = text;
  while (trimmed.length > 0 && ctx.measureText(`${trimmed}…`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return trimmed.length ? `${trimmed}…` : "…";
}

// Bake per-node draw data once (positions, ellipsized labels, resolved
// colors) so the hot draw loop only fills paths and text.
// Branch stroke weight tapers by the depth of the edge's child: a thick trunk
// out to each role, thinning down to a hairline twig at the leaves.
const EDGE_WIDTH: Record<MindmapKind, number> = {
  root: 3.4,
  role: 3.4,
  category: 2.2,
  item: 1.7,
  leaf: 1.1,
};

function buildDrawList(
  layout: MindmapLayout,
  colors: Colors,
  mctx: CanvasRenderingContext2D,
): DrawList {
  const kindById = new Map<string, MindmapKind>();
  for (const laid of layout.nodes) kindById.set(laid.node.id, laid.node.kind);

  const nodes = layout.nodes.map((laid: MindmapLaidNode): DrawNode => {
    const n = laid.node;
    const spec = KIND[n.kind];
    const x = laid.x - laid.w / 2;
    const y = laid.y - laid.h / 2;
    let labelX = x + spec.padL;
    let dotX = 0;
    if (spec.dotR > 0) {
      dotX = labelX + spec.dotR;
      labelX += spec.dotR * 2 + 6;
    }
    let rightX = x + laid.w - spec.padL;
    let countText = "";
    const countX = rightX;
    if ((n.kind === "role" || n.kind === "category") && n.itemCount > 0) {
      countText = String(n.itemCount);
      mctx.font = `400 10px ${colors.fontFamily}`;
      rightX -= mctx.measureText(countText).width + 6;
    }
    const labelFont = `${spec.font} ${colors.fontFamily}`;
    mctx.font = labelFont;
    const isRoot = n.kind === "root";
    return {
      id: n.id,
      kind: n.kind,
      completed: n.completed,
      href: n.href,
      x,
      y,
      w: laid.w,
      h: laid.h,
      cy: laid.y,
      fill: isRoot ? "" : colors.tileFill,
      // Roles get a colored outline (their branch hue) and a heavier stroke so
      // top-level groups stand out; leaves drop the border entirely to read as
      // the lightest tier.
      border: isRoot
        ? null
        : n.kind === "role"
          ? (n.color ?? colors.glassStroke)
          : n.kind === "leaf"
            ? null
            : colors.rule,
      borderW: n.kind === "role" ? 1.8 : 1,
      gradFrom: colors.accentPrimary,
      gradTo: colors.accentSecondary,
      dotR: spec.dotR,
      dotX,
      dotColor: n.color ?? colors.muted,
      label: ellipsize(mctx, n.label, rightX - labelX),
      labelX,
      labelFont,
      textColor: colors[spec.text],
      countText,
      countX,
      countColor: colors.muted,
      countFont: `400 10px ${colors.fontFamily}`,
    };
  });

  const edges = layout.edges.map(
    (e): DrawEdge => ({
      x1: e.x1,
      y1: e.y1,
      c1x: e.c1x,
      c1y: e.c1y,
      c2x: e.c2x,
      c2y: e.c2y,
      x2: e.x2,
      y2: e.y2,
      fromId: e.fromId,
      toId: e.toId,
      stroke: e.color ?? colors.muted,
      width: EDGE_WIDTH[kindById.get(e.toId) ?? "item"],
    }),
  );

  return { nodes, edges };
}

function pillPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  const r = Math.min(h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function MindmapCanvas({
  layout,
  scale,
  refitToken,
  onZoomDelta,
  onFit,
}: MindmapCanvasProps) {
  const { dark } = useTheme();
  const router = useRouter();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const measureRef = useRef<CanvasRenderingContext2D | null>(null);

  const [colors, setColors] = useState<Colors | null>(null);

  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  const prevScaleRef = useRef<number | null>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const dprRef = useRef(1);
  const pivotRef = useRef<{ x: number; y: number } | null>(null);
  const focusRef = useRef<Set<string> | null>(null);
  const hoverIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const didInitRef = useRef(false);
  const rafRef = useRef(0);
  const onFitRef = useRef(onFit);
  onFitRef.current = onFit;
  const onZoomDeltaRef = useRef(onZoomDelta);
  onZoomDeltaRef.current = onZoomDelta;

  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const panTeardownRef = useRef<(() => void) | null>(null);

  const drawListRef = useRef<DrawList | null>(null);
  const parentById = useMemo(() => {
    const map = new Map<string, string>();
    for (const edge of layout.edges) map.set(edge.toId, edge.fromId);
    return map;
  }, [layout]);
  const nodeById = layout.nodeById;

  const drawList = useMemo(() => {
    if (!colors) return null;
    let mctx = measureRef.current;
    if (!mctx) {
      mctx = document.createElement("canvas").getContext("2d");
      measureRef.current = mctx;
    }
    return mctx ? buildDrawList(layout, colors, mctx) : null;
  }, [layout, colors]);
  drawListRef.current = drawList;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const list = drawListRef.current;
    if (!canvas || !list) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    const dpr = dprRef.current;
    const s = scaleRef.current;
    const pan = panRef.current;
    const focus = focusRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.translate(pan.x, pan.y);
    ctx.scale(s, s);

    for (const e of list.edges) {
      const active = !focus || (focus.has(e.fromId) && focus.has(e.toId));
      ctx.globalAlpha = active ? 0.72 : 0.1;
      ctx.lineWidth = e.width / s;
      ctx.strokeStyle = e.stroke;
      ctx.beginPath();
      ctx.moveTo(e.x1, e.y1);
      ctx.bezierCurveTo(e.c1x, e.c1y, e.c2x, e.c2y, e.x2, e.y2);
      ctx.stroke();
    }

    ctx.textBaseline = "middle";
    for (const nd of list.nodes) {
      const dim = focus ? !focus.has(nd.id) : false;
      ctx.globalAlpha = dim
        ? nd.completed
          ? 0.16
          : 0.28
        : nd.completed
          ? 0.5
          : 1;

      pillPath(ctx, nd.x, nd.y, nd.w, nd.h);
      if (nd.kind === "root") {
        const grad = ctx.createLinearGradient(nd.x, nd.y, nd.x + nd.w, nd.y + nd.h);
        grad.addColorStop(0, nd.gradFrom);
        grad.addColorStop(1, nd.gradTo);
        ctx.fillStyle = grad;
        ctx.fill();
      } else {
        ctx.fillStyle = nd.fill;
        ctx.fill();
        if (nd.border) {
          ctx.lineWidth = nd.borderW / s;
          ctx.strokeStyle = nd.border;
          ctx.stroke();
        }
      }

      if (nd.dotR > 0) {
        ctx.beginPath();
        ctx.fillStyle = nd.dotColor;
        ctx.arc(nd.dotX, nd.cy, nd.dotR, 0, TAU);
        ctx.fill();
      }

      if (nd.countText) {
        ctx.font = nd.countFont;
        ctx.fillStyle = nd.countColor;
        ctx.textAlign = "right";
        ctx.fillText(nd.countText, nd.countX, nd.cy);
      }

      ctx.font = nd.labelFont;
      ctx.fillStyle = nd.textColor;
      ctx.textAlign = "left";
      ctx.fillText(nd.label, nd.labelX, nd.cy);
    }
    ctx.globalAlpha = 1;
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      draw();
    });
  }, [draw]);

  // Reads layout through a ref so it stays identity-stable — a [layout] dep
  // would churn the size effect, re-subscribing the observer and reallocating
  // (clearing) the canvas on every toggle/data change.
  const centerOnMe = useCallback((s: number) => {
    const { w, h } = sizeRef.current;
    const l = layoutRef.current;
    panRef.current = {
      x: w / 2 - l.centerX * s,
      y: h / 2 - l.centerY * s,
    };
  }, []);

  // Resolve theme colors on mount and whenever the theme flips.
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    setColors(resolveColors(host));
  }, [dark]);

  // Redraw once fonts settle — the first draw may use fallback metrics.
  useEffect(() => {
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) {
        // Re-bake labels against the real font, then repaint.
        setColors((prev) => (prev ? { ...prev } : prev));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Size the canvas to its container (DPR-aware) and, on the first real size,
  // center on "Me" and report the viewport so the page can pick a fit zoom.
  useEffect(() => {
    const host = containerRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const syncSize = () => {
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      sizeRef.current = { w: rect.width, h: rect.height };
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      dprRef.current = dpr;
      const pxW = Math.round(rect.width * dpr);
      const pxH = Math.round(rect.height * dpr);
      // Assigning canvas.width/height clears the backing store, so only touch
      // it when the pixel size actually changed — otherwise the map blanks
      // for a frame on every unrelated resize notification.
      if (canvas.width !== pxW || canvas.height !== pxH) {
        canvas.width = pxW;
        canvas.height = pxH;
      }
      if (!didInitRef.current) {
        didInitRef.current = true;
        centerOnMe(scaleRef.current);
        prevScaleRef.current = scaleRef.current;
        onFitRef.current(rect.width, rect.height);
      }
      scheduleDraw();
    };
    const observer = new ResizeObserver(syncSize);
    observer.observe(host);
    syncSize();

    // A devicePixelRatio change with no CSS-size change (dragging between
    // mixed-DPR monitors) never fires the ResizeObserver — watch it directly.
    let mql: MediaQueryList | null = null;
    const onDprChange = () => {
      mql?.removeEventListener("change", onDprChange);
      syncSize();
      watchDpr();
    };
    const watchDpr = () => {
      mql = window.matchMedia(
        `(resolution: ${window.devicePixelRatio || 1}dppx)`,
      );
      mql.addEventListener("change", onDprChange);
    };
    watchDpr();

    return () => {
      observer.disconnect();
      mql?.removeEventListener("change", onDprChange);
    };
  }, [centerOnMe, scheduleDraw]);

  // Re-center and refit when the page switches layout mode — the geometry
  // changes wholesale, so the old zoom would frame it poorly. Skips the first
  // run (the size effect already fits on mount).
  const refitFirstRef = useRef(true);
  useEffect(() => {
    if (refitFirstRef.current) {
      refitFirstRef.current = false;
      return;
    }
    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) return;
    centerOnMe(scaleRef.current);
    onFitRef.current(w, h);
    scheduleDraw();
  }, [refitToken, centerOnMe, scheduleDraw]);

  // Apply a scale change: pivot the view on the cursor (or the viewport center
  // for the slider) so the point under the pivot stays fixed.
  useEffect(() => {
    scaleRef.current = scale;
    const prev = prevScaleRef.current;
    if (prev === null || prev === scale) {
      prevScaleRef.current = scale;
      scheduleDraw();
      return;
    }
    const { w, h } = sizeRef.current;
    const pivot = pivotRef.current ?? { x: w / 2, y: h / 2 };
    pivotRef.current = null;
    const pan = panRef.current;
    const worldX = (pivot.x - pan.x) / prev;
    const worldY = (pivot.y - pan.y) / prev;
    panRef.current = {
      x: pivot.x - worldX * scale,
      y: pivot.y - worldY * scale,
    };
    prevScaleRef.current = scale;
    scheduleDraw();
  }, [scale, scheduleDraw]);

  // A rebuilt layout invalidates the hovered id set (it references old nodes),
  // so drop the focus before repainting or dimming lands on stale ids.
  useEffect(() => {
    hoverIdRef.current = null;
    focusRef.current = null;
    scheduleDraw();
  }, [drawList, scheduleDraw]);

  // Native, non-passive wheel: ctrl/meta (or pinch) zooms at the cursor,
  // everything else pans.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      const step = e.deltaMode === 1 ? 16 : 1;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        pivotRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        onZoomDeltaRef.current(-e.deltaY * step * 0.06);
        // A clamped no-op zoom won't re-run the scale effect to consume the
        // pivot; drop it next frame so a later slider zoom uses the center.
        requestAnimationFrame(() => {
          pivotRef.current = null;
        });
        return;
      }
      e.preventDefault();
      panRef.current = {
        x: panRef.current.x - e.deltaX * step,
        y: panRef.current.y - e.deltaY * step,
      };
      scheduleDraw();
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [scheduleDraw]);

  // Reset the ref, not just cancel — StrictMode's dev mount/unmount/remount
  // runs this cleanup mid-flight, and a stale non-zero rafRef would make
  // scheduleDraw think a frame is forever pending and never repaint.
  useEffect(
    () => () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      panTeardownRef.current?.();
    },
    [],
  );

  const hitTest = useCallback((screenX: number, screenY: number): DrawNode | null => {
    const list = drawListRef.current;
    if (!list) return null;
    const s = scaleRef.current;
    const pan = panRef.current;
    const wx = (screenX - pan.x) / s;
    const wy = (screenY - pan.y) / s;
    let hit: DrawNode | null = null;
    for (const nd of list.nodes) {
      if (wx >= nd.x && wx <= nd.x + nd.w && wy >= nd.y && wy <= nd.y + nd.h) {
        hit = nd;
      }
    }
    return hit;
  }, []);

  const computeFocus = useCallback(
    (id: string): Set<string> => {
      const set = new Set<string>();
      let cursor: string | undefined = id;
      while (cursor && !set.has(cursor)) {
        set.add(cursor);
        cursor = parentById.get(cursor);
      }
      const hovered = nodeById.get(id);
      if (hovered) {
        const stack = [...hovered.node.children];
        while (stack.length) {
          const child = stack.pop();
          if (!child) continue;
          set.add(child.id);
          stack.push(...child.children);
        }
      }
      return set;
    },
    [parentById, nodeById],
  );

  const handleHover = useCallback(
    (e: React.PointerEvent) => {
      if (isPanningRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const hit = hitTest(e.clientX - rect.left, e.clientY - rect.top);
      canvas.style.cursor = hit?.href ? "pointer" : "grab";
      const id = hit?.id ?? null;
      if (id === hoverIdRef.current) return;
      hoverIdRef.current = id;
      focusRef.current = id ? computeFocus(id) : null;
      scheduleDraw();
    },
    [hitTest, computeFocus, scheduleDraw],
  );

  const clearHover = useCallback(() => {
    if (!hoverIdRef.current) return;
    hoverIdRef.current = null;
    focusRef.current = null;
    scheduleDraw();
  }, [scheduleDraw]);

  const beginPan = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const host = containerRef.current;
      if (!host) return;
      const startX = e.clientX;
      const startY = e.clientY;
      const panStart = { ...panRef.current };
      let active = false;

      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!active) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
          active = true;
          isPanningRef.current = true;
          host.dataset.panning = "true";
          if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
        }
        panRef.current = { x: panStart.x + dx, y: panStart.y + dy };
        scheduleDraw();
      };
      // Also runs on unmount (via panTeardownRef) so a drag interrupted by
      // navigating away doesn't leak these window listeners.
      const teardown = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onCancel);
        panTeardownRef.current = null;
        if (active) {
          isPanningRef.current = false;
          delete host.dataset.panning;
          if (canvasRef.current) canvasRef.current.style.cursor = "grab";
        }
      };
      const finish = (ev: PointerEvent, allowClick: boolean) => {
        const wasActive = active;
        teardown();
        if (!wasActive && allowClick) {
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const hit = hitTest(ev.clientX - rect.left, ev.clientY - rect.top);
            if (hit?.href) router.push(hit.href);
          }
        }
      };
      const onUp = (ev: PointerEvent) => finish(ev, true);
      const onCancel = (ev: PointerEvent) => finish(ev, false);
      panTeardownRef.current = teardown;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onCancel);
    },
    [scheduleDraw, hitTest, router],
  );

  return (
    <div
      ref={containerRef}
      className={containerClass}
      onPointerDown={beginPan}
      onPointerMove={handleHover}
      onPointerLeave={clearHover}
    >
      <canvas ref={canvasRef} className={canvasClass} />
    </div>
  );
}
