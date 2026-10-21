import { parseWorkspace } from './workspace.ts'
import type { Workspace, WorkspaceBoard } from './workspace.ts'

export const maxBackupBytes = 10 * 1024 * 1024
export type WorkspaceBackup = { format: 'viflow'; version: 1; exportedAt: string; workspace: Workspace }

// Select known data fields; imports cannot introduce ownership or session fields.
function copyBoard(board: WorkspaceBoard): WorkspaceBoard {
  return {
    id: board.id, title: board.title, archivedAt: board.archivedAt,
    columns: board.columns.map(({ id, title, description, color, sort }) => ({ id, title, description, color, sort })),
    labels: board.labels?.map(({ id, name, color }) => ({ id, name, color })),
    cards: board.cards.map(card => ({
      id: card.id, title: card.title, description: card.description, status: card.status,
      archivedAt: card.archivedAt, dueDate: card.dueDate, priority: card.priority,
      labelIds: card.labelIds ? [...card.labelIds] : undefined,
      comments: card.comments?.map(({ id, author, body, createdAt }) => ({ id, author, body, createdAt })),
      activity: card.activity?.map(({ id, kind, actor, message, createdAt }) => ({ id, kind, actor, message, createdAt })),
    })),
  }
}
export function createBackup(workspace: Workspace): WorkspaceBackup {
  return { format: 'viflow', version: 1, exportedAt: new Date().toISOString(), workspace: {
    boards: workspace.boards.map(copyBoard), activeBoardId: workspace.activeBoardId, openBoardIds: [...workspace.openBoardIds],
  } }
}
export function parseBackup(text: string): WorkspaceBackup {
  if (new TextEncoder().encode(text).byteLength > maxBackupBytes) throw new Error('El respaldo supera el límite de 10 MB.')
  let value: unknown
  try { value = JSON.parse(text) } catch { throw new Error('El archivo no contiene un JSON válido.') }
  if (typeof value !== 'object' || value === null) throw new Error('Este archivo no es un respaldo de viflow.')
  const data = value as Record<string, unknown>
  if (data.format !== 'viflow') throw new Error('Este archivo no es un respaldo de viflow.')
  if (data.version !== 1) throw new Error('La versión de este respaldo no es compatible.')
  if (typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt))) throw new Error('El respaldo no tiene una fecha válida.')
  const workspace = parseWorkspace(data.workspace)
  if (!workspace) throw new Error('El respaldo contiene datos o referencias inválidas. No se importó ningún tablero.')
  return { ...createBackup(workspace), exportedAt: data.exportedAt }
}
export function mergeBackup(current: Workspace, backup: WorkspaceBackup): Workspace {
  return { ...current, boards: [...current.boards, ...backup.workspace.boards.map(board => ({ ...copyBoard(board), id: crypto.randomUUID() }))] }
}
export function backupCounts(backup: WorkspaceBackup) {
  const boards = backup.workspace.boards
  return { boards: boards.length, cards: boards.reduce((count, board) => count + board.cards.length, 0), archivedBoards: boards.filter(board => board.archivedAt).length }
}
