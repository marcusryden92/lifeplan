import { forwardRef, type HTMLAttributes } from "react";
import { badge } from "@/lib/theme";

type Props = HTMLAttributes<HTMLSpanElement> & {
  color: string;
};

export const CategoryBadge = forwardRef<HTMLSpanElement, Props>(
  function CategoryBadge({ color, className, style, ...rest }, ref) {
    const cls = badge({});
    return (
      <span
        ref={ref}
        className={className ? `${cls} ${className}` : cls}
        style={{
          background: color,
          color: "#fff",
          border: "none",
          ...style,
        }}
        {...rest}
      />
    );
  },
);
