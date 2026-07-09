/* global React, TODAY, WEEK, GOAL */
// Quill — calm minimal monochrome · Geist Sans · single warm coral accent

const quillTokens = (dark) =>
  dark
    ? {
        bg: "#0d0d0d",
        surface: "#161616",
        surface2: "#1c1c1c",
        border: "rgba(255,255,255,0.06)",
        borderHi: "rgba(255,255,255,0.12)",
        text: "#f5f5f4",
        text2: "#a3a3a0",
        text3: "#737370",
        text4: "#4a4a48",
        accent: "#e35a34",
        accentSoft: "rgba(227,90,52,0.16)",
        area: {
          career: "#3690e8",
          health: "#38c554",
          home: "#e88a1a",
          growth: "#a64ad9",
          rel: "#e3346b",
          finance: "#e6ad15",
        },
        danger: "#e33734",
        warn: "#e88a1a",
        success: "#38c554",
        hl: "rgba(255,255,255,0.025)",
        shadow: "none",
      }
    : {
        bg: "#fafaf9",
        surface: "#ffffff",
        surface2: "#f5f4f1",
        border: "#ebe9e5",
        borderHi: "#d6d3cd",
        text: "#1c1c1a",
        text2: "#65645f",
        text3: "#92918b",
        text4: "#c5c3bc",
        accent: "#cc4729",
        accentSoft: "rgba(204,71,41,0.12)",
        area: {
          career: "#1e6fd1",
          health: "#2eaa46",
          home: "#d4730a",
          growth: "#8c3fcc",
          rel: "#cc2960",
          finance: "#cc961a",
        },
        danger: "#cc2926",
        warn: "#d4730a",
        success: "#2eaa46",
        hl: "rgba(0,0,0,0.025)",
        shadow: "0 1px 2px rgba(28,28,26,0.04), 0 1px 0 rgba(28,28,26,0.02)",
      };

const QUILL_UI = "Geist, -apple-system, sans-serif";

function QNav({ t, active }) {
  const items = [
    ["Today", "◐"],
    ["Library", "☰"],
    ["Calendar", "▦"],
    ["Areas", "✦"],
    ["Places", "◉"],
  ];
  return (
    <div
      style={{
        width: 240,
        flexShrink: 0,
        borderRight: `1px solid ${t.border}`,
        background: t.bg,
        padding: "24px 16px",
        display: "flex",
        flexDirection: "column",
        fontFamily: QUILL_UI,
      }}
    >
      <div
        style={{
          padding: "0 10px 24px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 24,
            height: 24,
            borderRadius: 7,
            background: t.accent,
          }}
        />
        <div
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.3,
            color: t.text,
          }}
        >
          Circadium
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {items.map(([k, icon]) => {
          const sel = k === active;
          return (
            <div
              key={k}
              style={{
                padding: "9px 12px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderRadius: 8,
                background: sel ? t.surface2 : "transparent",
                color: sel ? t.text : t.text2,
                fontWeight: sel ? 500 : 400,
                fontSize: 14,
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: sel ? t.accent : t.text3,
                  width: 14,
                }}
              >
                {icon}
              </span>
              <span>{k}</span>
            </div>
          );
        })}
      </div>
      <div
        style={{
          marginTop: 16,
          padding: "10px 12px",
          borderRadius: 8,
          background: t.surface,
          border: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          color: t.text2,
        }}
      >
        <span>⌘K</span>
        <span style={{ flex: 1 }}>capture</span>
        <span style={{ color: t.accent }}>+</span>
      </div>

      <div
        style={{
          marginTop: "auto",
          padding: "12px 10px",
          borderTop: `1px solid ${t.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: t.surface2,
            border: `1px solid ${t.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 600,
            color: t.text2,
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: t.text }}>
            Alex Patel
          </div>
          <div style={{ fontSize: 11, color: t.text3 }}>
            alex@hyperisland.se
          </div>
        </div>
      </div>
    </div>
  );
}

function QCard({ t, children, style = {}, padding = 24 }) {
  return (
    <div
      style={{
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        padding,
        boxShadow: t.shadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function QDot({ color, size = 8 }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function QTag({ t, children, accent, danger, warn, style = {} }) {
  const cfg = accent
    ? { bg: t.accentSoft, color: t.accent }
    : danger
      ? { bg: `${t.danger}15`, color: t.danger }
      : warn
        ? { bg: `${t.warn}18`, color: t.warn }
        : { bg: t.hl, color: t.text2 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 8px",
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 11.5,
        fontWeight: 500,
        letterSpacing: -0.05,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function QBtn({ t, children, primary, ghost, style = {} }) {
  return (
    <button
      style={{
        padding: "8px 14px",
        borderRadius: 8,
        background: primary ? t.accent : ghost ? "transparent" : t.surface,
        color: primary ? "#fff" : ghost ? t.text2 : t.text,
        border: ghost ? "none" : `1px solid ${primary ? t.accent : t.border}`,
        fontSize: 13,
        fontWeight: 500,
        fontFamily: QUILL_UI,
        cursor: "pointer",
        boxShadow: primary ? "none" : t.shadow,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// TODAY
// ─────────────────────────────────────────────────────────────
function QuillToday({ dark = false }) {
  const t = quillTokens(dark);
  return (
    <div
      className="tc"
      style={{ background: t.bg, color: t.text, fontFamily: QUILL_UI }}
    >
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <QNav t={t} active="Today" />
        <div
          style={{ flex: 1, overflow: "auto", padding: "40px 48px 48px" }}
          className="noscroll"
        >
          <div style={{ maxWidth: 1080, margin: "0 auto" }}>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 36,
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: t.text3, fontWeight: 500 }}>
                  {TODAY.date}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 600,
                    letterSpacing: -1,
                    marginTop: 8,
                  }}
                >
                  {TODAY.greeting}
                </div>
                <div style={{ fontSize: 15, color: t.text2, marginTop: 8 }}>
                  6 things on today · 4h 40m planned ·{" "}
                  <span style={{ color: t.danger }}>1 overdue</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <QBtn t={t}>Capture</QBtn>
                <QBtn t={t} primary>
                  Open calendar →
                </QBtn>
              </div>
            </div>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
                marginBottom: 28,
              }}
            >
              {TODAY.stats.map((s) => (
                <QCard key={s.label} t={t} padding={18}>
                  <div
                    style={{ fontSize: 12, color: t.text3, fontWeight: 500 }}
                  >
                    {s.label}
                  </div>
                  <div
                    className="tnum"
                    style={{
                      fontSize: 30,
                      fontWeight: 600,
                      marginTop: 6,
                      letterSpacing: -0.6,
                    }}
                  >
                    {s.value}
                  </div>
                  <div style={{ fontSize: 12, color: t.text3, marginTop: 2 }}>
                    {s.sub}
                  </div>
                </QCard>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.5fr 1fr",
                gap: 20,
              }}
            >
              {/* schedule */}
              <QCard t={t} padding={0}>
                <div
                  style={{
                    padding: "20px 24px 16px",
                    borderBottom: `1px solid ${t.border}`,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: -0.2,
                      }}
                    >
                      What to do today
                    </div>
                    <div style={{ fontSize: 12, color: t.text3, marginTop: 4 }}>
                      scheduler order
                    </div>
                  </div>
                  <QBtn t={t} ghost>
                    view week →
                  </QBtn>
                </div>
                <div style={{ padding: "4px 8px 12px" }}>
                  {TODAY.events.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "64px 1fr auto",
                        gap: 16,
                        alignItems: "center",
                        padding: "14px 16px",
                        borderRadius: 10,
                        background: e.now ? t.accentSoft : "transparent",
                        borderLeft: e.now
                          ? `3px solid ${t.accent}`
                          : "3px solid transparent",
                        opacity: e.travel ? 0.5 : 1,
                      }}
                    >
                      <div style={{ lineHeight: 1.15 }}>
                        <div
                          className="tnum"
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: e.now ? t.accent : t.text,
                          }}
                        >
                          {e.now ? "Now" : e.time}
                        </div>
                        <div
                          className="tnum"
                          style={{ fontSize: 12, color: t.text3, marginTop: 2 }}
                        >
                          {e.dur}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 14.5,
                            fontWeight: 500,
                            color: e.travel ? t.text3 : t.text,
                          }}
                        >
                          {e.title}
                        </div>
                        {!e.travel && (
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                              marginTop: 5,
                            }}
                          >
                            <QDot color={t.area[e.col]} size={6} />
                            <span style={{ fontSize: 12, color: t.text2 }}>
                              {e.area}
                            </span>
                            {e.where && (
                              <span style={{ fontSize: 12, color: t.text3 }}>
                                · {e.where}
                              </span>
                            )}
                            {e.kind === "plan" && (
                              <QTag
                                t={t}
                                style={{ fontSize: 10, padding: "2px 6px" }}
                              >
                                plan
                              </QTag>
                            )}
                            {e.warn && (
                              <QTag t={t} warn style={{ fontSize: 10 }}>
                                past deadline
                              </QTag>
                            )}
                            {e.overdue && (
                              <QTag t={t} danger style={{ fontSize: 10 }}>
                                overdue
                              </QTag>
                            )}
                          </div>
                        )}
                      </div>
                      <span style={{ color: t.text3, fontSize: 16 }}>›</span>
                    </div>
                  ))}
                </div>
              </QCard>

              {/* Goals + Engine */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 20 }}
              >
                <QCard t={t} padding={0}>
                  <div
                    style={{
                      padding: "20px 24px 12px",
                      borderBottom: `1px solid ${t.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        letterSpacing: -0.2,
                      }}
                    >
                      Priority goals
                    </div>
                  </div>
                  <div style={{ padding: "4px 24px 16px" }}>
                    {TODAY.goals.map((g, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "14px 0",
                          borderBottom:
                            i < TODAY.goals.length - 1
                              ? `1px solid ${t.border}`
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <QDot color={t.area[g.col]} size={6} />
                          <span
                            style={{ fontSize: 14, fontWeight: 500, flex: 1 }}
                          >
                            {g.name}
                          </span>
                          <span
                            className="tnum"
                            style={{ fontSize: 12, color: t.text3 }}
                          >
                            {g.sub}
                          </span>
                        </div>
                        <div
                          style={{
                            marginTop: 8,
                            height: 4,
                            borderRadius: 2,
                            background: t.hl,
                            position: "relative",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              width: `${g.pct}%`,
                              background: t.area[g.col],
                              borderRadius: 2,
                            }}
                          />
                        </div>
                        <div
                          style={{ fontSize: 12, color: t.text3, marginTop: 6 }}
                        >
                          → <span style={{ color: t.text2 }}>{g.next}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </QCard>

                <QCard t={t} padding={18}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: t.success,
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      Engine
                    </span>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: t.text3,
                      }}
                    >
                      2m ago
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 12.5,
                      color: t.text2,
                      marginTop: 8,
                      lineHeight: 1.5,
                    }}
                  >
                    42 placed · 38 honored ·{" "}
                    <span style={{ color: t.warn }}>2 late</span> ·{" "}
                    <span style={{ color: t.danger }}>1 fail</span>
                  </div>
                  <QBtn
                    t={t}
                    ghost
                    style={{ padding: "6px 0", marginTop: 4, fontSize: 12 }}
                  >
                    view console →
                  </QBtn>
                </QCard>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDAR
// ─────────────────────────────────────────────────────────────
function QuillCalendar({ dark = false }) {
  const t = quillTokens(dark);
  return (
    <div
      className="tc"
      style={{ background: t.bg, color: t.text, fontFamily: QUILL_UI }}
    >
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <QNav t={t} active="Calendar" />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          <div
            style={{
              padding: "18px 32px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: t.bg,
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>
              {WEEK.range}
            </div>
            <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
              <QBtn t={t} style={{ padding: "6px 10px" }}>
                ‹
              </QBtn>
              <QBtn t={t} style={{ padding: "6px 12px" }}>
                Today
              </QBtn>
              <QBtn t={t} style={{ padding: "6px 10px" }}>
                ›
              </QBtn>
            </div>
            <span style={{ flex: 1 }} />
            <QTag t={t}>All areas</QTag>
            <QTag t={t}>Week ▾</QTag>
            <QBtn t={t} primary>
              ↻ Regenerate
            </QBtn>
          </div>

          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <div
              style={{
                flex: 1,
                padding: "20px 24px 24px 32px",
                overflow: "hidden",
              }}
            >
              <QCalGrid t={t} />
            </div>
            <div
              style={{
                width: 320,
                flexShrink: 0,
                borderLeft: `1px solid ${t.border}`,
                padding: "20px 20px 24px",
                background: t.bg,
                overflow: "auto",
              }}
              className="noscroll"
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600 }}>Engine</span>
                <QTag t={t}>2m ago</QTag>
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {WEEK.engineMsgs.map((m, i) => {
                  const c =
                    m.tone === "fail"
                      ? t.danger
                      : m.tone === "warn"
                        ? t.warn
                        : t.success;
                  return (
                    <div
                      key={i}
                      style={{
                        background: t.surface,
                        border: `1px solid ${t.border}`,
                        borderLeft: `3px solid ${c}`,
                        borderRadius: 8,
                        padding: "12px 14px",
                        boxShadow: t.shadow,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <QTag
                          t={t}
                          style={{
                            background: `${c}15`,
                            color: c,
                            fontSize: 10,
                            padding: "2px 6px",
                          }}
                        >
                          {m.tag}
                        </QTag>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>
                          {m.title}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: t.text2,
                          marginTop: 6,
                          lineHeight: 1.45,
                        }}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QCalGrid({ t }) {
  const hourHeight = 44;
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: t.surface,
        border: `1px solid ${t.border}`,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: t.shadow,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "56px repeat(7, 1fr)",
          background: t.surface2,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <div />
        {WEEK.days.map((d) => (
          <div
            key={d.n}
            style={{
              padding: "12px 0",
              textAlign: "center",
              borderLeft: `1px solid ${t.border}`,
            }}
          >
            <div style={{ fontSize: 11, color: t.text3, fontWeight: 500 }}>
              {d.d}
            </div>
            <div
              className="tnum"
              style={{
                fontSize: 22,
                fontWeight: 600,
                marginTop: 4,
                color: d.today ? t.accent : t.text,
                letterSpacing: -0.4,
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
            gridTemplateRows: `repeat(${WEEK.hours.length}, ${hourHeight}px)`,
            position: "relative",
          }}
        >
          {WEEK.hours.map((h, ri) => (
            <React.Fragment key={h}>
              <div
                style={{
                  gridRow: ri + 1,
                  gridColumn: 1,
                  padding: "2px 8px",
                  fontSize: 11,
                  color: t.text3,
                  borderTop: ri ? `1px solid ${t.border}` : "none",
                }}
                className="tnum"
              >
                {h}:00
              </div>
              {WEEK.days.map((_, ci) => (
                <div
                  key={ci}
                  style={{
                    gridRow: ri + 1,
                    gridColumn: ci + 2,
                    borderTop: ri ? `1px solid ${t.border}` : "none",
                    borderLeft: `1px solid ${t.border}`,
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
                  background: t.hl,
                  pointerEvents: "none",
                }}
              />
            );
          })}

          {WEEK.events.map((e, i) => {
            const top = (e.start - 7) * hourHeight + 2;
            const height = (e.end - e.start) * hourHeight - 4;
            const color = e.col ? t.area[e.col] : t.text3;
            const isPlan = e.kind === "plan";
            const isTmpl = e.kind === "tmpl";
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `calc(56px + (100% - 56px) * ${e.day} / 7 + 3px)`,
                  width: `calc((100% - 56px) / 7 - 6px)`,
                  top,
                  height,
                  background: e.travel
                    ? "transparent"
                    : isTmpl
                      ? `${color}26`
                      : color,
                  color: e.travel ? t.text3 : isTmpl ? color : "#fff",
                  border: e.travel
                    ? `1px dashed ${t.borderHi}`
                    : e.warn
                      ? `1px solid ${t.warn}`
                      : "none",
                  borderLeft: e.travel
                    ? `1px dashed ${t.borderHi}`
                    : e.warn
                      ? `1px solid ${t.warn}`
                      : "none",
                  borderRadius: 6,
                  padding: "4px 7px",
                  fontSize: 11,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  fontWeight: isPlan || e.current ? 500 : 400,
                  opacity: isTmpl ? 0.5 : 1,
                }}
              >
                <div>{e.title}</div>
                {height > 36 && !e.travel && !isTmpl && (
                  <div
                    className="tnum"
                    style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}
                  >
                    {fmtQ(e.start)}–{fmtQ(e.end)}
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
              background: t.accent,
              zIndex: 5,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: -5,
                top: -3,
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: t.accent,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function fmtQ(h) {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────
// GOAL DETAIL
// ─────────────────────────────────────────────────────────────
function QuillGoal({ dark = false }) {
  const t = quillTokens(dark);
  const g = GOAL;
  return (
    <div
      className="tc"
      style={{ background: t.bg, color: t.text, fontFamily: QUILL_UI }}
    >
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <QNav t={t} active="Library" />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 32px",
              borderBottom: `1px solid ${t.border}`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              color: t.text3,
            }}
          >
            <span>Library</span>
            <span>›</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: t.text2,
              }}
            >
              <QDot color={t.area[g.col]} size={6} /> {g.area}
            </span>
            <span>›</span>
            <span style={{ color: t.text }}>{g.title}</span>
          </div>

          <div
            style={{ flex: 1, overflow: "auto", padding: "32px 40px 40px" }}
            className="noscroll"
          >
            <div style={{ maxWidth: 1100, margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                  gap: 24,
                }}
              >
                <div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <QTag t={t} accent>
                      Goal
                    </QTag>
                    <QTag t={t}>
                      <QDot color={t.area[g.col]} size={6} /> {g.area}
                    </QTag>
                    <QTag t={t}>In progress</QTag>
                  </div>
                  <div
                    style={{
                      fontSize: 40,
                      fontWeight: 600,
                      letterSpacing: -1,
                      marginTop: 14,
                      lineHeight: 1.05,
                    }}
                  >
                    {g.title}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <QBtn t={t} ghost>
                    Duplicate
                  </QBtn>
                  <QBtn t={t}>Delete</QBtn>
                  <QBtn t={t} primary>
                    Save
                  </QBtn>
                </div>
              </div>

              {/* progress */}
              <QCard t={t} padding={22} style={{ marginTop: 24 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "baseline", gap: 14 }}
                  >
                    <span
                      className="tnum"
                      style={{
                        fontSize: 36,
                        fontWeight: 600,
                        letterSpacing: -1,
                      }}
                    >
                      {g.pct}
                      <span style={{ fontSize: 22 }}>%</span>
                    </span>
                    <span style={{ fontSize: 13, color: t.text2 }}>
                      {g.done} of {g.total} subtasks · {g.totalDur} total
                    </span>
                  </div>
                  <span style={{ fontSize: 13, color: t.text2 }}>
                    by {g.dl} · {g.weeksLeft}w left
                  </span>
                </div>
                <div
                  style={{
                    height: 8,
                    background: t.hl,
                    borderRadius: 4,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${g.pct}%`,
                      background: t.area[g.col],
                      borderRadius: 4,
                    }}
                  />
                  {Array.from({ length: g.total - 1 }).map((_, i) => (
                    <span
                      key={i}
                      style={{
                        position: "absolute",
                        top: 0,
                        bottom: 0,
                        left: `${((i + 1) / g.total) * 100}%`,
                        width: 1,
                        background: t.surface,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              </QCard>

              {/* tabs */}
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  marginTop: 24,
                  borderBottom: `1px solid ${t.border}`,
                }}
              >
                {["Overview", "Schedule", "Subtasks", "Activity"].map(
                  (tab, i) => (
                    <div
                      key={tab}
                      style={{
                        padding: "12px 18px",
                        fontSize: 13,
                        fontWeight: 500,
                        color: i === 0 ? t.text : t.text2,
                        borderBottom:
                          i === 0
                            ? `2px solid ${t.accent}`
                            : "2px solid transparent",
                        marginBottom: -1,
                      }}
                    >
                      {tab}
                      {tab === "Subtasks" && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: t.text3,
                          }}
                        >
                          12
                        </span>
                      )}
                    </div>
                  ),
                )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr",
                  gap: 22,
                  marginTop: 24,
                }}
              >
                {/* subtasks + identity */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  <QCard t={t} padding={0}>
                    <div
                      style={{
                        padding: "16px 22px",
                        borderBottom: `1px solid ${t.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        Subtasks · preview
                      </div>
                      <QBtn
                        t={t}
                        ghost
                        style={{ padding: "4px 0", fontSize: 12 }}
                      >
                        all 12 →
                      </QBtn>
                    </div>
                    <div>
                      {g.subtasks.slice(0, 6).map((s, i) => (
                        <QSubRow t={t} s={s} key={i} last={i === 5} />
                      ))}
                    </div>
                  </QCard>

                  <QCard t={t} padding={0}>
                    <div
                      style={{
                        padding: "16px 22px",
                        borderBottom: `1px solid ${t.border}`,
                        fontSize: 14,
                        fontWeight: 600,
                      }}
                    >
                      Identity
                    </div>
                    <div
                      style={{
                        padding: "18px 22px",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "18px 28px",
                      }}
                    >
                      <QField
                        t={t}
                        label="Type"
                        v={
                          <QTag t={t} accent>
                            Goal
                          </QTag>
                        }
                      />
                      <QField
                        t={t}
                        label="Area"
                        v={
                          <QTag t={t}>
                            <QDot color={t.area[g.col]} size={6} /> {g.area}
                          </QTag>
                        }
                      />
                      <QField
                        t={t}
                        label="Priority"
                        v={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 5,
                                borderRadius: 3,
                                background: t.hl,
                                position: "relative",
                                maxWidth: 130,
                              }}
                            >
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  width: `${g.priority * 10}%`,
                                  background: t.accent,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                            <span
                              className="tnum"
                              style={{ fontSize: 13, fontWeight: 600 }}
                            >
                              {g.priority}
                            </span>
                          </div>
                        }
                      />
                      <QField
                        t={t}
                        label="Duration"
                        v={
                          <span style={{ fontSize: 14 }}>
                            <span className="tnum" style={{ fontWeight: 600 }}>
                              {g.totalDur}
                            </span>{" "}
                            <span style={{ color: t.text3 }}>rolled-up</span>
                          </span>
                        }
                      />
                      <QField
                        t={t}
                        label="Place"
                        v={
                          <>
                            <QTag t={t}>📍 {g.place}</QTag>{" "}
                            <span
                              style={{
                                fontSize: 11,
                                color: t.text3,
                                marginLeft: 6,
                              }}
                            >
                              inherited
                            </span>
                          </>
                        }
                      />
                      <QField
                        t={t}
                        label="Deadline"
                        v={
                          <span style={{ fontSize: 14, fontWeight: 600 }}>
                            {g.dl}
                          </span>
                        }
                      />
                    </div>
                  </QCard>
                </div>

                {/* right rail */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 18 }}
                >
                  <QCard
                    t={t}
                    padding={20}
                    style={{
                      background: dark
                        ? `${t.area[g.col]}15`
                        : `${t.area[g.col]}10`,
                      borderColor: `${t.area[g.col]}33`,
                    }}
                  >
                    <div
                      style={{ fontSize: 12, color: t.text3, fontWeight: 500 }}
                    >
                      Next on calendar
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        marginTop: 6,
                        letterSpacing: -0.6,
                      }}
                    >
                      {g.next.day} · {g.next.time}
                    </div>
                    <div style={{ fontSize: 13, color: t.text2, marginTop: 4 }}>
                      {g.next.title} · {g.next.dur}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <QBtn t={t} style={{ padding: "6px 10px", fontSize: 12 }}>
                        view calendar
                      </QBtn>
                      <QBtn t={t} style={{ padding: "6px 10px", fontSize: 12 }}>
                        reschedule
                      </QBtn>
                    </div>
                  </QCard>

                  <QCard t={t} padding={18}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: t.accent,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        ✦
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        AI helper
                      </span>
                      <span
                        style={{
                          marginLeft: "auto",
                          fontSize: 11,
                          color: t.text3,
                        }}
                      >
                        scoped to goal
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: t.surface2,
                        border: `1px solid ${t.border}`,
                        fontSize: 13,
                        color: t.text2,
                      }}
                    >
                      Tighten last 2 weeks · add recovery
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      {[
                        "estimate",
                        "split subtask",
                        "tighten",
                        "add taper",
                      ].map((c) => (
                        <QTag t={t} key={c}>
                          ✦ {c}
                        </QTag>
                      ))}
                    </div>
                  </QCard>

                  <QCard t={t} padding={18}>
                    <div
                      style={{ fontSize: 12, color: t.text3, fontWeight: 500 }}
                    >
                      Engine notes
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: t.text2,
                        marginTop: 6,
                        lineHeight: 1.5,
                      }}
                    >
                      {g.engineHint}
                    </div>
                  </QCard>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QSubRow({ t, s, last }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr auto auto",
        gap: 14,
        alignItems: "center",
        padding: "10px 22px",
        borderTop: `1px solid ${t.border}`,
        background: s.current ? t.accentSoft : "transparent",
        borderLeft: s.current
          ? `3px solid ${t.accent}`
          : "3px solid transparent",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          border: `1.5px solid ${s.done ? t.success : t.borderHi}`,
          background: s.done ? t.success : "transparent",
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
          color: s.done ? t.text3 : t.text,
          textDecoration: s.done ? "line-through" : "none",
          fontWeight: s.current ? 500 : 400,
        }}
      >
        {s.t}
      </span>
      <span className="tnum" style={{ fontSize: 11.5, color: t.text3 }}>
        {s.dur}
      </span>
      <span style={{ fontSize: 11.5, color: s.current ? t.accent : t.text3 }}>
        {s.sched || s.dl}
      </span>
    </div>
  );
}

function QField({ t, label, v }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: t.text3,
          fontWeight: 500,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div>{v}</div>
    </div>
  );
}

window.QuillToday = QuillToday;
window.QuillCalendar = QuillCalendar;
window.QuillGoal = QuillGoal;
