export type ChecklistItem = { id: string; title: string; completed: boolean }
export function isChecklist(value: unknown): value is ChecklistItem[] {
  return Array.isArray(value) && value.length <= 100 && value.every(item => item && typeof item === 'object'
    && typeof item.id === 'string' && item.id.trim().length > 0 && item.id.length <= 128
    && typeof item.title === 'string' && item.title.trim().length > 0 && item.title.length <= 200 && typeof item.completed === 'boolean')
    && new Set(value.map(item => item.id)).size === value.length
}
