import { useLocation } from 'react-router'
import { WorkspaceScreen } from './components/workspace/WorkspaceScreen'
import { useBoard } from './hooks/useBoard'

export default function App() {
  const workspace = useBoard()
  const location = useLocation()

  // Keep persisted data above the route key; reset only temporary UI when navigating.
  return <WorkspaceScreen key={location.pathname} workspace={workspace} />
}
