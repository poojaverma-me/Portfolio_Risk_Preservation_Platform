"use client";
import { useStore } from "./store";

// Recharts takes colours as SVG props, so it gets resolved hex values per mode.
// Everything else reads the CSS tokens in globals.css.
export const CHART = {
  dark: { grid: "#222433", axis: "#31344a", tick: "#8b8fa3", tipBg: "#181a26", tipLine: "#31344a", tipInk: "#f0eee9", down: "#6f7de6", up: "#939e22", ref: "#d3dde7", cursor: "rgba(216,230,60,.07)" },
  light: { grid: "#dde1e8", axis: "#c6cee0", tick: "#6c6f98", tipBg: "#fbfaf7", tipLine: "#c6cee0", tipInk: "#17184b", down: "#3e4bb2", up: "#7f8a14", ref: "#363c78", cursor: "rgba(39,50,135,.06)" },
} as const;

export type ThemeName = keyof typeof CHART;

export function useChartColors() {
  return CHART[useStore((s) => s.theme)];
}

export function applyTheme(t: ThemeName) {
  document.documentElement.dataset.theme = t;
}
