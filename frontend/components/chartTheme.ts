export const chartAxisProps = {
  stroke: "var(--chart-axis)",
  tick: { fill: "var(--chart-axis)" },
  tickLine: { stroke: "var(--chart-axis)" },
  axisLine: { stroke: "var(--chart-grid)" }
};

export const chartGridProps = {
  stroke: "var(--chart-grid)"
};

export const chartTooltipProps = {
  contentStyle: {
    backgroundColor: "var(--chart-tooltip-bg)",
    border: "1px solid var(--chart-tooltip-border)",
    borderRadius: "12px",
    color: "var(--chart-tooltip-text)",
    boxShadow: "0 18px 50px rgba(15, 23, 42, 0.18)"
  },
  labelStyle: {
    color: "var(--chart-tooltip-text)",
    fontWeight: 700
  },
  itemStyle: {
    color: "var(--chart-tooltip-text)"
  }
};
