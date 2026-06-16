import { root, thumb } from "./LumenSwitch.css";

interface LumenSwitchProps {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}

export function LumenSwitch({ checked, onChange, ariaLabel }: LumenSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={root}
    >
      <span aria-hidden className={thumb} />
    </button>
  );
}
