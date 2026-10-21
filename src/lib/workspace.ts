import { initialColumns, isBoard } from './board.ts'
import type { Board } from './board'

export type WorkspaceBoard = Board & { id: string; title: string; archivedAt?: string }
export type Workspace = { boards: WorkspaceBoard[]; activeBoardId: string; openBoardIds: string[] }
export const workspaceStorageKey = 'viflow.workspace.v1'

function isWorkspaceBoard(value: unknown): value is WorkspaceBoard {
  if (!isBoard(value)) return false
  const board = value as unknown as Record<string, unknown>
  return (board.archivedAt === undefined || (typeof board.archivedAt === 'string' && Number.isFinite(Date.parse(board.archivedAt))))
    && typeof board.id === 'string' && !!board.id.trim()
    && typeof board.title === 'string' && !!board.title.trim()
}

export function createBoard(title: string): WorkspaceBoard {
  return {
    id: crypto.randomUUID(), title: title.trim(),
    columns: initialColumns.map(column => ({ ...column })), cards: [],
  }
}

export function parseWorkspace(value: unknown): Workspace | undefined {
  if (typeof value !== 'object' || value === null) return
  const workspace = value as Record<string, unknown>
  if (!Array.isArray(workspace.boards) || !workspace.boards.every(isWorkspaceBoard)
    || new Set(workspace.boards.map(board => board.id)).size !== workspace.boards.length) return
  const boards = workspace.boards
  const visibleBoards = boards.filter(board => !board.archivedAt)
  const validActiveId = visibleBoards.some(board => board.id === workspace.activeBoardId)
    ? workspace.activeBoardId as string : visibleBoards[0]?.id ?? ''
  const openBoardIds = Array.isArray(workspace.openBoardIds)
    ? [...new Set(workspace.openBoardIds.filter((id): id is string => typeof id === 'string' && visibleBoards.some(board => board.id === id)))]
    : validActiveId ? [validActiveId] : []
  return { boards, openBoardIds, activeBoardId: openBoardIds.includes(validActiveId) ? validActiveId : openBoardIds[0] ?? '' }
}
