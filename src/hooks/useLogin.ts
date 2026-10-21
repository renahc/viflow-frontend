import { useEffect, useMemo, useRef, useState } from 'react'
import { createLoginService, isUnconfirmedEmail, loginError } from '../services/loginService'
import { useAuth } from './useAuth'

export function useLogin() {
  const auth = useAuth()
  const service = useMemo(() => auth.client ? createLoginService(auth.client.auth) : null, [auth.client])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const requestRef = useRef({ busy: false, version: 0 })
  useEffect(() => {
    const request = requestRef.current
    return () => { request.version++; request.busy = false }
  }, [])
  return {
    ...auth, busy, error, needsVerification,
    clearError() { setError(''); setNeedsVerification(false) },
    async login(email: string, password: string) {
      if (!service || requestRef.current.busy) return
      requestRef.current.busy = true
      const version = ++requestRef.current.version
      setBusy(true); setError(''); setNeedsVerification(false)
      try { await service.login(email, password) }
      catch (error) {
        if (version === requestRef.current.version) { setError(loginError(error)); setNeedsVerification(isUnconfirmedEmail(error)) }
      } finally {
        if (version === requestRef.current.version) { requestRef.current.busy = false; setBusy(false) }
      }
    },
  }
}
