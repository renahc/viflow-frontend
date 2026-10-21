import type { Board, Status } from './board'

// The array order is also the display order within each column.
// A null target means the end; an omitted target preserves a same-column move.
export function moveCardInBoard(board: Board, id: string, status: Status, beforeId?: string | null): Board {
  const card = board.cards.find(card => card.id === id)
  if (!card || !board.columns.some(column => column.id === status) || beforeId === id) return board
  if (card.status === status && beforeId === undefined) return board

  const remaining = board.cards.filter(card => card.id !== id)
  let index: number
  if (beforeId != null) {
    index = remaining.findIndex(card => card.id === beforeId && card.status === status)
    if (index === -1) return board
  } else {
    const last = remaining.findLastIndex(card => card.status === status)
    index = last === -1 ? remaining.length : last + 1
  }
  const moved = card.status === status ? card : { ...card, status }
  const cards = [...remaining.slice(0, index), moved, ...remaining.slice(index)]
  if (card.status === status) {
    const previousOrder = board.cards.filter(card => card.status === status)
    const nextOrder = cards.filter(card => card.status === status)
    if (nextOrder.every((card, index) => card === previousOrder[index])) return board
  }
  return { ...board, cards }
}
