import { useLocation } from 'react-router'
import { WorkspaceScreen } from './components/workspace/WorkspaceScreen'
import { useAuth } from './hooks/useAuth'
import { useWorkspaceStorage } from './hooks/useWorkspaceStorage'
import { useCloudWorkspace } from './hooks/useCloudWorkspace'
import type { WorkspaceState } from './storage/workspaceRepository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useBoard } from './hooks/useBoard'

function BoardApplication({ storage }: { storage: WorkspaceState }) {
  const workspace = useBoard(storage)
  const location = useLocation()

  // Keep persisted data above the route key; reset only temporary UI when navigating.
  return <WorkspaceScreen key={location.pathname} workspace={workspace} />
}

function LocalWorkspace() { return <BoardApplication storage={useWorkspaceStorage()} /> }
function CloudWorkspace({ client, userId }: { client: SupabaseClient; userId: string }) { return <BoardApplication storage={useCloudWorkspace(client, userId)} /> }
export default function App() {
  const { loading, session, client, sessionError } = useAuth()
  if (loading) return <div className="workspace-empty" role="status">Comprobando sesión…</div>
  if (sessionError) return <div className="workspace-empty" role="alert">No pudimos recuperar tu sesión. Recarga la página para volver a intentarlo.</div>
  if (session?.user.email_confirmed_at && client) return <CloudWorkspace key={session.user.id} client={client} userId={session.user.id} />
  return <LocalWorkspace key="guest" />
}
