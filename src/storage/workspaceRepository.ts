import type { Workspace, WorkspaceBoard } from '../lib/workspace'

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
  copyLocalBoards?: (boards: WorkspaceBoard[]) => Promise<string[]>
  sync?: {
    online?: boolean
    draftSaved?: boolean
    draftError?: string
    drafts?: { id: string; boardId: string; savedAt: string; titles: string[] }[]
    recoverDraft?: (id: string) => void
    discardDraft?: (id: string) => void
    phase: 'loading' | 'saving' | 'ready' | 'error'
    message: string
    conflict: boolean
    dirty: boolean
    retry: () => void
    reload: () => void
  }
}
