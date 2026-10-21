import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { createCardLabel, deleteBoardLabel, isLabelColor, toggleCardLabel } from '../lib/labels'
import type { LabelColor } from '../lib/labels'
import { addCardComment, appendCardActivity, readActivityActor } from '../lib/cardActivity'
import { updateCardContent } from '../lib/updateCard'
import { moveCardInBoard } from '../lib/moveCard'
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
    const card = { id: crypto.randomUUID(), title: title.trim(), description: description.trim(), status }
    const nextBoard = { ...board, cards: [...board.cards, card] }
    saveBoard(appendCardActivity(nextBoard, card.id, 'created', `creó la tarjeta en «${board.columns.find(column => column.id === status)?.title}».`, readActivityActor()))
  }

  function editCard(id: string, title: string, description: string) {
    const result = updateCardContent(board, id, { title, description })
    if (result.error) return result.error
    if (result.board === board) return
    const previous = board.cards.find(card => card.id === id)!
    const actor = readActivityActor()
    let nextBoard = result.board
    if (previous.title !== title.trim()) nextBoard = appendCardActivity(nextBoard, id, 'title-edited', `cambió el título a «${title.trim()}».`, actor)
    if (previous.description !== description.trim()) nextBoard = appendCardActivity(nextBoard, id, 'description-edited', 'actualizó la descripción.', actor)
    saveBoard(nextBoard)
  }

  function moveCard(id: string, status: Status, beforeId?: string | null) {
    const nextBoard = moveCardInBoard(board, id, status, beforeId)
    if (nextBoard === board) return
    const previous = board.cards.find(card => card.id === id)!
    const destination = board.columns.find(column => column.id === status)!.title
    const message = previous.status === status ? `reordenó la tarjeta en «${destination}».`
      : `movió la tarjeta de «${board.columns.find(column => column.id === previous.status)?.title}» a «${destination}».`
    saveBoard(appendCardActivity(nextBoard, id, previous.status === status ? 'reordered' : 'moved', message, readActivityActor()))
  }

  function addColumn(title: string, color: LabelColor = 'purple') {
    if (!title.trim() || title.trim().length > 80 || !isLabelColor(color)) return
    const column = { id: crypto.randomUUID(), title: title.trim(), description: '', color }
    saveBoard({ ...board, columns: [...board.columns, column] })
    return column.id
  }

  function addLabel(cardId: string, name: string, color: LabelColor) {
    const result = createCardLabel(board, cardId, name, color)
    if (result.error) return result.error
    saveBoard(appendCardActivity(result.board, cardId, 'label-added', `agregó la etiqueta «${name.trim()}».`, readActivityActor()))
  }

  function toggleLabel(cardId: string, labelId: string) {
    const nextBoard = toggleCardLabel(board, cardId, labelId)
    if (nextBoard === board) return
    const removed = board.cards.find(card => card.id === cardId)?.labelIds?.includes(labelId)
    const name = board.labels?.find(label => label.id === labelId)?.name
    saveBoard(appendCardActivity(nextBoard, cardId, removed ? 'label-removed' : 'label-added', `${removed ? 'quitó' : 'agregó'} la etiqueta «${name}».`, readActivityActor()))
  }

  function deleteLabel(labelId: string) {
    const nextBoard = deleteBoardLabel(board, labelId)
    if (nextBoard === board) return
    const name = board.labels?.find(label => label.id === labelId)?.name
    const actor = readActivityActor()
    const audited = board.cards.filter(card => card.labelIds?.includes(labelId)).reduce((current, card) =>
      appendCardActivity(current, card.id, 'label-removed', `eliminó la etiqueta «${name}» del tablero.`, actor), nextBoard)
    saveBoard(audited)
  }

  function commentOnCard(cardId: string, body: string) {
    const result = addCardComment(board, cardId, body, readActivityActor())
    if (result.error) return result.error
    saveBoard(result.board)
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

  return { ...board, labels: board.labels ?? [], addLabel, toggleLabel, deleteLabel, boards: workspace.boards, activeBoardId: board.id, openBoardIds: workspace.openBoardIds, routeError, closeBoard, addBoard, renameBoard, deleteBoard, storageError, commentOnCard, addCard, editCard, moveCard, addColumn, deleteCard, deleteColumn }
}
