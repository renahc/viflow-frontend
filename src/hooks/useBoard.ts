import { removeColumnKeepingCards, setCardArchived } from '../lib/archive'
import type { ColumnSort } from '../lib/columnSort'
import { formatDueDate, priorities } from '../lib/cardSchedule'
import type { CardSchedule } from '../lib/cardSchedule'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { createCardLabel, deleteBoardLabel, isLabelColor, toggleCardLabel } from '../lib/labels'
import type { LabelColor } from '../lib/labels'
import { addCardComment, appendCardActivity, readActivityActor } from '../lib/cardActivity'
import { updateCardContent } from '../lib/updateCard'
import { moveCardInBoard } from '../lib/moveCard'
import { boardPath } from '../lib/routes'
import { createBoard } from '../lib/workspace'
import { useWorkspaceStorage } from './useWorkspaceStorage'
import { mergeBackup } from '../lib/workspaceBackup'
import type { WorkspaceBackup } from '../lib/workspaceBackup'
import type { Board, Status } from '../lib/board'

export function useBoard() {
  const { workspace, storageError, saveWorkspace, importWorkspace } = useWorkspaceStorage()
  const [undoArchive, setUndoArchive] = useState<{ kind: 'board' | 'card'; boardId: string; cardId?: string; title: string } | null>(null)
  const match = useMatch('/boards/:boardId')
  const location = useLocation()
  const navigate = useNavigate()
  const pendingNavigation = useRef<{ from: string; to: string } | null>(null)
  const routeBoardId = match?.params.boardId
  // The URL decides what is displayed. Stored selection only restores old data.
  const board = workspace.boards.find(board => board.id === routeBoardId && !board.archivedAt) ?? { id: '', title: 'Sin tableros', columns: [], cards: [] }
  const routeError = (Boolean(routeBoardId) && !board.id) || (!match && location.pathname !== '/')
  // Browser Back/Forward and direct URLs must also restore the open tab.
  useEffect(() => {
    // Router transitions can commit after a workspace update. Do not reopen the tab being closed.
    const pending = pendingNavigation.current
    if (pending && location.pathname === pending.from && pending.from !== pending.to) return
    pendingNavigation.current = null
    if (storageError || !board.id || (workspace.activeBoardId === board.id && workspace.openBoardIds.includes(board.id))) return
    // URL changes are external navigation events; synchronize their persisted tab state.
    saveWorkspace({ ...workspace, activeBoardId: board.id, openBoardIds: workspace.openBoardIds.includes(board.id)
      ? workspace.openBoardIds : [...workspace.openBoardIds, board.id] })
  }, [board.id, location.pathname, workspace, saveWorkspace, storageError])

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

  function archiveBoard(id: string) {
    const target = workspace.boards.find(current => current.id === id && !current.archivedAt)
    if (!target) return
    const remaining = workspace.boards.map(current => current.id === id ? { ...current, archivedAt: new Date().toISOString() } : current)
    setUndoArchive({ kind: 'board', boardId: id, title: target.title })
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

  function editCard(id: string, title: string, description: string, schedule: CardSchedule) {
    const result = updateCardContent(board, id, { title, description }, schedule)
    if (result.error) return result.error
    if (result.board === board) return
    const previous = board.cards.find(card => card.id === id)!
    const actor = readActivityActor()
    let nextBoard = result.board
    if (previous.title !== title.trim()) nextBoard = appendCardActivity(nextBoard, id, 'title-edited', `cambió el título a «${title.trim()}».`, actor)
    if (previous.description !== description.trim()) nextBoard = appendCardActivity(nextBoard, id, 'description-edited', 'actualizó la descripción.', actor)
    if ((previous.dueDate ?? '') !== schedule.dueDate) nextBoard = appendCardActivity(nextBoard, id, 'due-date-edited', schedule.dueDate ? `cambió el vencimiento al ${formatDueDate(schedule.dueDate)}.` : 'quitó la fecha de vencimiento.', actor)
    if ((previous.priority ?? 'none') !== schedule.priority) nextBoard = appendCardActivity(nextBoard, id, 'priority-edited', `cambió la prioridad a «${priorities[schedule.priority]}».`, actor)
    saveBoard(nextBoard)
  }

  function moveCard(id: string, status: Status, beforeId?: string | null) {
    if (board.columns.find(column => column.id === status)?.sort === 'priority') {
      if (board.cards.find(card => card.id === id)?.status === status) return
      beforeId = null
    }
    const nextBoard = moveCardInBoard(board, id, status, beforeId)
    if (nextBoard === board) return
    const previous = board.cards.find(card => card.id === id)!
    const destination = board.columns.find(column => column.id === status)!.title
    const message = previous.status === status ? `reordenó la tarjeta en «${destination}».`
      : `movió la tarjeta de «${board.columns.find(column => column.id === previous.status)?.title}» a «${destination}».`
    saveBoard(appendCardActivity(nextBoard, id, previous.status === status ? 'reordered' : 'moved', message, readActivityActor()))
  }

  function setColumnSort(id: string, sort: ColumnSort) {
    if (sort !== 'manual' && sort !== 'priority') return
    saveBoard({ ...board, columns: board.columns.map(column => column.id === id ? { ...column, sort } : column) })
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

  function archiveCard(id: string) {
    const card = board.cards.find(card => card.id === id && !card.archivedAt)
    if (!card) return
    const nextBoard = setCardArchived(board, id, true)
    saveBoard(appendCardActivity(nextBoard, id, 'archived', 'archivó la tarjeta.', readActivityActor()))
    setUndoArchive({ kind: 'card', boardId: board.id, cardId: id, title: card.title })
  }

  function restoreArchived(boardId: string, cardId?: string) {
    const target = workspace.boards.find(current => current.id === boardId)
    if (!target || (cardId ? target.archivedAt || !target.cards.some(card => card.id === cardId && card.archivedAt) : !target.archivedAt)) return
    const restored = cardId ? appendCardActivity(setCardArchived(target, cardId, false), cardId, 'restored', 'restauró la tarjeta.', readActivityActor())
      : { ...target, archivedAt: undefined }
    saveWorkspace({ ...workspace, boards: workspace.boards.map(current => current.id === boardId ? { ...current, ...restored } : current) })
    setUndoArchive(null)
  }

  function undoLastArchive() {
    if (undoArchive) restoreArchived(undoArchive.boardId, undoArchive.cardId)
  }

  function deleteColumn(id: string) {
    saveBoard(removeColumnKeepingCards(board, id))
  }

  function importBackup(backup: WorkspaceBackup): boolean {
    return importWorkspace(mergeBackup(workspace, backup))
  }

  return { ...board, exportWorkspace: workspace, importBackup, cards: board.cards.filter(card => !card.archivedAt), allBoards: workspace.boards, undoArchive, restoreArchived, undoLastArchive, dismissUndo: () => setUndoArchive(null), labels: board.labels ?? [], addLabel, toggleLabel, deleteLabel, boards: workspace.boards.filter(board => !board.archivedAt), activeBoardId: board.id, openBoardIds: workspace.openBoardIds, routeError, closeBoard, addBoard, renameBoard, archiveBoard, storageError, commentOnCard, addCard, editCard, moveCard, addColumn, setColumnSort, archiveCard, deleteColumn }
}
