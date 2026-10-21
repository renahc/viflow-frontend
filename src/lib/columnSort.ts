import type { Card } from './board'
export type ColumnSort = 'manual' | 'priority'
const rank = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
export function sortColumnCards(cards: Card[], mode: ColumnSort): Card[] {
  return mode === 'manual' ? cards : [...cards].sort((a, b) => rank[a.priority ?? 'none'] - rank[b.priority ?? 'none'])
}
