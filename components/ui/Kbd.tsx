import { forwardRef, type HTMLAttributes } from "react";
import { kbd } from "./Kbd.css";

type Props = HTMLAttributes<HTMLSpanElement>;

export const Kbd = forwardRef<HTMLSpanElement, Props>(function Kbd(
  { className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={className ? `${kbd} ${className}` : kbd}
      {...rest}
    />
  );
});
