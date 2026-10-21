import { useState } from 'react'
import { loadBoard, storageKey } from '../lib/board'
import type { Board, Status } from '../lib/board'

export function useBoard() {
  const [board, setBoard] = useState(loadBoard)
  const [storageError, setStorageError] = useState(false)

  function saveBoard(nextBoard: Board) {
    setBoard(nextBoard)
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextBoard))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function addCard(title: string, description: string, status: Status) {
    if (!title.trim() || !board.columns.some(column => column.id === status)) return
    saveBoard({ ...board, cards: [...board.cards, { id: crypto.randomUUID(), title: title.trim(), description: description.trim(), status }] })
  }

  function moveCard(id: string, status: Status) {
    if (!board.columns.some(column => column.id === status)) return
    saveBoard({ ...board, cards: board.cards.map(card => card.id === id ? { ...card, status } : card) })
  }

  function addColumn(title: string) {
    if (!title.trim()) return
    const column = { id: crypto.randomUUID(), title: title.trim(), description: '' }
    saveBoard({ ...board, columns: [...board.columns, column] })
    return column.id
  }

  return { ...board, storageError, addCard, moveCard, addColumn }
}
