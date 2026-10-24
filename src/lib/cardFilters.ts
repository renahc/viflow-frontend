import type { Card } from './board.ts'
import { dueState } from './cardSchedule.ts'

export type CardFilters = { query: string; label: string; priority: string; due: string; status: string }
export const emptyCardFilters: CardFilters = { query: '', label: '', priority: '', due: '', status: '' }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es')
export function matchesCardFilters(card: Card, filters: CardFilters, now = new Date()): boolean {
  const terms = normalize(filters.query.trim()).split(/\s+/).filter(Boolean)
  const text = normalize(`${card.title} ${card.description}`)
  if (!terms.every(term => text.includes(term))) return false
  if (filters.label && !card.labelIds?.includes(filters.label)) return false
  if (filters.priority && (card.priority ?? 'none') !== filters.priority) return false
  const completed = card.status === 'done'
  if (filters.status === 'pending' && completed || filters.status === 'completed' && !completed) return false
  if (filters.due === 'none') return !card.dueDate
  if (filters.due === 'dated') return !!card.dueDate
  if (filters.due) return !!card.dueDate && dueState(card.dueDate, completed, now) === filters.due
  return true
}
