/* global React */
// Calendar — full-bleed week + scheduler message console

function CalendarV2() {
  return (
    <Shell active="Calendar">
      <div
        style={{
          padding: "14px 22px",
          borderBottom: "1.5px dashed var(--pencil-light)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexShrink: 0,
        }}
      >
        <div
          className="sk-script"
          style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}
        >
          Apr 8 – 14
        </div>
        <div style={{ display: "flex", gap: 4, marginLeft: 8 }}>
          <Badge>‹</Badge>
          <Badge>today</Badge>
          <Badge>›</Badge>
        </div>
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4 }}>
          {[
            ["week", true],
            ["day", false],
            ["list", false],
          ].map(([v, sel]) => (
            <div
              key={v}
              className="sk-box wob-sm"
              style={{
                padding: "4px 12px",
                fontSize: 13,
                background: sel ? "var(--ink)" : "var(--paper)",
                color: sel ? "var(--paper)" : "var(--ink)",
              }}
            >
              {v}
            </div>
          ))}
        </div>
        <Badge>filters · all areas</Badge>
        <div
          className="sk-box wob-sm tight"
          style={{ background: "var(--ink)", color: "var(--paper)" }}
        >
          regenerate ↻
        </div>
      </div>

      {/* main split */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 340px",
          minHeight: 0,
        }}
      >
        {/* Calendar */}
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            borderRight: "2px solid var(--ink)",
          }}
        >
          <FullWeekCalendar />
        </div>

        {/* Right — message console + legend */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* messages */}
          <div
            style={{
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
              }}
            >
              <span
                className="sk-script"
                style={{ fontSize: 24, fontWeight: 700 }}
              >
                Engine messages
              </span>
              <span className="sk-mono-tag">last gen · 2m ago</span>
            </div>
            <div className="sk-mono-tag" style={{ marginTop: 4 }}>
              3 warnings · 1 failure · proposed actions coming
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                overflow: "auto",
                paddingRight: 4,
              }}
            >
              <Msg
                tone="fail"
                tag="FAIL"
                title="Couldn't place: ‘refactor billing service’"
                body="6h block. No 6h gap fits this week given strict Career window & 2 plans. Try: split into 2 sessions, or relax Career window."
              />
              <Msg
                tone="warn"
                tag="LATE"
                title="‘Plant basil’ planned 3 days after deadline"
                body="Deadline was Apr 7. Earliest slot honoring Home window: today 2:00 pm."
              />
              <Msg
                tone="warn"
                tag="TRAVEL"
                title="Insufficient travel · Tue 12:30 → 1:00"
                body="office → home is 20m in regular traffic. Only 10m left between events."
              />
              <Msg
                tone="warn"
                tag="TRESPASS"
                title="‘Submit expenses’ sits in strict Health window"
                body="Wed 5:00 pm. Health window is strict — only Health items allowed. Consider relaxing or move item."
              />
              <Msg
                tone="info"
                tag="OK"
                title="42 items scheduled across the next 28 days"
                body="2 deadlines missed · 38 honored fully · 2 within travel-buffer threshold."
              />
              <Msg
                tone="info"
                tag="OK"
                title="11 travel events generated"
                body="Default mode · driving. Rush hour applied to 3 legs."
              />
            </div>
          </div>

          {/* legend */}
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1.5px dashed var(--pencil-light)",
            }}
          >
            <span className="sk-mono-tag">legend</span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 6,
                marginTop: 6,
              }}
            >
              <Badge style={{ fontSize: 11 }}>
                <Swatch color="#9bb8d6" /> Career
              </Badge>
              <Badge style={{ fontSize: 11 }}>
                <Swatch color="#b6cfa7" /> Health
              </Badge>
              <Badge style={{ fontSize: 11 }}>
                <Swatch color="#d6b9a2" /> Home
              </Badge>
              <Badge style={{ fontSize: 11 }}>
                <Swatch color="#a2c8d6" /> Growth
              </Badge>
              <Badge kind="dim" style={{ fontSize: 11 }}>
                template
              </Badge>
              <Badge style={{ fontSize: 11, borderStyle: "dashed" }}>
                travel
              </Badge>
            </div>
            <div
              style={{
                marginTop: 8,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--pencil)",
              }}
            >
              <span
                className="sk-hatch-soft"
                style={{
                  display: "inline-block",
                  width: 24,
                  height: 12,
                  border: "1px solid var(--pencil)",
                }}
              />
              <span>strict area window</span>
            </div>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Msg({ tone, tag, title, body }) {
  const tones = {
    fail: {
      border: "var(--red-ink)",
      bg: "var(--red-ink-faint)",
      tagBg: "var(--red-ink)",
      tagFg: "var(--paper)",
    },
    warn: {
      border: "var(--ink)",
      bg: "var(--highlight-soft)",
      tagBg: "var(--ink)",
      tagFg: "var(--highlight)",
    },
    info: {
      border: "var(--pencil-light)",
      bg: "transparent",
      tagBg: "var(--paper-2)",
      tagFg: "var(--pencil)",
    },
  }[tone];
  return (
    <div
      className="sk-box wob-sm"
      style={{
        padding: "8px 10px",
        background: tones.bg,
        borderColor: tones.border,
        borderWidth: tone === "fail" ? 2 : 1.5,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            fontFamily: "Special Elite, monospace",
            fontSize: 9,
            letterSpacing: 0.5,
            padding: "2px 6px",
            background: tones.tagBg,
            color: tones.tagFg,
            borderRadius: 3,
          }}
        >
          {tag}
        </span>
        <span
          style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15, flex: 1 }}
        >
          {title}
        </span>
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 12.5,
          lineHeight: 1.35,
          color: "var(--ink-soft)",
        }}
      >
        {body}
      </div>
      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
        <span style={{ fontSize: 11, color: "var(--pencil)" }}>actions:</span>
        <span style={{ fontSize: 11, color: "var(--red-ink)" }}>
          (proposed soon)
        </span>
      </div>
    </div>
  );
}

// Full-bleed calendar grid with templates, plans, tasks, travel, strict bands
function FullWeekCalendar() {
  const days = [
    "Mon 8",
    "Tue 9",
    "Wed 10",
    "Thu 11",
    "Fri 12",
    "Sat 13",
    "Sun 14",
  ];
  const hours = [
    "7a",
    "8a",
    "9a",
    "10a",
    "11a",
    "12p",
    "1p",
    "2p",
    "3p",
    "4p",
    "5p",
    "6p",
    "7p",
    "8p",
  ];
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* day header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "52px repeat(7, 1fr)",
          borderBottom: "2px solid var(--ink)",
          paddingBottom: 6,
        }}
      >
        <span />
        {days.map((d, i) => (
          <div key={d} style={{ textAlign: "center", padding: "4px 0" }}>
            <div className="sk-mono-tag" style={{ fontSize: 10 }}>
              {d.split(" ")[0]}
            </div>
            <div
              className="sk-script"
              style={{
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 1,
                color: i === 2 ? "var(--red-ink)" : "var(--ink)",
              }}
            >
              {d.split(" ")[1]}
            </div>
          </div>
        ))}
      </div>

      {/* grid */}
      <div style={{ flex: 1, position: "relative", overflow: "auto" }}>
        <div
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: "52px repeat(7, 1fr)",
            gridTemplateRows: `repeat(${hours.length}, 56px)`,
          }}
        >
          {hours.flatMap((h, ri) => [
            <span
              key={`hl${ri}`}
              className="sk-mono-tag"
              style={{
                gridRow: ri + 1,
                gridColumn: 1,
                paddingTop: 2,
                fontSize: 10,
              }}
            >
              {h}
            </span>,
            ...Array.from({ length: 7 }).map((_, ci) => (
              <div
                key={`c${ri}-${ci}`}
                style={{
                  gridRow: ri + 1,
                  gridColumn: ci + 2,
                  borderTop: "1px dashed var(--pencil-faint)",
                  borderLeft:
                    ci === 0 ? "1px dashed var(--pencil-faint)" : "none",
                  borderRight: "1px dashed var(--pencil-faint)",
                }}
              />
            )),
          ])}

          {/* strict Career window Mon/Wed/Fri 9-12 */}
          {[1, 3, 5].map((c) => (
            <div
              key={`career${c}`}
              className="sk-hatch-soft"
              style={{
                gridRow: "3 / span 3",
                gridColumn: c + 1,
                margin: 1,
              }}
            />
          ))}
          {/* strict Health window Tue/Thu 6-8a (here partial) and Sat morning */}
          <div
            className="sk-hatch-soft"
            style={{
              gridRow: "1 / span 2",
              gridColumn: 7,
              margin: 1,
              opacity: 0.5,
            }}
          />

          {/* template events */}
          <Evt col={2} row="3 / span 1" tone="tmpl" label="standup" />
          <Evt col={3} row="3 / span 1" tone="tmpl" label="standup" />
          <Evt col={4} row="3 / span 1" tone="tmpl" label="standup" />
          <Evt col={5} row="3 / span 1" tone="tmpl" label="standup" />
          <Evt col={6} row="3 / span 1" tone="tmpl" label="standup" />
          {/* sleep template — bottom rows on weekends */}
          <Evt col={7} row="13 / span 2" tone="tmpl" label="wind down" />

          {/* tasks */}
          <Evt
            col={2}
            row="4 / span 3"
            tone="task"
            cat="career"
            label="Q4 doc · deep work"
          />
          <Evt
            col={4}
            row="3 / span 3"
            tone="task"
            cat="career"
            label="Q4 doc · deep work pt 2"
            emphasize
          />
          <Evt
            col={3}
            row="8 / span 1"
            tone="task"
            cat="home"
            label="plant basil ⚠"
            warn
          />
          <Evt
            col={3}
            row="9 / span 1"
            tone="task"
            cat="health"
            label="intervals 800×4"
          />
          <Evt
            col={5}
            row="11 / span 1"
            tone="task"
            cat="career"
            label="submit expenses"
            warn
          />

          {/* plans */}
          <Evt col={3} row="6 / span 1" tone="plan" label="1:1 ana" />
          <Evt
            col={6}
            row="10 / span 2"
            tone="plan"
            label="dentist · crown follow-up"
          />
          <Evt col={7} row="6 / span 2" tone="plan" label="brunch w/ T" />

          {/* travel */}
          <Evt
            col={3}
            row="7 / span 1"
            tone="travel"
            label="🚗 → home"
            partial
          />
          <Evt
            col={6}
            row="12 / span 1"
            tone="travel"
            label="🚗 → home"
            partial
          />

          {/* now line */}
          <div
            style={{
              position: "absolute",
              left: 52,
              right: 0,
              top: `${(2 + 0.6) * 56}px`,
              borderTop: "2px dashed var(--red-ink)",
              zIndex: 5,
            }}
          >
            <span
              style={{
                position: "absolute",
                left: `${(2 / 7) * 100}%`,
                top: -10,
                transform: "translateX(-50%)",
                background: "var(--red-ink)",
                color: "var(--paper)",
                padding: "1px 6px",
                fontFamily: "Special Elite, monospace",
                fontSize: 10,
                borderRadius: 3,
              }}
            >
              NOW · 9:36a
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Evt({ col, row, tone, label, cat, emphasize, warn, partial }) {
  const catColors = {
    career: "#9bb8d6",
    health: "#b6cfa7",
    home: "#d6b9a2",
    growth: "#a2c8d6",
  };
  const baseStyle = {
    gridColumn: col,
    gridRow: row,
    margin: 2,
    padding: "4px 6px",
    fontSize: 11,
    borderRadius: 5,
    overflow: "hidden",
    whiteSpace: "nowrap",
    lineHeight: 1.1,
  };
  let style;
  if (tone === "tmpl") {
    style = {
      background: "var(--pencil-faint)",
      color: "var(--ink-soft)",
      border: "1px dashed var(--pencil)",
    };
  } else if (tone === "plan") {
    style = { background: "var(--ink)", color: "var(--paper)" };
  } else if (tone === "travel") {
    style = {
      background: "transparent",
      color: "var(--pencil)",
      border: "1px dashed var(--pencil)",
      opacity: 0.8,
      fontSize: 10,
    };
  } else {
    style = {
      background: catColors[cat] || "var(--paper-2)",
      color: "var(--ink)",
      border: warn ? "2px solid var(--red-ink)" : "1.5px solid var(--ink)",
      boxShadow: emphasize ? "2px 2px 0 var(--ink)" : "none",
    };
  }
  return <div style={{ ...baseStyle, ...style }}>{label}</div>;
}

window.CalendarV2 = CalendarV2;
window.FullWeekCalendar = FullWeekCalendar;
