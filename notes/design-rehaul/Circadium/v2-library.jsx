/* global React */
// Library v2 — left rail w/ smart views + NESTED categories tree + main table

function LibraryV2() {
  return (
    <Shell active="Library">
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          minHeight: 0,
        }}
      >
        {/* LEFT — smart views + nested category tree */}
        <div
          style={{
            borderRight: "2px solid var(--ink)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Smart views */}
          <div
            style={{
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 4,
              borderBottom: "1.5px dashed var(--pencil-light)",
            }}
          >
            <div className="sk-mono-tag" style={{ marginBottom: 4 }}>
              smart views
            </div>
            {[
              ["🔥", "Today", "4"],
              ["📆", "This week", "12"],
              ["📥", "Inbox", "7", "red"],
              ["⏰", "Overdue", "2", "red"],
              ["🎯", "All goals", "8"],
              ["🏁", "All plans", "6"],
              ["✓", "Done · 7d", "11"],
            ].map(([icon, name, count, tone]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "4px 8px",
                  fontSize: 14,
                  borderRadius: 5,
                }}
              >
                <span>{icon}</span>
                <span style={{ flex: 1 }}>{name}</span>
                <span
                  className="sk-mono-tag"
                  style={{
                    color: tone === "red" ? "var(--red-ink)" : "var(--pencil)",
                    fontWeight: tone === "red" ? 700 : 400,
                  }}
                >
                  {count}
                </span>
              </div>
            ))}
            <div
              style={{
                padding: "4px 8px",
                fontSize: 13,
                color: "var(--pencil)",
              }}
            >
              + save current view
            </div>
          </div>

          {/* Browse (link to table view of all) */}
          <div style={{ padding: "12px 12px 8px" }}>
            <div
              className="sk-box wob-sm"
              style={{
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--ink)",
                color: "var(--paper)",
                fontSize: 14,
              }}
            >
              <span>🗂</span>
              <span style={{ flex: 1, fontWeight: 700 }}>Browse all</span>
              <span
                className="sk-mono-tag"
                style={{ color: "var(--paper)", opacity: 0.7 }}
              >
                42
              </span>
            </div>
            <div className="sk-mono-tag" style={{ marginTop: 6 }}>
              filter · sort · group · search
            </div>
          </div>

          {/* NESTED categories tree (file-route style) */}
          <div style={{ padding: "8px 8px 14px", overflow: "auto", flex: 1 }}>
            <div className="sk-mono-tag" style={{ padding: "0 6px 6px" }}>
              life areas
            </div>
            <Tree
              items={[
                {
                  icon: "🌅",
                  name: "Career",
                  color: "#9bb8d6",
                  count: 14,
                  open: true,
                  children: [
                    { name: "Q4 strategy", kind: "goal", count: 6 },
                    {
                      name: "Hiring",
                      kind: "goal",
                      count: 5,
                      open: true,
                      children: [
                        {
                          name: "back-end role",
                          kind: "goal",
                          count: 3,
                          sel: true,
                        },
                        { name: "designer role", kind: "goal", count: 2 },
                      ],
                    },
                    { name: "Admin", kind: "folder", count: 3 },
                  ],
                },
                {
                  icon: "🧘",
                  name: "Health",
                  color: "#b6cfa7",
                  count: 9,
                  open: true,
                  children: [
                    { name: "10k training", kind: "goal", count: 12 },
                    { name: "Medical", kind: "folder", count: 2 },
                    { name: "Mind", kind: "folder", count: 1 },
                  ],
                },
                {
                  icon: "🏠",
                  name: "Home",
                  color: "#d6b9a2",
                  count: 5,
                  open: false,
                  children: [],
                },
                {
                  icon: "❤️",
                  name: "Relationships",
                  color: "#d6a2b9",
                  count: 4,
                  open: false,
                  children: [],
                },
                {
                  icon: "💰",
                  name: "Finance",
                  color: "#d6cea2",
                  count: 3,
                  open: false,
                  children: [],
                },
                {
                  icon: "🌱",
                  name: "Growth",
                  color: "#a2c8d6",
                  count: 7,
                  open: true,
                  children: [
                    { name: "Spanish · 30d", kind: "goal", count: 30 },
                    { name: "Reading", kind: "folder", count: 2 },
                  ],
                },
              ]}
            />
            <div
              style={{
                padding: "6px 10px",
                fontSize: 13,
                color: "var(--pencil)",
              }}
            >
              + new area / sub-area
            </div>
          </div>
        </div>

        {/* RIGHT — main browse area */}
        <div
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* breadcrumb + actions */}
          <div
            style={{
              padding: "14px 22px",
              borderBottom: "1.5px dashed var(--pencil-light)",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--pencil)" }}>Library</span>
              <span style={{ color: "var(--pencil-light)" }}>›</span>
              <Badge style={{ fontSize: 12 }}>
                <Swatch color="#9bb8d6" />
                🌅 Career
              </Badge>
              <span style={{ color: "var(--pencil-light)" }}>›</span>
              <Badge style={{ fontSize: 12 }}>Hiring</Badge>
              <span style={{ color: "var(--pencil-light)" }}>›</span>
              <span
                className="sk-script"
                style={{ fontSize: 22, fontWeight: 700, lineHeight: 1 }}
              >
                back-end role
              </span>
              <Badge kind="dark" style={{ fontSize: 11, marginLeft: 4 }}>
                goal · 3 items
              </Badge>
            </div>
            <span style={{ flex: 1 }} />
            <div
              className="sk-box wob-sm tight"
              style={{
                background: "var(--ink)",
                color: "var(--paper)",
                padding: "4px 12px",
              }}
            >
              + new item here
            </div>
          </div>

          {/* filter strip */}
          <div
            style={{
              padding: "10px 22px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
              borderBottom: "1.5px dashed var(--pencil-light)",
            }}
          >
            <div
              className="sk-box wob-pill"
              style={{
                padding: "4px 12px",
                display: "flex",
                gap: 6,
                alignItems: "center",
                minWidth: 200,
              }}
            >
              <span style={{ color: "var(--pencil)" }}>⌕</span>
              <span style={{ color: "var(--pencil)", fontSize: 13 }}>
                search in this area…
              </span>
            </div>
            <Badge>type · any ▾</Badge>
            <Badge>status · all ▾</Badge>
            <Badge>incl. sub-areas ▾</Badge>
            <Badge>sort · deadline ▾</Badge>
            <span style={{ flex: 1 }} />
            <div style={{ display: "flex", gap: 4 }}>
              {[
                ["table", true],
                ["cards", false],
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
          </div>

          {/* table */}
          <div style={{ flex: 1, overflow: "auto", padding: "6px 22px 22px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "24px 1fr 70px 80px 130px 100px 90px 30px",
                padding: "8px 4px",
                fontSize: 11,
                color: "var(--pencil)",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                fontFamily: "Special Elite, monospace",
                borderBottom: "1.5px solid var(--ink)",
              }}
            >
              <span />
              <span>title</span>
              <span>type</span>
              <span>duration</span>
              <span>deadline</span>
              <span>where</span>
              <span>status</span>
              <span />
            </div>
            {[
              {
                t: "Screen 3 candidates",
                type: "task",
                dur: "1h 30m",
                dl: "Thu Apr 11",
                where: "📍 office",
              },
              {
                t: "Take-home review",
                type: "task",
                dur: "2h",
                dl: "Fri Apr 12",
                where: "—",
              },
              {
                t: "Decision sync",
                type: "plan",
                dur: "45m",
                dl: "Mon Apr 15",
                where: "📍 office",
                sched: true,
              },
            ].map((r, i) => (
              <Row key={i} {...r} />
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Row({ t, type, dur, dl, where, sched, overdue }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "24px 1fr 70px 80px 130px 100px 90px 30px",
        padding: "10px 4px",
        borderBottom: "1px dashed var(--pencil-faint)",
        alignItems: "center",
        fontSize: 15,
      }}
    >
      <Check />
      <span>{t}</span>
      <Badge style={{ fontSize: 11 }}>{type}</Badge>
      <span>{dur}</span>
      <span style={{ color: overdue ? "var(--red-ink)" : "var(--ink)" }}>
        {dl}
      </span>
      <span>{where}</span>
      <Badge kind={sched ? "dark" : "dim"} style={{ fontSize: 11 }}>
        {sched ? "planned" : "ready"}
      </Badge>
      <span className="sk-mono-tag" style={{ color: "var(--pencil)" }}>
        ···
      </span>
    </div>
  );
}

// VS-Code-style nested tree
function Tree({ items, depth = 0 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {items.map((it, i) => (
        <TreeNode key={i} node={it} depth={depth} />
      ))}
    </div>
  );
}

function TreeNode({ node, depth }) {
  const isFolder = node.children !== undefined;
  const sel = node.sel;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "4px 6px 4px " + (depth * 14 + 6) + "px",
          fontSize: 13,
          borderRadius: 4,
          background: sel ? "var(--paper-2)" : "transparent",
          borderLeft: sel
            ? "2px solid var(--red-ink)"
            : "2px solid transparent",
          fontWeight: sel ? 700 : 400,
        }}
      >
        {isFolder ? (
          <span style={{ fontSize: 9, width: 10, color: "var(--pencil)" }}>
            {node.open ? "▾" : "▸"}
          </span>
        ) : (
          <span style={{ width: 10 }} />
        )}
        {node.icon && <span>{node.icon}</span>}
        {node.color && <Swatch color={node.color} />}
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {node.name}
        </span>
        {node.kind === "goal" && (
          <span
            className="sk-mono-tag"
            style={{
              fontSize: 9,
              padding: "1px 4px",
              border: "1px solid var(--ink)",
              borderRadius: 3,
            }}
          >
            G
          </span>
        )}
        <span
          className="sk-mono-tag"
          style={{ color: "var(--pencil)", fontSize: 10 }}
        >
          {node.count}
        </span>
      </div>
      {isFolder && node.open && node.children.length > 0 && (
        <Tree items={node.children} depth={depth + 1} />
      )}
    </div>
  );
}

window.LibraryV2 = LibraryV2;
window.Tree = Tree;
window.TreeNode = TreeNode;
