import { pinstripe, blob } from "./Backdrop.css";

type Variant = "pinstripe" | "blob" | "both" | "none";

type Props = {
  variant?: Variant;
};

export function Backdrop({ variant = "blob" }: Props) {
  if (variant === "none") return null;
  return (
    <>
      {(variant === "pinstripe" || variant === "both") && (
        <div aria-hidden className={pinstripe} />
      )}
      {(variant === "blob" || variant === "both") && (
        <div aria-hidden className={blob} />
      )}
    </>
  );
}
