export const priorities = { none: 'Sin prioridad', low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' } as const
export type Priority = keyof typeof priorities
export type CardSchedule = { dueDate: string; priority: Priority }
export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && Object.hasOwn(priorities, value)
}
// Dates represent local calendar days, without UTC conversions.
export function isDueDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false
  const date = new Date(`${value}T12:00:00`)
  return Number.isFinite(date.getTime()) && localDay(date) === value
}
function localDay(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export function dueState(dueDate: string, completed: boolean, now = new Date()): 'completed' | 'overdue' | 'today' | 'soon' | 'upcoming' {
  if (completed) return 'completed'
  const today = localDay(now)
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'today'
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dueDate === localDay(tomorrow) ? 'soon' : 'upcoming'
}
export function formatDueDate(value: string): string {
  return new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}
