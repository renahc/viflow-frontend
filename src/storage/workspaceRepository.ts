import type { Workspace } from '../lib/workspace'

export type WorkspaceLoad = { workspace: Workspace; error: boolean }
// This is the local snapshot boundary. A future cloud service will coordinate
// async requests and account sessions separately, rather than blocking renders.
export interface WorkspaceRepository {
  load(): WorkspaceLoad
  save(workspace: Workspace): void
}

export type WorkspaceState = {
  workspace: Workspace
  storageError: boolean
  saveWorkspace: (next: Workspace) => boolean
  importWorkspace: (next: Workspace) => boolean
  sync?: {
    phase: 'loading' | 'saving' | 'ready' | 'error'
    message: string
    conflict: boolean
    dirty: boolean
    retry: () => void
    reload: () => void
  }
}
