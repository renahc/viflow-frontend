import { createLocalWorkspaceRepository } from '../storage/localWorkspaceRepository.ts'
import { storageKey } from './board.ts'
import { parseWorkspace, workspaceStorageKey } from './workspace.ts'
import type { WorkspaceBoard } from './workspace.ts'
import { createBackup, maxBackupBytes } from './workspaceBackup.ts'

export class LocalBoardImportError extends Error {}

type LocalRead = Pick<Storage, 'getItem'>
export function readLocalImportBoards(storage: LocalRead): WorkspaceBoard[] {
  // Do not turn the default example workspace into an alleged saved local board.
  if ([workspaceStorageKey, storageKey, 'viflow.board.v1'].every(key => storage.getItem(key) === null)) return []
  const loaded = createLocalWorkspaceRepository(() => ({ getItem: key => storage.getItem(key), setItem: () => { throw new LocalBoardImportError('read_only') } })).load()
  if (loaded.error) throw new LocalBoardImportError('No pudimos leer los tableros locales. No se modificó ningún dato del dispositivo.')
  return loaded.workspace.boards
}
export function prepareLocalBoardImport(boards: WorkspaceBoard[]): WorkspaceBoard[] {
  const workspace = parseWorkspace({ boards, activeBoardId: '', openBoardIds: [] })
  if (!workspace || !boards.length || boards.length > 100) throw new LocalBoardImportError('Selecciona entre 1 y 100 tableros válidos.')
  // Local boards may omit labels until their first label is created. The RPC
  // requires an explicit array, including for boards with no labels.
  const clean = createBackup(workspace).workspace.boards.map(board => ({ ...board, labels: board.labels ?? [] }))
  if (new TextEncoder().encode(JSON.stringify(clean)).byteLength > maxBackupBytes) throw new LocalBoardImportError('La selección supera los 10 MB. Importa menos tableros a la vez.')
  for (const board of clean) {
    const invalid = board.title.length > 160 || board.columns.some(col => col.title.length > 100 || col.description.length > 1000)
      || board.cards.some(card => card.title.length > 160 || card.description.length > 1000 || (card.comments ?? []).some(comment => comment.author.trim().length > 60)
        || (card.activity ?? []).some(entry => entry.actor.trim().length > 60))
    if (invalid) throw new LocalBoardImportError(`«${board.title}» contiene títulos, descripciones o nombres que superan los límites de la nube. Edítalos en el modo local antes de copiarlo.`)
  }
  return clean
}
export function localImportCounts(boards: WorkspaceBoard[]) {
  return { boards: boards.length, cards: boards.reduce((sum, b) => sum + b.cards.length, 0), labels: boards.reduce((sum, b) => sum + (b.labels?.length ?? 0), 0),
    archived: boards.filter(b => b.archivedAt).length,
    comments: boards.reduce((sum, b) => sum + b.cards.reduce((n, c) => n + (c.comments?.length ?? 0), 0), 0),
    activity: boards.reduce((sum, b) => sum + b.cards.reduce((n, c) => n + (c.activity?.length ?? 0), 0), 0) }
}
