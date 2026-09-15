// Chart colors — charts render inside sand panels. SVG attributes can't read
// the context-aware CSS variables in globals.css, hence the literal values.
export const chartColors = {
  positive: "#1b6a54",
  negative: "#7c6a56",
  gold: "#12503f",
  goldLight: "#7fdcb8",
  tick: "#6a7671",
  axis: "#ccbc9b",
  panel: "#e4d9c2",
  panelDeep: "#eee5d3",
} as const;
