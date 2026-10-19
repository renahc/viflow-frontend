export const columns = [
  { id: 'todo', title: 'Por hacer', description: 'Las próximas ideas toman forma.' },
  { id: 'in-progress', title: 'En progreso', description: 'Un paso más cerca de lograrlo.' },
  { id: 'done', title: 'Hecho', description: 'Pequeños avances, grandes resultados.' },
] as const
export type Status = (typeof columns)[number]['id']
export type Card = { id: string; title: string; description: string; status: Status }
export const storageKey = 'viflow.board.v1'
const initialCards: Card[] = [
  { id: 'idea', title: 'Darle forma a una buena idea', description: 'Todo empieza con un primer paso. ¿Qué te gustaría construir?', status: 'todo' },
  { id: 'inspiration', title: 'Buscar un poco de inspiración', description: 'Reúne referencias, explora posibilidades y conecta ideas.', status: 'todo' },
  { id: 'board', title: 'Crear nuestro primer tablero', description: 'Un espacio simple para organizar lo que viene.', status: 'in-progress' },
  { id: 'start', title: 'Comenzar con viflow', description: 'Ya tenemos un lugar para hacer que las cosas pasen.', status: 'done' },
]
function isCard(value: unknown): value is Card {
  if (typeof value !== 'object' || value === null) return false
  const card = value as Record<string, unknown>
  return typeof card.id === 'string' && typeof card.title === 'string' && !!card.title.trim()
    && typeof card.description === 'string' && columns.some(column => column.id === card.status)
}
export function loadCards(): Card[] {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === null) return initialCards
    const parsed: unknown = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.every(isCard) && new Set(parsed.map(card => card.id)).size === parsed.length) return parsed
  } catch { /* Storage may be unavailable; the board still works in memory. */ }
  return initialCards
}
