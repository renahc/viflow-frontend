import { useState } from 'react'
import { createBoard, loadWorkspace, workspaceStorageKey } from '../lib/workspace'
import type { Workspace } from '../lib/workspace'
import type { Board, Status } from '../lib/board'

export function useBoard() {
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const board = workspace.boards.find(board => board.id === workspace.activeBoardId) ?? { id: '', title: 'Sin tableros', columns: [], cards: [] }
  const [storageError, setStorageError] = useState(false)

  function saveWorkspace(nextWorkspace: Workspace) {
    setWorkspace(nextWorkspace)
    try {
      localStorage.setItem(workspaceStorageKey, JSON.stringify(nextWorkspace))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }

  function saveBoard(nextBoard: Board) {
    if (!board.id) return
    saveWorkspace({ ...workspace, boards: workspace.boards.map(current =>
      current.id === board.id ? { ...current, ...nextBoard } : current) })
  }

  function selectBoard(id: string) {
    if (!workspace.boards.some(board => board.id === id)) return
    saveWorkspace({ ...workspace, activeBoardId: id, openBoardIds: workspace.openBoardIds.includes(id)
      ? workspace.openBoardIds : [...workspace.openBoardIds, id] })
  }

  function addBoard(title: string) {
    if (!title.trim()) return
    const nextBoard = createBoard(title)
    saveWorkspace({ boards: [...workspace.boards, nextBoard], activeBoardId: nextBoard.id, openBoardIds: [...workspace.openBoardIds, nextBoard.id] })
    return nextBoard.id
  }

  function renameBoard(id: string, title: string) {
    if (!title.trim()) return
    saveWorkspace({ ...workspace, boards: workspace.boards.map(current =>
      current.id === id ? { ...current, title: title.trim() } : current) })
  }

  function closeBoard(id: string) {
    const index = workspace.openBoardIds.indexOf(id)
    if (index === -1) return
    const openBoardIds = workspace.openBoardIds.filter(current => current !== id)
    saveWorkspace({ ...workspace, openBoardIds, activeBoardId: workspace.activeBoardId === id
      ? openBoardIds[Math.min(index, openBoardIds.length - 1)] ?? '' : workspace.activeBoardId })
  }

  function deleteBoard(id: string) {
    const remaining = workspace.boards.filter(current => current.id !== id)
    const openBoardIds = workspace.openBoardIds.filter(current => current !== id)
    const activeBoardId = workspace.activeBoardId === id ? openBoardIds[0] ?? '' : workspace.activeBoardId
    saveWorkspace({ boards: remaining, activeBoardId, openBoardIds })
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

  function deleteCard(id: string) {
    saveBoard({ ...board, cards: board.cards.filter(card => card.id !== id) })
  }

  function deleteColumn(id: string) {
    saveBoard({
      columns: board.columns.filter(column => column.id !== id),
      cards: board.cards.filter(card => card.status !== id),
    })
  }

  return { ...board, boards: workspace.boards, activeBoardId: board.id, openBoardIds: workspace.openBoardIds, closeBoard, selectBoard, addBoard, renameBoard, deleteBoard, storageError, addCard, moveCard, addColumn, deleteCard, deleteColumn }
}
