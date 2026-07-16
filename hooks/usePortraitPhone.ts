"use client";

import { useEffect, useState } from "react";
import { media } from "@/lib/theme";

// A touch phone held in portrait (tablets exempt — see media.portraitPhone).
// Canvas surfaces that need landscape width gate on this and show a rotate
// prompt instead of the canvas. Defaults to false so SSR never renders the
// prompt; the post-mount effect corrects it before the canvas is interactive.
export function usePortraitPhone(): boolean {
  const [portraitPhone, setPortraitPhone] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(media.portraitPhone);
    setPortraitPhone(query.matches);
    const onChange = (e: MediaQueryListEvent) => setPortraitPhone(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return portraitPhone;
}
