import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./tokens.css";

globalStyle("html", {
  scrollbarWidth: "thin",
  scrollbarColor: `color-mix(in srgb, ${vars.ink} 22%, transparent) transparent`,
});

globalStyle("::-webkit-scrollbar", {
  width: 8,
  height: 8,
});

globalStyle("::-webkit-scrollbar-track", {
  background: "transparent",
});

globalStyle("::-webkit-scrollbar-thumb", {
  background: `color-mix(in srgb, ${vars.ink} 18%, transparent)`,
  borderRadius: 999,
  border: "2px solid transparent",
  backgroundClip: "padding-box",
});

globalStyle("::-webkit-scrollbar-thumb:hover", {
  background: `color-mix(in srgb, ${vars.ink} 32%, transparent)`,
  backgroundClip: "padding-box",
});

globalStyle("::-webkit-scrollbar-corner", {
  background: "transparent",
});
