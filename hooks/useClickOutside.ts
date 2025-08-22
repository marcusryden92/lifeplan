import { useEffect, RefObject } from "react";

interface UseClickOutsideOptions {
  ref: RefObject<HTMLElement>;
  onClickOutside: () => void;
  isActive?: boolean;
}

const useClickOutside = ({
  ref,
  onClickOutside,
  isActive = true,
}: UseClickOutsideOptions) => {
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [ref, onClickOutside, isActive]);
};

export default useClickOutside;
