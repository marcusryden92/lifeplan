import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

globalStyle("html", {
  scrollbarWidth: "thin",
  scrollbarColor: `${vars.glass.bgDeep} transparent`,
});

globalStyle("::-webkit-scrollbar", {
  width: 11,
  height: 11,
});

globalStyle("::-webkit-scrollbar-track", {
  background: "transparent",
});

globalStyle("::-webkit-scrollbar-thumb", {
  background: vars.glass.bgDeep,
  border: `1px solid ${vars.glass.stroke}`,
  borderRadius: 999,
  backgroundClip: "padding-box",
  boxShadow: `inset 0 1px 0 ${vars.glass.hi}`,
  backdropFilter: "blur(14px) saturate(160%)",
  WebkitBackdropFilter: "blur(14px) saturate(160%)",
});

globalStyle("::-webkit-scrollbar-thumb:hover", {
  background: `color-mix(in srgb, ${vars.ink} 28%, transparent)`,
  backgroundClip: "padding-box",
});

globalStyle("::-webkit-scrollbar-corner", {
  background: "transparent",
});
