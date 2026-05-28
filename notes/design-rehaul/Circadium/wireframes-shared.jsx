/* global React */
// Sketchy primitives shared across wireframes

const { useState } = React;

// Sketchy underline scribble (SVG)
function SketchyUnderline({ width = 80, color = 'var(--red-ink)', strokeWidth = 2, style = {} }) {
  return (
    <svg width={width} height="10" viewBox={`0 0 ${width} 10`} style={{ display: 'block', ...style }}>
      <path
        d={`M2 6 Q ${width*0.2} 2, ${width*0.45} 6 T ${width*0.85} 5 T ${width-2} 6`}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
      />
    </svg>
  );
}

// Sketchy arrow
function SketchyArrow({ length = 60, angle = 0, color = 'var(--red-ink)', label, labelStyle = {} }) {
  const rad = (angle * Math.PI) / 180;
  const x2 = Math.cos(rad) * length;
  const y2 = Math.sin(rad) * length;
  return (
    <svg width={Math.abs(x2)+30} height={Math.abs(y2)+30} style={{ overflow: 'visible' }}>
      <defs>
        <marker id={`ah-${angle}-${length}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
        </marker>
      </defs>
      <path
        d={`M 0 0 Q ${x2*0.5+8} ${y2*0.5-10}, ${x2} ${y2}`}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round"
        markerEnd={`url(#ah-${angle}-${length})`}
      />
    </svg>
  );
}

// Annotation note (red ink, handwritten)
function Anno({ children, style = {}, width = 200 }) {
  return (
    <div className="sk-note" style={{ width, ...style }}>{children}</div>
  );
}

// A simple rounded sketchy "rect" element used as a card
function Card({ children, style = {}, className = '', filled = false, dark = false }) {
  const cn = `sk-box wob ${filled ? 'filled' : ''} ${dark ? 'dark' : ''} ${className}`;
  return <div className={cn} style={style}>{children}</div>;
}

function Badge({ children, kind = '', style = {} }) {
  return <span className={`sk-badge ${kind}`} style={style}>{children}</span>;
}

function Glyph({ children, square = false, style = {} }) {
  return <span className={`sk-glyph ${square ? 'sq' : ''}`} style={style}>{children}</span>;
}

// Color swatch — sketchy filled square
function Swatch({ color = '#ccc', style = {} }) {
  return <span className="sk-swatch" style={{ background: color, ...style }} />;
}

// Hand-drawn check
function Check({ on = false, style = {} }) {
  return <span className={`sk-check ${on ? 'on' : ''}`} style={style} />;
}

// Lines of "lorem" text placeholder
function Lines({ count = 3, width = '100%', gap = 8, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="sk-line soft" style={{ width: typeof width === 'function' ? width(i) : (i === count-1 ? '62%' : width) }} />
      ))}
    </div>
  );
}

// Top app chrome reused by most boards
function AppTop({ active = 'Calendar', right = null }) {
  const tabs = ['Capture', 'Today', 'Library', 'Calendar', 'Life Areas', 'Places'];
  return (
    <div className="sk-top">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
        <span className="sk-logo">circadium</span>
        <span style={{ display: 'inline-block', width: 1.5, height: 22, background: 'var(--pencil-light)' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {tabs.map(t => (
            <span key={t} className="sk-hand"
              style={{
                padding: '6px 12px 5px',
                border: active === t ? '2px solid var(--ink)' : '2px solid transparent',
                borderRadius: '8px 10px 6px 10px / 10px 6px 10px 8px',
                background: active === t ? 'var(--paper-2)' : 'transparent',
                fontSize: 16,
                fontWeight: active === t ? 700 : 400
              }}>
              {t}
            </span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {right}
        <span className="sk-mono-tag">⌘K to capture</span>
        <Glyph>A</Glyph>
      </div>
    </div>
  );
}

// Sketchy SVG "scribble" panel
function ScribblePanel({ width, height, label, style = {} }) {
  return (
    <div className="sk-box wob sk-hatch-soft" style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      <span className="sk-mono-tag">{label}</span>
    </div>
  );
}

// Boxed section with a small monospace label
function Section({ title, tight, children, style = {} }) {
  return (
    <div className="sk-box wob" style={{ padding: tight ? 12 : 16, ...style }}>
      <div className="sk-mono-tag" style={{ marginBottom: tight ? 6 : 10 }}>{title}</div>
      {children}
    </div>
  );
}

// Two-column field row inside a Section
function FieldRow({ label, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <span style={{ width: 90, fontSize: 13, color: 'var(--pencil)' }}>{label}</span>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>{children}</div>
    </div>
  );
}

// Stat block
function Stat({ label, value, sub }) {
  return (
    <div className="sk-box wob" style={{ padding: '10px 14px', background: 'var(--paper-2)' }}>
      <div className="sk-mono-tag">{label}</div>
      <div className="sk-script" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, marginTop: 2 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--pencil)' }}>{sub}</div>
    </div>
  );
}

Object.assign(window, { SketchyUnderline, SketchyArrow, Anno, Card, Badge, Glyph, Swatch, Check, Lines, AppTop, ScribblePanel, Section, FieldRow, Stat });
