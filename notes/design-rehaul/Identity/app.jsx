// Main app — composes the four brand-direction artboards into a DesignCanvas.

const AB_WIDTH = 1100;
const AB_HEIGHT = 2300;

function App() {
  return (
    <DesignCanvas
      title="Circadium · brand exploration"
      subtitle="Four directions for a scheduling product built for ambitious young professionals. Drag to rearrange; click the expand icon on any board to inspect at full size."
    >
      <DCSection
        id="directions"
        title="Brand directions"
        subtitle="Each board: wordmark · palette · type · tagline · app chrome · marketing hero"
      >
        <DCArtboard id="mercury" label="01 · Mercury — Quiet Power" width={AB_WIDTH} height={AB_HEIGHT}>
          <Mercury />
        </DCArtboard>
        <DCArtboard id="atlas" label="02 · Atlas — Engineered Precision" width={AB_WIDTH} height={AB_HEIGHT}>
          <Atlas />
        </DCArtboard>
        <DCArtboard id="helix" label="03 · Helix — Clinical Modernism" width={AB_WIDTH} height={AB_HEIGHT}>
          <Helix />
        </DCArtboard>
        <DCArtboard id="prism" label="04 · Prism — Bold Modernist" width={AB_WIDTH} height={AB_HEIGHT}>
          <Prism />
        </DCArtboard>
        <DCArtboard id="lumen" label="05 · Lumen — Frosted Glass · Light" width={AB_WIDTH} height={AB_HEIGHT}>
          <Lumen />
        </DCArtboard>
        <DCArtboard id="lumen-noir" label="06 · Lumen Noir — Frosted Glass · Dark" width={AB_WIDTH} height={AB_HEIGHT}>
          <Lumen dark />
        </DCArtboard>
        <DCArtboard id="lumen-arc" label="07 · Lumen Arc — Architectural" width={AB_WIDTH} height={AB_HEIGHT}>
          <LumenArc />
        </DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
