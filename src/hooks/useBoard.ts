import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { boardPath } from '../lib/routes'
import { createBoard, loadWorkspace, workspaceStorageKey } from '../lib/workspace'
import type { Workspace } from '../lib/workspace'
import type { Board, Status } from '../lib/board'

export function useBoard() {
  const [workspace, setWorkspace] = useState(loadWorkspace)
  const match = useMatch('/boards/:boardId')
  const location = useLocation()
  const navigate = useNavigate()
  const pendingNavigation = useRef<{ from: string; to: string } | null>(null)
  const routeBoardId = match?.params.boardId
  // The URL decides what is displayed. Stored selection only restores old data.
  const board = workspace.boards.find(board => board.id === routeBoardId) ?? { id: '', title: 'Sin tableros', columns: [], cards: [] }
  const routeError = (Boolean(routeBoardId) && !board.id) || (!match && location.pathname !== '/')
  const [storageError, setStorageError] = useState(false)

  const saveWorkspace = useCallback((nextWorkspace: Workspace) => {
    setWorkspace(nextWorkspace)
    try {
      localStorage.setItem(workspaceStorageKey, JSON.stringify(nextWorkspace))
      setStorageError(false)
    } catch {
      setStorageError(true)
    }
  }, [])

  // Browser Back/Forward and direct URLs must also restore the open tab.
  useEffect(() => {
    // Router transitions can commit after a workspace update. Do not reopen the tab being closed.
    const pending = pendingNavigation.current
    if (pending && location.pathname === pending.from && pending.from !== pending.to) return
    pendingNavigation.current = null
    if (!board.id || (workspace.activeBoardId === board.id && workspace.openBoardIds.includes(board.id))) return
    // URL changes are external navigation events; synchronize their persisted tab state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    saveWorkspace({ ...workspace, activeBoardId: board.id, openBoardIds: workspace.openBoardIds.includes(board.id)
      ? workspace.openBoardIds : [...workspace.openBoardIds, board.id] })
  }, [board.id, location.pathname, workspace, saveWorkspace])

  function saveBoard(nextBoard: Board) {
    if (!board.id) return
    saveWorkspace({ ...workspace, boards: workspace.boards.map(current =>
      current.id === board.id ? { ...current, ...nextBoard } : current) })
  }

  function addBoard(title: string) {
    if (!title.trim()) return
    const nextBoard = createBoard(title)
    pendingNavigation.current = { from: location.pathname, to: boardPath(nextBoard.id) }
    saveWorkspace({ boards: [...workspace.boards, nextBoard], activeBoardId: nextBoard.id, openBoardIds: [...workspace.openBoardIds, nextBoard.id] })
    void navigate(boardPath(nextBoard.id))
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
    const activeBoardId = board.id === id
      ? openBoardIds[Math.min(index, openBoardIds.length - 1)] ?? '' : board.id
    const destination = activeBoardId ? boardPath(activeBoardId) : '/'
    if (board.id === id) pendingNavigation.current = { from: location.pathname, to: destination }
    saveWorkspace({ ...workspace, openBoardIds, activeBoardId })
    if (board.id === id) void navigate(destination, { replace: true })
  }

  function deleteBoard(id: string) {
    const remaining = workspace.boards.filter(current => current.id !== id)
    const openBoardIds = workspace.openBoardIds.filter(current => current !== id)
    const activeBoardId = board.id === id ? openBoardIds[0] ?? '' : board.id
    const destination = activeBoardId ? boardPath(activeBoardId) : '/'
    if (board.id === id) pendingNavigation.current = { from: location.pathname, to: destination }
    saveWorkspace({ boards: remaining, activeBoardId, openBoardIds })
    if (board.id === id) void navigate(destination, { replace: true })
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

  return { ...board, boards: workspace.boards, activeBoardId: board.id, openBoardIds: workspace.openBoardIds, routeError, closeBoard, addBoard, renameBoard, deleteBoard, storageError, addCard, moveCard, addColumn, deleteCard, deleteColumn }
}
