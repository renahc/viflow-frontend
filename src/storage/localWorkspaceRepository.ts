import { createInitialBoard, initialColumns, isBoard, storageKey } from '../lib/board.ts'
import { parseWorkspace, workspaceStorageKey } from '../lib/workspace.ts'
import type { Workspace } from '../lib/workspace.ts'
import type { WorkspaceRepository } from './workspaceRepository.ts'

type StorageAccess = Pick<Storage, 'getItem' | 'setItem'>
function initialWorkspace(): Workspace {
  return { boards: [{ ...createInitialBoard(), id: 'default', title: 'Mi tablero' }], activeBoardId: 'default', openBoardIds: ['default'] }
}
export function createLocalWorkspaceRepository(getStorage: () => StorageAccess): WorkspaceRepository {
  return {
    load() {
      try {
        const storage = getStorage()
        const current = storage.getItem(workspaceStorageKey)
        if (current !== null) {
          const workspace = parseWorkspace(JSON.parse(current))
          return { workspace: workspace ?? initialWorkspace(), error: !workspace }
        }
        // Legacy formats are read without modifying or removing their source.
        const legacy = storage.getItem(storageKey)
        if (legacy !== null) {
          const board: unknown = JSON.parse(legacy)
          if (isBoard(board)) return { workspace: { ...initialWorkspace(), boards: [{ ...board, id: 'default', title: 'Mi tablero' }] }, error: false }
          return { workspace: initialWorkspace(), error: true }
        }
        const oldest = storage.getItem('viflow.board.v1')
        if (oldest !== null) {
          const board = { columns: initialColumns, cards: JSON.parse(oldest) as unknown }
          if (isBoard(board)) return { workspace: { ...initialWorkspace(), boards: [{ ...board, id: 'default', title: 'Mi tablero' }] }, error: false }
          return { workspace: initialWorkspace(), error: true }
        }
        return { workspace: initialWorkspace(), error: false }
      } catch { return { workspace: initialWorkspace(), error: true } }
    },
    save(workspace) {
      getStorage().setItem(workspaceStorageKey, JSON.stringify(workspace))
    },
  }
}
export const localWorkspaceRepository = createLocalWorkspaceRepository(() => localStorage)
