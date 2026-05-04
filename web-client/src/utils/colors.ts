
export const LAYER_COLORS = [
  '#3b82f6',
  '#ef4444',
  '#22c55e',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#f97316',
  '#14b8a6',
  '#a855f7',
  '#84cc16',
  '#e11d48',
];

export function getNextColor(existingCount: number): string {
  return LAYER_COLORS[existingCount % LAYER_COLORS.length];
}
