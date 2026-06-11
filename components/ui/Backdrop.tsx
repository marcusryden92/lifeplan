import {
  pinstripeLight,
  pinstripeDark,
  blobLight,
  blobDark,
} from "./Backdrop.css";

type Variant = "pinstripe" | "blob" | "both" | "none";

type Props = {
  variant?: Variant;
};

export function Backdrop({ variant = "blob" }: Props) {
  if (variant === "none") return null;
  const showPinstripe = variant === "pinstripe" || variant === "both";
  const showBlob = variant === "blob" || variant === "both";
  return (
    <>
      {showPinstripe && (
        <>
          <div aria-hidden className={pinstripeLight} />
          <div aria-hidden className={pinstripeDark} />
        </>
      )}
      {showBlob && (
        <>
          <div aria-hidden className={blobLight} />
          <div aria-hidden className={blobDark} />
        </>
      )}
    </>
  );
}
