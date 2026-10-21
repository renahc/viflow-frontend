import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Subscription } from '@supabase/supabase-js'
import { readSupabaseConfig } from '../services/supabaseConfig'
import { AuthContext } from './AuthContext'
import type { AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [configured] = useState(() => {
    try { readSupabaseConfig(import.meta.env); return true } catch { return false }
  })
  const [state, setState] = useState<AuthState>({ client: null, session: null, loading: configured, sessionError: false, configurationError: !configured })
  useEffect(() => {
    if (!configured) return
    let active = true
    let subscription: Subscription | undefined
    // Keep the SDK in a separate chunk; the local board can render immediately.
    void import('../services/supabaseClient').then(async ({ getSupabaseClient }) => {
      if (!active) return
      const client = getSupabaseClient()
      let revision = 0
      subscription = client.auth.onAuthStateChange((_event, session) => {
        revision++
        if (active) setState({ client, session, loading: false, sessionError: false, configurationError: false })
      }).data.subscription
      const requestedRevision = revision
      const { data, error } = await client.auth.getSession()
      if (active && revision === requestedRevision) setState({ client, session: data.session, loading: false, sessionError: Boolean(error), configurationError: false })
    }).catch(() => {
      if (active) setState(current => ({ ...current, loading: false, sessionError: true }))
    })
    return () => { active = false; subscription?.unsubscribe() }
  }, [configured])
  return <AuthContext value={state}>{children}</AuthContext>
}
