import type { Board } from './board'

// Preserve the original array position and all card metadata.
export function setCardArchived<T extends Board>(board: T, id: string, archived: boolean): T {
  const card = board.cards.find(card => card.id === id)
  if (!card || Boolean(card.archivedAt) === archived) return board
  return { ...board, cards: board.cards.map(card => card.id === id ? { ...card, archivedAt: archived ? new Date().toISOString() : undefined } : card) }
}

// Deleting a column must not permanently discard its cards.
export function removeColumnKeepingCards<T extends Board>(board: T, id: string): T {
  if (!board.columns.some(column => column.id === id)) return board
  const affected = board.cards.filter(card => card.status === id)
  let columns = board.columns.filter(column => column.id !== id)
  if (affected.length && !columns.length) columns = [{ id: crypto.randomUUID(), title: 'Recuperadas', description: '' }]
  const archivedAt = new Date().toISOString()
  return { ...board, columns, cards: board.cards.map(card => card.status === id
    ? { ...card, status: columns[0].id, archivedAt: card.archivedAt ?? archivedAt } : card) }
}
