import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  hintAction,
  hintActionGlass,
  hintActionSolid,
  hintActionKbd,
  hintActionKbdGlass,
  hintActionKbdSolid,
} from "./HintAction.css";

type HintActionVariant = "glass" | "solid";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Optional kbd badge shown after the label (icon or text). */
  kbd?: ReactNode;
  /** Visual chrome — mirrors the standard Button's glass/solid variants. */
  variant?: HintActionVariant;
};

export const HintAction = forwardRef<HTMLButtonElement, Props>(
  function HintAction(
    { children, kbd, variant = "glass", className, type = "button", ...rest },
    ref,
  ) {
    const variantCls = variant === "solid" ? hintActionSolid : hintActionGlass;
    const kbdCls = variant === "solid" ? hintActionKbdSolid : hintActionKbdGlass;
    const cls = `${hintAction} ${variantCls}${className ? ` ${className}` : ""}`;
    return (
      <button ref={ref} type={type} className={cls} {...rest}>
        <span>{children}</span>
        {kbd && <span className={`${hintActionKbd} ${kbdCls}`}>{kbd}</span>}
      </button>
    );
  },
);
