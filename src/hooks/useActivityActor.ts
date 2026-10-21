import { useAuth } from './useAuth'
import { readActivityActor } from '../lib/cardActivity'

// Resolve local identity when an action happens, so local profile edits are
// reflected too. Account identity follows AuthProvider session updates.
export function useActivityActor() {
  const { session } = useAuth()
  return () => readActivityActor(session?.user)
}
