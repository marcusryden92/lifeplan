/* global React, DesignCanvas, DCSection, DCArtboard */

const PALETTES = [
  { id: 'A', name: 'Warm only', tag: 'no blues, no greens · spicy', colors: [
    ['career', '#c2521f'], ['health', '#8a7430'], ['home', '#d97817'],
    ['growth', '#a04848'], ['rel', '#d6266e'], ['finance', '#b8732e']
  ]},
  { id: 'B', name: 'Cool only', tag: 'no warms · calm, technical', colors: [
    ['career', '#2b5fc7'], ['health', '#0e9d6f'], ['home', '#4a8f97'],
    ['growth', '#6e3fc7'], ['rel', '#4d6a97'], ['finance', '#5a8a3a']
  ]},
  { id: 'C', name: 'Muted earth', tag: 'dusty, sophisticated', colors: [
    ['career', '#4a5d8a'], ['health', '#6e8a4a'], ['home', '#b08762'],
    ['growth', '#7a4870'], ['rel', '#a85858'], ['finance', '#b89854']
  ]},
  { id: 'D', name: 'Mondrian', tag: 'primaries + ink · graphic, bold', colors: [
    ['career', '#0044ff'], ['health', '#00a96b'], ['home', '#ff5a1a'],
    ['growth', '#1a1a1a'], ['rel', '#e3001a'], ['finance', '#ffd400']
  ]},
  { id: 'E', name: 'Sunset spectrum', tag: 'all in warm→purple band · pretty', colors: [
    ['career', '#6e4ad9'], ['health', '#d966a8'], ['home', '#f08833'],
    ['growth', '#4d4dc9'], ['rel', '#e84662'], ['finance', '#e8aa33']
  ]},
  { id: 'F', name: 'Tech-bright', tag: 'screen-saturated, neon-leaning', colors: [
    ['career', '#00b3ff'], ['health', '#00e090'], ['home', '#ff9500'],
    ['growth', '#b835ff'], ['rel', '#ff1474'], ['finance', '#ffd60a']
  ]}
];

function PalettePreview({ dark = false }) {
  const bg = dark ? '#12141a' : '#edeef1';
  const ink = dark ? '#e6e8ec' : '#0f1116';
  const muted = dark ? 'rgba(230,232,236,0.55)' : 'rgba(15,17,22,0.55)';
  const rule = dark ? 'rgba(230,232,236,0.10)' : 'rgba(15,17,22,0.10)';
  return (
    <div style={{
      width: '100%', height: '100%',
      background: bg, color: ink,
      fontFamily: '"Geist", -apple-system, sans-serif',
      padding: '32px 36px', boxSizing: 'border-box', overflow: 'auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.04em', color: ink }}>Pick a palette</div>
          <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
            6 directions · each row is career · health · home · growth · rel · finance
          </div>
        </div>
        <div style={{ fontSize: 11, color: muted, fontFamily: '"Geist Mono", monospace', letterSpacing: 0.5 }}>tap a letter to pick</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PALETTES.map(p => (
          <div key={p.id} style={{
            display: 'grid',
            gridTemplateColumns: '32px 200px repeat(6, 1fr)',
            gap: 10, alignItems: 'center',
            padding: '10px 6px',
            borderTop: `1px solid ${rule}`
          }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6,
              border: `1px solid ${ink}`, color: ink,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, fontFamily: '"Geist Mono", monospace'
            }}>{p.id}</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.02em' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>{p.tag}</div>
            </div>
            {p.colors.map(([k, hex]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
                <div style={{ height: 56, background: hex, borderRadius: 6 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9.5, fontFamily: '"Geist Mono", monospace', letterSpacing: 0.4 }}>
                  <span style={{ color: muted }}>{k}</span>
                  <span style={{ color: ink, fontWeight: 600 }}>{hex.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <DesignCanvas
      title="Circadium · two new directions"
      subtitle="Glass scrapped. Two unique-but-professional foundations for Today. Pick one (or steer me to a third)."
      bg="#1a1816"
    >
      <DCSection
        id="palettes"
        title="P · Pick a palette"
        subtitle="Six base-color directions for Lumen. Each row is the six area hues. Tell me a letter (or a mix)."
      >
        <DCArtboard id="palettes-dark" label="Palettes · dark surface" width={1100} height={720}>
          <PalettePreview dark={true} />
        </DCArtboard>
        <DCArtboard id="palettes-light" label="Palettes · light surface" width={1100} height={720}>
          <PalettePreview dark={false} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="almanac"
        title="A · Almanac"
        subtitle="An editorial publication. Newsreader serif + Geist sans, warm paper, single oxblood accent. Numerals as graphic elements. Hairline rules, no cards. Reads like a quietly authoritative weekly journal."
      >
        <DCArtboard id="almanac-dark" label="Almanac · Today · dark" width={1440} height={900}>
          <AlmanacToday dark={true} />
        </DCArtboard>
        <DCArtboard id="almanac-light" label="Almanac · Today · light" width={1440} height={900}>
          <AlmanacToday dark={false} />
        </DCArtboard>
      </DCSection>

      <DCSection
        id="bureau"
        title="B · Bureau"
        subtitle="Architectural drafting. Geist Mono protagonist, hairline grid, row/folio coordinates, an elevation view of the day. Single drafting-red ink. Feels like a tool, not a SaaS."
      >
        <DCArtboard id="bureau-dark" label="Bureau · Today · dark" width={1440} height={900}>
          <BureauToday dark={true} />
        </DCArtboard>
        <DCArtboard id="bureau-light" label="Bureau · Today · light" width={1440} height={900}>
          <BureauToday dark={false} />
        </DCArtboard>
      </DCSection>
      <DCSection
        id="lumen"
        title="C · Lumen"
        subtitle="Frosted glass over a saturated pastel mesh — Clash Display + Hubot Sans, color-tinted glass events, conic dots, grain. Light and dark."
      >
        <DCArtboard id="lumen-light" label="Lumen · Today · light" width={1440} height={900}>
          <LumenToday dark={false} />
        </DCArtboard>
        <DCArtboard id="lumen-dark" label="Lumen · Today · dark" width={1440} height={900}>
          <LumenToday dark={true} />
        </DCArtboard>
        <DCArtboard id="lumen-cal-light" label="Lumen · Calendar · light" width={1440} height={900}>
          <LumenCalendar dark={false} />
        </DCArtboard>
        <DCArtboard id="lumen-cal-dark" label="Lumen · Calendar · dark" width={1440} height={900}>
          <LumenCalendar dark={true} />
        </DCArtboard>
        <DCArtboard id="lumen-goal-light" label="Lumen · Item · light" width={1440} height={900}>
          <LumenGoal dark={false} />
        </DCArtboard>
        <DCArtboard id="lumen-goal-dark" label="Lumen · Item · dark" width={1440} height={900}>
          <LumenGoal dark={true} />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
