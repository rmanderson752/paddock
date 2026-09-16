// Chart colours — charts render on ivory/sand plates. SVG attributes can't
// read the context-aware CSS variables in globals.css, hence literal values.
export const chartColors = {
  positive: "#1b6a54",
  negative: "#7a6a55",
  gold: "#0f3d31",
  goldLight: "#7fdcb8",
  brass: "#b3975c",
  tick: "#6c7670",
  axis: "#d3c8ad",
  panel: "#e7dfcb",
  panelDeep: "#efe8d9",
} as const;
