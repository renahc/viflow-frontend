import type { Workspace } from '../lib/workspace'

export type WorkspaceLoad = { workspace: Workspace; error: boolean }
// This is the local snapshot boundary. A future cloud service will coordinate
// async requests and account sessions separately, rather than blocking renders.
export interface WorkspaceRepository {
  load(): WorkspaceLoad
  save(workspace: Workspace): void
}
