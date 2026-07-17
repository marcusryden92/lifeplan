/* global React, TODAY, WEEK, GOAL, makeGlass, lumenArea, btnGlass, btnSolid, ConicDot, LCaption, LMast, CD, HS, fmtL */
// ============================================================
// LUMEN — screen bodies
// Each screen returns the MAIN COLUMN only; <LumenShell> supplies
// the bezel, grain and persistent nav. Accept { t, onNav }.
// ============================================================

// ---- TODAY -------------------------------------------------
function LumenToday({ t, onNav }) {
  const g = makeGlass(t);
  const area = lumenArea(t);
  const ev = TODAY.events;
  const goals = TODAY.goals.slice(0, 3);
  const sStats = TODAY.stats.slice(1);

  return (
    <>
      <LMast t={t}>
        <LCaption t={t}>Vol. 2026</LCaption>
        <LCaption t={t}>Iss. 148</LCaption>
        <LCaption t={t}>Thursday, May 28</LCaption>
        <span style={{ flex: 1 }} />
        <LCaption t={t}>⌘K capture</LCaption>
        <LCaption t={t} style={{ color: t.ink }}>
          Marcus P.
        </LCaption>
      </LMast>

      <div
        style={{
          padding: "30px 32px 22px",
          flexShrink: 0,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: CD,
              fontSize: 56,
              fontWeight: 500,
              letterSpacing: "-0.045em",
              lineHeight: 0.98,
              color: t.ink,
            }}
          >
            Good morning, Marcus.
          </div>
          <div
            style={{
              marginTop: 10,
              fontSize: 14,
              color: t.inkSoft,
              fontWeight: 500,
              fontFamily: HS,
            }}
          >
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                color: t.ink,
              }}
            >
              6
            </span>{" "}
            things on today ·{" "}
            <span
              style={{
                fontVariantNumeric: "tabular-nums",
                fontWeight: 600,
                color: t.ink,
              }}
            >
              4h 40m
            </span>{" "}
            planned ·{" "}
            <span style={{ color: t.error, fontWeight: 600 }}>1 overdue</span> ·
            1 scheduled past deadline
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGlass(t)}>⌘K capture</button>
          <button
            style={btnSolid(t)}
            onClick={() => onNav && onNav("calendar")}
          >
            Open calendar →
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr",
          gap: 18,
          padding: "0 28px 24px",
          minHeight: 0,
        }}
      >
        {/* LEFT — agenda */}
        <div
          style={{
            ...g,
            borderRadius: 22,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: `1px solid ${t.rule}`,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: CD,
                  fontSize: 22,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  color: t.ink,
                }}
              >
                What to do today
              </div>
              <LCaption t={t} style={{ marginTop: 4, display: "inline-block" }}>
                scheduler order · 6 items · 4h 40m
              </LCaption>
            </div>
            <button
              style={btnGlass(t)}
              onClick={() => onNav && onNav("calendar")}
            >
              Full week →
            </button>
          </div>
          <div
            style={{ flex: 1, overflow: "auto", padding: "8px 12px 12px" }}
            className="noscroll"
          >
            {ev.map((e, i) => {
              const ac = e.col ? area[e.col] : t.muted;
              return (
                <div
                  key={i}
                  onClick={() => onNav && onNav("item")}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "72px 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    padding: "10px 12px",
                    margin: "4px 0",
                    borderRadius: 14,
                    cursor: "pointer",
                    background: e.now
                      ? t.isDark
                        ? `${t.coral}1a`
                        : `${t.coral}1f`
                      : "transparent",
                    border: e.now
                      ? `1px solid ${t.isDark ? `${t.coral}55` : `${t.coral}66`}`
                      : "1px solid transparent",
                  }}
                >
                  <div
                    style={{
                      fontFamily: HS,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: e.now ? t.coral : t.ink,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {e.now ? "NOW" : e.time}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: t.muted,
                        marginTop: 2,
                        fontWeight: 600,
                      }}
                    >
                      {e.dur}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: CD,
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: e.travel ? t.muted : t.ink,
                        fontStyle: e.travel ? "italic" : "normal",
                      }}
                    >
                      {e.title}
                    </div>
                    {!e.travel && (
                      <div
                        style={{
                          marginTop: 4,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            padding: "2px 9px",
                            borderRadius: 999,
                            background: ac,
                            border: "none",
                            color: "#fff",
                            fontSize: 10.5,
                            fontWeight: 700,
                            letterSpacing: "0.04em",
                            textTransform: "uppercase",
                          }}
                        >
                          {e.area}
                        </span>
                        {e.where && <LCaption t={t}>{e.where}</LCaption>}
                        {e.kind === "plan" && (
                          <LCaption t={t} style={{ color: t.muted }}>
                            · fixed
                          </LCaption>
                        )}
                        {e.warn && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: t.warning,
                              letterSpacing: "0.08em",
                            }}
                          >
                            LATE
                          </span>
                        )}
                        {e.overdue && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: t.error,
                              letterSpacing: "0.08em",
                            }}
                          >
                            OVERDUE
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span style={{ color: t.muted, fontSize: 16 }}>›</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            overflow: "auto",
            minHeight: 0,
          }}
          className="noscroll"
        >
          <div style={{ ...g, borderRadius: 22, padding: "16px 20px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: CD,
                    fontSize: 19,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                    color: t.ink,
                  }}
                >
                  Priority goals
                </div>
                <LCaption
                  t={t}
                  style={{ marginTop: 3, display: "inline-block" }}
                >
                  progress · next step
                </LCaption>
              </div>
              <LCaption t={t}>3 active</LCaption>
            </div>
            {goals.map((g2, i) => {
              const ac = area[g2.col];
              return (
                <div
                  key={i}
                  onClick={() => onNav && onNav("item")}
                  style={{
                    padding: "12px 0",
                    borderTop: i ? `1px solid ${t.rule}` : "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: 999,
                        background: ac,
                        boxShadow: `0 0 8px ${ac}88`,
                      }}
                    />
                    <span
                      style={{
                        fontFamily: CD,
                        fontSize: 16,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        flex: 1,
                        color: t.ink,
                      }}
                    >
                      {g2.name}
                    </span>
                    <span
                      style={{
                        fontFamily: HS,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: t.inkSoft,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {g2.sub}
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      height: 6,
                      borderRadius: 999,
                      background: t.isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(22,20,42,0.08)",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: `${g2.pct}%`,
                        background: `linear-gradient(90deg, ${ac}, ${ac}cc)`,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 7,
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: t.inkSoft,
                        fontFamily: HS,
                        fontWeight: 500,
                      }}
                    >
                      → {g2.next}
                    </span>
                    <LCaption t={t} style={{ fontSize: 9.5 }}>
                      by {g2.dl}
                    </LCaption>
                  </div>
                </div>
              );
            })}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
            }}
          >
            {sStats.map((s) => (
              <div
                key={s.label}
                style={{
                  ...g,
                  borderRadius: 16,
                  padding: "12px 14px",
                  boxShadow: t.shadowSm,
                }}
              >
                <LCaption t={t} style={{ fontSize: 9.5 }}>
                  {s.label}
                </LCaption>
                <div
                  style={{
                    fontFamily: CD,
                    fontSize: 26,
                    fontWeight: 500,
                    letterSpacing: "-0.04em",
                    marginTop: 4,
                    lineHeight: 1,
                    color: t.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: t.muted,
                    marginTop: 3,
                    fontWeight: 600,
                    fontFamily: HS,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              ...g,
              borderRadius: 16,
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              boxShadow: t.shadowSm,
            }}
          >
            <ConicDot t={t} size={10} />
            <div
              style={{
                flex: 1,
                fontSize: 12.5,
                color: t.ink,
                fontWeight: 500,
                lineHeight: 1.4,
                fontFamily: HS,
              }}
            >
              You have <strong style={{ fontWeight: 700 }}>2h 18m</strong> of
              unscheduled focus on Thursday. Hold it, or use it?
            </div>
            <button
              style={btnSolid(t, true)}
              onClick={() => onNav && onNav("calendar")}
            >
              Use it →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- CALENDAR ----------------------------------------------
function LumenWeek({ t, area, onNav }) {
  const hourHeight = 44;
  const hours = WEEK.hours;
  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "56px repeat(7, 1fr)",
          borderBottom: `1px solid ${t.rule}`,
          background: t.glassBgSoft,
        }}
      >
        <div />
        {WEEK.days.map((d) => (
          <div
            key={d.n}
            style={{
              padding: "12px 0",
              textAlign: "center",
              borderLeft: `1px solid ${t.rule}`,
            }}
          >
            <LCaption t={t} style={{ fontSize: 10 }}>
              {d.d}
            </LCaption>
            <div
              style={{
                fontFamily: CD,
                fontSize: 22,
                fontWeight: 500,
                marginTop: 3,
                color: d.today ? t.coral : t.ink,
                letterSpacing: "-0.03em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {d.n}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{ flex: 1, overflow: "auto", position: "relative" }}
        className="noscroll"
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "56px repeat(7, 1fr)",
            gridTemplateRows: `repeat(${hours.length}, ${hourHeight}px)`,
            position: "relative",
          }}
        >
          {hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div
                style={{
                  gridRow: ri + 1,
                  gridColumn: 1,
                  padding: "3px 8px",
                  fontSize: 10.5,
                  color: t.muted,
                  fontFamily: HS,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  borderTop: ri ? `1px solid ${t.rule}` : "none",
                }}
              >
                {h}:00
              </div>
              {WEEK.days.map((_, ci) => (
                <div
                  key={ci}
                  style={{
                    gridRow: ri + 1,
                    gridColumn: ci + 2,
                    borderTop: ri ? `1px solid ${t.rule}` : "none",
                    borderLeft: `1px solid ${t.rule}`,
                  }}
                />
              ))}
            </React.Fragment>
          ))}

          {WEEK.strict.map((s, i) => {
            const top = (s.start - 7) * hourHeight;
            const height = (s.end - s.start) * hourHeight;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `calc(56px + (100% - 56px) * ${s.day} / 7)`,
                  width: `calc((100% - 56px) / 7)`,
                  top,
                  height,
                  background: t.isDark
                    ? "rgba(255,255,255,0.025)"
                    : "rgba(22,20,42,0.025)",
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {WEEK.events.map((e, i) => {
            const top = (e.start - 7) * hourHeight + 2;
            const height = (e.end - e.start) * hourHeight - 4;
            const color = e.col ? area[e.col] : t.muted;
            const isTmpl = e.kind === "tmpl";
            return (
              <div
                key={i}
                onClick={() => !e.travel && !isTmpl && onNav && onNav("item")}
                style={{
                  position: "absolute",
                  left: `calc(56px + (100% - 56px) * ${e.day} / 7 + 3px)`,
                  width: `calc((100% - 56px) / 7 - 6px)`,
                  top,
                  height,
                  background: e.travel
                    ? "transparent"
                    : isTmpl
                      ? `${color}33`
                      : color,
                  color: e.travel ? t.muted : isTmpl ? color : "#fff",
                  border: e.travel
                    ? `1px dashed ${t.glassStroke}`
                    : e.warn
                      ? `2px solid ${t.coral}`
                      : "none",
                  borderRadius: 8,
                  padding: "4px 8px",
                  fontSize: 11.5,
                  lineHeight: 1.2,
                  overflow: "hidden",
                  fontFamily: HS,
                  fontWeight: 600,
                  opacity: isTmpl ? 0.75 : 1,
                  fontStyle: e.travel ? "italic" : "normal",
                  cursor: !e.travel && !isTmpl ? "pointer" : "default",
                  boxShadow: e.current
                    ? `inset 0 1px 0 rgba(255,255,255,0.20)`
                    : "none",
                }}
              >
                <div>{e.title}</div>
                {height > 36 && !e.travel && !isTmpl && (
                  <div
                    style={{
                      fontSize: 9.5,
                      marginTop: 2,
                      opacity: 0.8,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: 600,
                    }}
                  >
                    {fmtL(e.start)}–{fmtL(e.end)}
                  </div>
                )}
              </div>
            );
          })}

          <div
            style={{
              position: "absolute",
              left: `calc(56px + (100% - 56px) * 2 / 7)`,
              width: `calc((100% - 56px) / 7)`,
              top: (9.6 - 7) * hourHeight,
              height: 1.5,
              background: t.coral,
              zIndex: 5,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: -6,
                top: -4,
                width: 9,
                height: 9,
                borderRadius: 999,
                background: t.coral,
              }}
            />
            <span
              style={{
                position: "absolute",
                right: 4,
                top: -16,
                fontSize: 9.5,
                fontFamily: HS,
                fontWeight: 700,
                color: t.coral,
                letterSpacing: "0.04em",
              }}
            >
              09:36
            </span>
          </div>
        </div>
      </div>
    </>
  );
}

function LumenCalendar({ t, onNav }) {
  const g = makeGlass(t);
  const area = lumenArea(t);
  return (
    <>
      <LMast t={t}>
        <LCaption t={t}>Vol. 2026</LCaption>
        <LCaption t={t}>Iss. 148</LCaption>
        <LCaption t={t}>{WEEK.range}</LCaption>
        <span style={{ flex: 1 }} />
        <LCaption t={t}>⌘K capture</LCaption>
        <LCaption t={t} style={{ color: t.ink }}>
          Marcus P.
        </LCaption>
      </LMast>

      <div
        style={{
          padding: "20px 28px 18px",
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontFamily: CD,
            fontSize: 32,
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: t.ink,
            lineHeight: 1,
          }}
        >
          {WEEK.range}
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 6 }}>
          <button style={{ ...btnGlass(t), padding: "6px 10px" }}>‹</button>
          <button style={{ ...btnGlass(t), padding: "6px 12px" }}>Today</button>
          <button style={{ ...btnGlass(t), padding: "6px 10px" }}>›</button>
        </div>
        <span style={{ flex: 1 }} />
        <button style={btnGlass(t)}>Filters · all</button>
        <button style={btnGlass(t)}>Week ▾</button>
        <button style={btnSolid(t)}>↻ Regenerate</button>
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          gap: 16,
          padding: "0 28px 24px",
          minHeight: 0,
        }}
      >
        <div
          style={{
            ...g,
            borderRadius: 22,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <LumenWeek t={t} area={area} onNav={onNav} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              ...g,
              borderRadius: 22,
              padding: "14px 18px",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ConicDot t={t} size={10} />
              <div
                style={{
                  fontFamily: CD,
                  fontSize: 18,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                }}
              >
                Engine
              </div>
              <LCaption t={t} style={{ marginLeft: "auto" }}>
                last run · 2m ago
              </LCaption>
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: t.inkSoft,
                marginTop: 5,
                fontWeight: 500,
              }}
            >
              1 fail · 2 warn · 42 placed across the week
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
            className="noscroll"
          >
            {WEEK.engineMsgs.map((m, i) => {
              const tc =
                m.tone === "fail"
                  ? t.error
                  : m.tone === "warn"
                    ? t.warning
                    : t.success;
              return (
                <div
                  key={i}
                  style={{ ...g, borderRadius: 18, padding: "12px 14px" }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: tc,
                        color: "#fff",
                        fontSize: 9.5,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        fontFamily: HS,
                      }}
                    >
                      {m.tag}
                    </span>
                    <span
                      style={{
                        fontFamily: CD,
                        fontSize: 13,
                        fontWeight: 500,
                        letterSpacing: "-0.02em",
                        color: t.ink,
                        lineHeight: 1.25,
                      }}
                    >
                      {m.title}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      color: t.inkSoft,
                      marginTop: 6,
                      lineHeight: 1.45,
                      fontFamily: HS,
                      fontWeight: 500,
                    }}
                  >
                    {m.body}
                  </div>
                  {(m.tone === "fail" || m.tone === "warn") && (
                    <button
                      style={{
                        ...btnGlass(t),
                        marginTop: 8,
                        padding: "5px 11px",
                        fontSize: 11,
                      }}
                    >
                      See fixes →
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

// ---- ITEM / GOAL DETAIL ------------------------------------
function LField({ t, label, v }) {
  return (
    <div>
      <LCaption t={t} style={{ fontSize: 10 }}>
        {label}
      </LCaption>
      <div style={{ marginTop: 6 }}>{v}</div>
    </div>
  );
}

function LumenGoal({ t, onNav }) {
  const g = makeGlass(t);
  const area = lumenArea(t);
  const goal = GOAL;
  const ac = area[goal.col];

  return (
    <>
      <LMast t={t}>
        <button
          onClick={() => onNav && onNav("item")}
          style={{
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          <LCaption t={t}>Items</LCaption>
        </button>
        <span style={{ color: t.muted }}>›</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 11,
            fontWeight: 600,
            color: t.inkSoft,
            fontFamily: HS,
          }}
        >
          <span
            style={{ width: 8, height: 8, borderRadius: 999, background: ac }}
          />{" "}
          {goal.area}
        </span>
        <span style={{ color: t.muted }}>›</span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: t.ink,
            fontFamily: HS,
          }}
        >
          {goal.title}
        </span>
        <span style={{ flex: 1 }} />
        <LCaption t={t}>⌘K capture</LCaption>
        <LCaption t={t} style={{ color: t.ink }}>
          Marcus P.
        </LCaption>
      </LMast>

      <div
        style={{ flex: 1, overflow: "auto", padding: "24px 32px 32px" }}
        className="noscroll"
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 24,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: t.ink,
                  color: t.paper,
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: HS,
                }}
              >
                GOAL
              </span>
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  background: ac,
                  color: "#fff",
                  fontSize: 10.5,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  fontFamily: HS,
                }}
              >
                {goal.area}
              </span>
              <LCaption t={t} style={{ marginLeft: 4 }}>
                {goal.status}
              </LCaption>
            </div>
            <div
              style={{
                fontFamily: CD,
                fontSize: 56,
                fontWeight: 500,
                letterSpacing: "-0.045em",
                lineHeight: 0.98,
                color: t.ink,
                marginTop: 12,
              }}
            >
              {goal.title}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnGlass(t)}>Duplicate</button>
            <button style={btnGlass(t)}>Delete</button>
            <button style={btnSolid(t)}>Save</button>
          </div>
        </div>

        <div
          style={{
            ...g,
            borderRadius: 22,
            padding: "20px 24px",
            marginTop: 22,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <span
                style={{
                  fontFamily: CD,
                  fontSize: 44,
                  fontWeight: 500,
                  letterSpacing: "-0.045em",
                  lineHeight: 1,
                  color: t.ink,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {goal.pct}
                <span style={{ fontSize: 24, opacity: 0.55 }}>%</span>
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: t.inkSoft,
                  fontFamily: HS,
                  fontWeight: 500,
                }}
              >
                {goal.done} of {goal.total} subtasks · {goal.totalDur} total
              </span>
            </div>
            <span
              style={{
                fontSize: 13,
                color: t.inkSoft,
                fontFamily: HS,
                fontWeight: 500,
              }}
            >
              by {goal.dl} · {goal.weeksLeft} weeks left
            </span>
          </div>
          <div
            style={{
              marginTop: 14,
              height: 8,
              borderRadius: 999,
              background: t.isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(22,20,42,0.08)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${goal.pct}%`,
                background: `linear-gradient(90deg, ${ac}, ${ac}cc)`,
                borderRadius: 999,
              }}
            />
            {Array.from({ length: goal.total - 1 }).map((_, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: `${((i + 1) / goal.total) * 100}%`,
                  width: 1,
                  background: t.paper,
                  opacity: 0.8,
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 22,
            borderBottom: `1px solid ${t.rule}`,
          }}
        >
          {["Overview", "Schedule", "Subtasks", "Activity"].map((tab, i) => (
            <div
              key={tab}
              style={{
                padding: "10px 16px",
                fontSize: 13,
                fontWeight: 600,
                fontFamily: HS,
                color: i === 0 ? t.ink : t.inkSoft,
                borderBottom:
                  i === 0 ? `2px solid ${t.coral}` : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              {tab}
              {tab === "Subtasks" && (
                <span
                  style={{ marginLeft: 6, color: t.muted, fontWeight: 500 }}
                >
                  {goal.total}
                </span>
              )}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr",
            gap: 18,
            marginTop: 22,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ ...g, borderRadius: 20 }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${t.rule}`,
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    fontFamily: CD,
                    fontSize: 17,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Subtasks · preview
                </div>
                <button
                  style={{ ...btnGlass(t), padding: "4px 10px", fontSize: 11 }}
                >
                  all 12 →
                </button>
              </div>
              <div style={{ padding: "6px 10px 12px" }}>
                {goal.subtasks.slice(0, 6).map((s, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "20px 1fr auto auto",
                      gap: 14,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: s.current ? `${t.coral}1a` : "transparent",
                      border: s.current
                        ? `1px solid ${t.coral}55`
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${s.done ? t.mint : t.isDark ? "rgba(230,232,236,0.30)" : "rgba(22,20,42,0.30)"}`,
                        background: s.done ? t.mint : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: 700,
                      }}
                    >
                      {s.done && "✓"}
                    </div>
                    <span
                      style={{
                        fontSize: 13,
                        fontFamily: HS,
                        fontWeight: 500,
                        color: s.done ? t.muted : t.ink,
                        textDecoration: s.done ? "line-through" : "none",
                      }}
                    >
                      {s.t}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: t.muted,
                        fontFamily: HS,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {s.dur}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        color: s.current ? t.coral : t.muted,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                        fontFamily: HS,
                      }}
                    >
                      {s.sched || s.dl}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...g, borderRadius: 20 }}>
              <div
                style={{
                  padding: "14px 18px",
                  borderBottom: `1px solid ${t.rule}`,
                  fontFamily: CD,
                  fontSize: 17,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                }}
              >
                Identity
              </div>
              <div
                style={{
                  padding: "16px 20px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px 24px",
                }}
              >
                <LField
                  t={t}
                  label="Type"
                  v={
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: t.ink,
                        color: t.paper,
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      GOAL
                    </span>
                  }
                />
                <LField
                  t={t}
                  label="Area"
                  v={
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        background: ac,
                        color: "#fff",
                        fontSize: 10.5,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {goal.area}
                    </span>
                  }
                />
                <LField
                  t={t}
                  label="Priority"
                  v={
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          height: 4,
                          borderRadius: 2,
                          background: t.isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(22,20,42,0.08)",
                          position: "relative",
                          maxWidth: 130,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            width: `${goal.priority * 10}%`,
                            background: t.coral,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: HS,
                          fontSize: 13,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {goal.priority}
                      </span>
                    </div>
                  }
                />
                <LField
                  t={t}
                  label="Duration"
                  v={
                    <span
                      style={{ fontFamily: HS, fontSize: 13, fontWeight: 600 }}
                    >
                      {goal.totalDur}{" "}
                      <span
                        style={{
                          color: t.muted,
                          fontWeight: 500,
                          fontSize: 11,
                        }}
                      >
                        rolled-up
                      </span>
                    </span>
                  }
                />
                <LField
                  t={t}
                  label="Place"
                  v={
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: 999,
                          background: t.glassBgDeep,
                          border: `1px solid ${t.glassStroke}`,
                          fontSize: 11,
                          fontWeight: 600,
                          color: t.ink,
                        }}
                      >
                        📍 {goal.place}
                      </span>
                      <LCaption t={t} style={{ fontSize: 10 }}>
                        inherited
                      </LCaption>
                    </div>
                  }
                />
                <LField
                  t={t}
                  label="Deadline"
                  v={
                    <span
                      style={{
                        fontFamily: HS,
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {goal.dl}
                    </span>
                  }
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                ...g,
                borderRadius: 20,
                padding: "18px 20px",
                background: `${ac}22`,
                border: `1px solid ${ac}55`,
              }}
            >
              <LCaption t={t}>Next on calendar</LCaption>
              <div
                style={{
                  fontFamily: CD,
                  fontSize: 24,
                  fontWeight: 500,
                  letterSpacing: "-0.03em",
                  marginTop: 6,
                  color: t.ink,
                }}
              >
                {goal.next.day} · {goal.next.time}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: t.inkSoft,
                  marginTop: 4,
                  fontFamily: HS,
                  fontWeight: 500,
                }}
              >
                {goal.next.title} · {goal.next.dur}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  style={{
                    ...btnGlass(t),
                    padding: "7px 12px",
                    fontSize: 11.5,
                  }}
                  onClick={() => onNav && onNav("calendar")}
                >
                  View calendar
                </button>
                <button
                  style={{
                    ...btnGlass(t),
                    padding: "7px 12px",
                    fontSize: 11.5,
                  }}
                >
                  Reschedule
                </button>
              </div>
            </div>

            <div style={{ ...g, borderRadius: 20, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ConicDot t={t} size={14} />
                <span
                  style={{
                    fontFamily: CD,
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.02em",
                  }}
                >
                  AI helper
                </span>
                <LCaption t={t} style={{ marginLeft: "auto", fontSize: 9.5 }}>
                  scoped
                </LCaption>
              </div>
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 12px",
                  borderRadius: 14,
                  background: t.glassBgSoft,
                  border: `1px solid ${t.rule}`,
                  fontSize: 12.5,
                  color: t.inkSoft,
                  fontWeight: 500,
                  fontFamily: HS,
                }}
              >
                Tighten last 2 weeks · add taper
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginTop: 10,
                }}
              >
                {["estimate", "split", "tighten", "add taper"].map((c) => (
                  <span
                    key={c}
                    style={{
                      padding: "3px 10px",
                      borderRadius: 999,
                      background: t.glassBgDeep,
                      border: `1px solid ${t.glassStroke}`,
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.ink,
                      fontFamily: HS,
                    }}
                  >
                    ✦ {c}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ ...g, borderRadius: 20, padding: "14px 18px" }}>
              <LCaption t={t}>Engine notes</LCaption>
              <div
                style={{
                  fontSize: 12.5,
                  color: t.inkSoft,
                  marginTop: 6,
                  lineHeight: 1.5,
                  fontFamily: HS,
                  fontWeight: 500,
                }}
              >
                {goal.engineHint}
              </div>
            </div>

            <div style={{ ...g, borderRadius: 20, padding: "14px 18px" }}>
              <LCaption t={t}>Why these subtasks</LCaption>
              <div
                style={{
                  fontSize: 12.5,
                  color: t.inkSoft,
                  marginTop: 6,
                  lineHeight: 1.5,
                  fontFamily: HS,
                  fontWeight: 500,
                }}
              >
                {goal.why}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---- STUB (surfaces not yet migrated) ----------------------
function LumenStub({ t, label }) {
  const g = makeGlass(t);
  return (
    <>
      <LMast t={t}>
        <LCaption t={t}>{label}</LCaption>
        <span style={{ flex: 1 }} />
        <LCaption t={t}>⌘K capture</LCaption>
        <LCaption t={t} style={{ color: t.ink }}>
          Marcus P.
        </LCaption>
      </LMast>
      <div
        style={{ flex: 1, display: "grid", placeItems: "center", padding: 32 }}
      >
        <div
          style={{
            ...g,
            borderRadius: 24,
            padding: "40px 44px",
            maxWidth: 460,
            textAlign: "center",
          }}
        >
          <ConicDot t={t} size={18} />
          <div
            style={{
              fontFamily: CD,
              fontSize: 30,
              fontWeight: 500,
              letterSpacing: "-0.03em",
              color: t.ink,
              marginTop: 16,
            }}
          >
            {label}
          </div>
          <div
            style={{
              fontSize: 13,
              color: t.inkSoft,
              marginTop: 10,
              lineHeight: 1.55,
              fontFamily: HS,
              fontWeight: 500,
            }}
          >
            This surface still lives as a low-fi wireframe. It’ll be rebuilt
            onto the Lumen foundation in a later pass — Today, Calendar and Item
            detail are converted first.
          </div>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { LumenToday, LumenCalendar, LumenGoal, LumenStub });
