import { isDueDate, isPriority } from './cardSchedule.ts'
import type { CardSchedule } from './cardSchedule.ts'
import type { Board } from './board'

type CardContent = { title: string; description: string }

export function updateCardContent(board: Board, id: string, content: CardContent, schedule?: CardSchedule): { board: Board; error?: string } {
  if (schedule && ((!isDueDate(schedule.dueDate) && schedule.dueDate !== '') || !isPriority(schedule.priority))) return { board, error: 'Revisa la fecha de vencimiento y la prioridad.' }
  const title = content.title.trim()
  if (!title || title.length > 160) return { board, error: 'Escribe un título de hasta 160 caracteres.' }
  if (content.description.length > 1000) return { board, error: 'La descripción admite hasta 1000 caracteres.' }
  const card = board.cards.find(card => card.id === id)
  if (!card) return { board, error: 'La tarjeta ya no existe en este tablero.' }
  const description = content.description.trim()
  if (card.title === title && card.description === description && (!schedule || ((card.dueDate ?? '') === schedule.dueDate && (card.priority ?? 'none') === schedule.priority))) return { board }
  return { board: { ...board, cards: board.cards.map(current => current.id === id
    ? { ...current, title, description, ...(schedule ? { dueDate: schedule.dueDate || undefined, priority: schedule.priority } : {}) } : current) } }
}
