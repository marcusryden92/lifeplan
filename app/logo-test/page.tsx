import { brand, brandLogo, brandText } from "./page.css";

const LogoTest = () => {
  return (
    <div style={{ padding: "100px" }}>
      <div className={brand} title="Circadium">
        <span className={brandLogo} aria-hidden />
        <span className={brandText}>Circadium</span>
      </div>
    </div>
  );
};

export default LogoTest;
