import { useCallback, useState } from 'react'
import { localWorkspaceRepository } from '../storage/localWorkspaceRepository'
import type { WorkspaceRepository } from '../storage/workspaceRepository'
import type { Workspace } from '../lib/workspace'

export function useWorkspaceStorage(repository: WorkspaceRepository = localWorkspaceRepository) {
  const [loaded] = useState(() => repository.load())
  const [workspace, setWorkspace] = useState(loaded.workspace)
  const [storageError, setStorageError] = useState(loaded.error)
  const saveWorkspace = useCallback((next: Workspace): boolean => {
    // Normal edits remain usable in memory if local storage is unavailable.
    setWorkspace(next)
    try { repository.save(next); setStorageError(false); return true }
    catch { setStorageError(true); return false }
  }, [repository])
  const importWorkspace = useCallback((next: Workspace): boolean => {
    // Imports are transactional: quota/permission failures leave current data intact.
    try { repository.save(next); setWorkspace(next); setStorageError(false); return true }
    catch { setStorageError(true); return false }
  }, [repository])
  return { workspace, storageError, saveWorkspace, importWorkspace }
}
