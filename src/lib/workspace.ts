import { initialColumns, isBoard, loadBoard } from './board'
import type { Board } from './board'

export type WorkspaceBoard = Board & { id: string; title: string }
export type Workspace = { boards: WorkspaceBoard[]; activeBoardId: string }
export const workspaceStorageKey = 'viflow.workspace.v1'

function isWorkspaceBoard(value: unknown): value is WorkspaceBoard {
  if (!isBoard(value)) return false
  const board = value as unknown as Record<string, unknown>
  return typeof board.id === 'string' && !!board.id.trim()
    && typeof board.title === 'string' && !!board.title.trim()
}

export function createBoard(title: string): WorkspaceBoard {
  return {
    id: crypto.randomUUID(), title: title.trim(),
    columns: initialColumns.map(column => ({ ...column })), cards: [],
  }
}

export function loadWorkspace(): Workspace {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(workspaceStorageKey) ?? 'null')
    if (typeof stored === 'object' && stored !== null) {
      const workspace = stored as Record<string, unknown>
      if (Array.isArray(workspace.boards) && workspace.boards.length > 0
        && workspace.boards.every(isWorkspaceBoard)
        && new Set(workspace.boards.map(board => board.id)).size === workspace.boards.length) {
        return {
          boards: workspace.boards,
          activeBoardId: workspace.boards.some(board => board.id === workspace.activeBoardId)
            ? workspace.activeBoardId as string : workspace.boards[0].id,
        }
      }
    }
  } catch { /* Fall back to the previous single-board format. */ }
  return { boards: [{ ...loadBoard(), id: 'default', title: 'Mi tablero' }], activeBoardId: 'default' }
}
