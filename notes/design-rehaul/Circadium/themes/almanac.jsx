/* global React, TODAY */
// Almanac — cool slate paper + glass · Geist throughout · hairline rules · wireframe dashboard layout

const almanacTokens = (dark) =>
  dark
    ? {
        bg: "radial-gradient(900px 600px at 8% 12%, rgba(120,140,200,0.06), transparent 60%), radial-gradient(700px 500px at 95% 85%, rgba(140,160,200,0.05), transparent 60%), #12141a",
        bgFlat: "#12141a",
        bg2: "#181b22",
        bezel: "#06080b",
        text: "#e6e8ec",
        text2: "rgba(230,232,236,0.62)",
        text3: "rgba(230,232,236,0.38)",
        ink: "#e6e8ec",
        ink40: "rgba(230,232,236,0.40)",
        ink20: "rgba(230,232,236,0.18)",
        ink10: "rgba(230,232,236,0.08)",
        accent: "#d4847a",
        area: {
          career: "#a8a8d6",
          health: "#c2c294",
          home: "#d4a072",
          growth: "#c499bf",
          rel: "#d49494",
          finance: "#d6b772",
        },
        paneGlass: "rgba(230,232,236,0.03)",
      }
    : {
        bg: "radial-gradient(900px 600px at 8% 12%, rgba(60,80,130,0.05), transparent 60%), radial-gradient(700px 500px at 95% 85%, rgba(40,60,110,0.04), transparent 60%), #edeef1",
        bgFlat: "#edeef1",
        bg2: "#dadcdf",
        bezel: "#bbc0c6",
        text: "#0f1116",
        text2: "rgba(15,17,22,0.62)",
        text3: "rgba(15,17,22,0.38)",
        ink: "#0f1116",
        ink40: "rgba(15,17,22,0.40)",
        ink20: "rgba(15,17,22,0.18)",
        ink10: "rgba(15,17,22,0.08)",
        accent: "#8a3024",
        area: {
          career: "#4d6597",
          health: "#6b7d42",
          home: "#a85a1a",
          growth: "#7a4070",
          rel: "#a84848",
          finance: "#a07520",
        },
        paneGlass: "rgba(15,17,22,0.03)",
      };

const GE = "'Geist', sans-serif";
const GM = "'Geist Mono', monospace";

function ACard({ t, children, style = {}, padding = 0, glass = false }) {
  return (
    <div
      style={{
        border: `1px solid ${t.ink20}`,
        borderRadius: 4,
        background: glass ? t.paneGlass : "transparent",
        backdropFilter: glass ? "blur(24px) saturate(140%)" : "none",
        WebkitBackdropFilter: glass ? "blur(24px) saturate(140%)" : "none",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function AEyebrow({ t, children, style = {} }) {
  return (
    <span
      style={{
        fontFamily: GM,
        fontSize: 10,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: t.text2,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

function ANav({ t }) {
  const items = [
    ["Today", "◐", true],
    ["Library", "☰"],
    ["Calendar", "▦"],
    ["Areas", "✦"],
    ["Places", "◉"],
    ["More", "⋯"],
  ];
  return (
    <div
      style={{
        width: 196,
        flexShrink: 0,
        borderRight: `1px solid ${t.ink}`,
        background: t.paneGlass,
        backdropFilter: "blur(28px) saturate(140%)",
        WebkitBackdropFilter: "blur(28px) saturate(140%)",
        padding: "14px 12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          padding: "4px 10px 16px",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: GE,
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: -0.4,
          }}
        >
          Circadium
        </span>
      </div>
      {items.map(([k, icon, sel]) => (
        <div
          key={k}
          style={{
            padding: "8px 10px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderRadius: 3,
            background: sel ? t.ink10 : "transparent",
            color: sel ? t.text : t.text2,
            fontSize: 13,
            fontWeight: sel ? 500 : 400,
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: sel ? t.accent : t.text3,
              width: 14,
              textAlign: "center",
            }}
          >
            {icon}
          </span>
          <span style={{ letterSpacing: -0.1 }}>{k}</span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <div
        style={{
          padding: "12px 10px 4px",
          borderTop: `1px solid ${t.ink20}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: t.bg2,
            border: `1px solid ${t.ink20}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          A
        </div>
        <div style={{ lineHeight: 1.1 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Alex</div>
          <span
            style={{
              fontFamily: GM,
              fontSize: 10,
              color: t.text3,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            USER
          </span>
        </div>
      </div>
    </div>
  );
}

function AlmanacToday({ dark = false }) {
  const t = almanacTokens(dark);
  const ev = TODAY.events;
  const goals = TODAY.goals.slice(0, 3);
  const sStats = TODAY.stats.slice(1); // 3: week, overdue, streak

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        padding: 10,
        background: t.bezel,
        display: "flex",
      }}
    >
      <div
        className="tc"
        style={{
          background: t.bg,
          color: t.text,
          fontFamily: GE,
          borderRadius: 30,
          flexDirection: "row",
          overflow: "hidden",
          isolation: "isolate",
        }}
      >
        <ANav t={t} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* Masthead */}
          <div
            style={{
              padding: "14px 32px",
              borderBottom: `1px solid ${t.ink}`,
              display: "flex",
              alignItems: "baseline",
              gap: 18,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: GE,
                fontSize: 17,
                fontWeight: 600,
                letterSpacing: -0.4,
              }}
            >
              Circadium
            </span>
            <AEyebrow t={t}>Vol. 2026 · Iss. 148</AEyebrow>
            <span style={{ flex: 1 }} />
            <AEyebrow t={t}>⌘K capture</AEyebrow>
            <AEyebrow t={t} style={{ color: t.text }}>
              Alex P.
            </AEyebrow>
          </div>

          {/* Hero */}
          <div
            style={{
              padding: "28px 32px 22px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 24,
              flexShrink: 0,
              borderBottom: `1px solid ${t.ink20}`,
            }}
          >
            <div>
              <AEyebrow t={t} style={{ color: t.accent }}>
                Today · Thursday, May 28
              </AEyebrow>
              <div
                style={{
                  fontFamily: GE,
                  fontSize: 44,
                  fontWeight: 600,
                  letterSpacing: -1.6,
                  lineHeight: 1.02,
                  marginTop: 6,
                }}
              >
                Good morning,{" "}
                <span style={{ fontStyle: "italic", fontWeight: 500 }}>
                  Alex.
                </span>
              </div>
              <div style={{ fontSize: 13, color: t.text2, marginTop: 8 }}>
                <span className="tnum">6</span> things on today ·{" "}
                <span className="tnum">4h 40m</span> planned ·{" "}
                <span style={{ color: t.accent }}>1 overdue</span> · 1 scheduled
                past deadline
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button style={btn(t)}>Triage 4 →</button>
              <button style={btn(t, true)}>Open calendar</button>
            </div>
          </div>

          {/* Body */}
          <div
            style={{
              flex: 1,
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr",
              minHeight: 0,
              gap: 0,
            }}
          >
            {/* LEFT — agenda */}
            <div
              style={{
                padding: "20px 32px 24px",
                overflow: "auto",
                borderRight: `1px solid ${t.ink20}`,
              }}
              className="noscroll"
            >
              <ACard t={t}>
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: `1px solid ${t.ink20}`,
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
                    <AEyebrow t={t} style={{ marginTop: 2, display: "block" }}>
                      in scheduler order
                    </AEyebrow>
                  </div>
                  <AEyebrow t={t}>{ev.length} · 4h 40m</AEyebrow>
                </div>
                <div>
                  {ev.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "76px 1fr auto",
                        gap: 16,
                        alignItems: "center",
                        padding: "12px 18px",
                        borderTop: i ? `1px solid ${t.ink10}` : "none",
                        background: e.now ? `${t.accent}11` : "transparent",
                      }}
                    >
                      <div
                        className="tnum"
                        style={{
                          fontFamily: GM,
                          fontSize: 12,
                          letterSpacing: 0.4,
                        }}
                      >
                        <div
                          style={{
                            color: e.now ? t.accent : t.text,
                            fontWeight: e.now ? 600 : 500,
                          }}
                        >
                          {e.now ? "NOW" : e.time}
                        </div>
                        <div style={{ color: t.text3, marginTop: 2 }}>
                          {e.dur}
                        </div>
                      </div>
                      <div>
                        <div
                          style={{
                            fontSize: 15.5,
                            fontWeight: e.now ? 600 : 500,
                            letterSpacing: -0.3,
                            color: e.travel ? t.text3 : t.text,
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
                                width: 8,
                                height: 8,
                                background: t.area[e.col],
                                borderRadius: 2,
                              }}
                            />
                            <AEyebrow t={t}>
                              {e.area}
                              {e.where && ` · ${e.where}`}
                            </AEyebrow>
                            {e.kind === "plan" && (
                              <AEyebrow t={t} style={{ color: t.text3 }}>
                                · fixed
                              </AEyebrow>
                            )}
                            {e.warn && (
                              <AEyebrow t={t} style={{ color: t.accent }}>
                                · LATE
                              </AEyebrow>
                            )}
                            {e.overdue && (
                              <AEyebrow t={t} style={{ color: t.accent }}>
                                · OVERDUE
                              </AEyebrow>
                            )}
                          </div>
                        )}
                      </div>
                      <span style={{ color: t.text3, fontSize: 16 }}>›</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{
                    padding: "10px 18px",
                    borderTop: `1px solid ${t.ink20}`,
                    display: "flex",
                    alignItems: "baseline",
                    justifyContent: "space-between",
                  }}
                >
                  <AEyebrow t={t}>+ add to today</AEyebrow>
                  <AEyebrow t={t}>full week →</AEyebrow>
                </div>
              </ACard>
            </div>

            {/* RIGHT — goals + stats */}
            <div
              style={{
                padding: "20px 32px 24px",
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                background: t.paneGlass,
                backdropFilter: "blur(28px) saturate(140%)",
                WebkitBackdropFilter: "blur(28px) saturate(140%)",
              }}
              className="noscroll"
            >
              <ACard t={t}>
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: `1px solid ${t.ink20}`,
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
                      Priority goals
                    </div>
                    <AEyebrow t={t} style={{ marginTop: 2, display: "block" }}>
                      progress · next step
                    </AEyebrow>
                  </div>
                  <AEyebrow t={t}>{goals.length} active</AEyebrow>
                </div>
                <div>
                  {goals.map((g, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "14px 18px",
                        borderTop: i ? `1px solid ${t.ink10}` : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            background: t.area[g.col],
                            borderRadius: 2,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            flex: 1,
                            letterSpacing: -0.2,
                          }}
                        >
                          {g.name}
                        </span>
                        <AEyebrow t={t} className="tnum">
                          {g.sub}
                        </AEyebrow>
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          height: 5,
                          background: t.ink10,
                          borderRadius: 3,
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
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          alignItems: "baseline",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 12.5, color: t.text2 }}>
                          → {g.next}
                        </span>
                        <AEyebrow t={t}>by {g.dl}</AEyebrow>
                      </div>
                    </div>
                  ))}
                </div>
              </ACard>

              {/* Stats strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 10,
                }}
              >
                {sStats.map((s) => (
                  <ACard key={s.label} t={t} padding="12px 14px">
                    <AEyebrow t={t}>{s.label}</AEyebrow>
                    <div
                      className="tnum"
                      style={{
                        fontFamily: GE,
                        fontSize: 22,
                        fontWeight: 600,
                        letterSpacing: -0.6,
                        marginTop: 4,
                        lineHeight: 1,
                      }}
                    >
                      {s.value}
                    </div>
                    <div style={{ fontSize: 11, color: t.text3, marginTop: 3 }}>
                      {s.sub}
                    </div>
                  </ACard>
                ))}
              </div>

              {/* Engine note */}
              <ACard t={t} padding="12px 14px">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: t.area.health,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Engine</span>
                  <span style={{ flex: 1 }} />
                  <AEyebrow t={t}>last run · 2m ago</AEyebrow>
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: t.text2,
                    marginTop: 6,
                    lineHeight: 1.45,
                  }}
                >
                  42 placed · 38 honored ·{" "}
                  <span style={{ color: t.accent }}>1 fail</span> · 2 warn ·
                  view console →
                </div>
              </ACard>
            </div>
          </div>

          {/* Folio */}
          <div
            style={{
              padding: "10px 32px",
              borderTop: `1px solid ${t.ink}`,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <AEyebrow t={t}>Folio · 01 / 04 · Today</AEyebrow>
            <AEyebrow t={t}>
              Engine 2m ago — <span style={{ color: t.accent }}>1 fail</span> ·
              2 warn
            </AEyebrow>
            <AEyebrow t={t}>Circadium · Almanac</AEyebrow>
          </div>
        </div>
      </div>
    </div>
  );
}

function btn(t, primary) {
  return {
    padding: "8px 14px",
    fontFamily: GE,
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: -0.1,
    borderRadius: 4,
    border: `1px solid ${primary ? t.text : t.ink40}`,
    background: primary ? t.text : "transparent",
    color: primary ? t.bgFlat : t.text,
    cursor: "pointer",
  };
}

window.AlmanacToday = AlmanacToday;
