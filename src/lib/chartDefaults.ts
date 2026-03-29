import { defaults } from 'chart.js';

export function applyChartDefaults() {
  defaults.color = '#8b90a8';
  defaults.borderColor = '#2e3348';
  defaults.backgroundColor = 'transparent';
  defaults.font.family = 'Inter, sans-serif';
  defaults.font.size = 12;
  defaults.plugins.tooltip.backgroundColor = '#1a1d27';
  defaults.plugins.tooltip.borderColor = '#2e3348';
  defaults.plugins.tooltip.borderWidth = 1;
  defaults.plugins.tooltip.titleColor = '#e8e9f0';
  defaults.plugins.tooltip.bodyColor = '#8b90a8';
  defaults.plugins.legend.labels.color = '#8b90a8';
}
