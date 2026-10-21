import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { createRegistrationService, registrationError } from '../services/registrationService'
import { parsePendingRegistration, pendingRegistrationKey } from '../lib/pendingRegistration'
import type { PendingRegistration } from '../lib/pendingRegistration'

export function useRegistration() {
  const auth = useAuth()
  const service = useMemo(() => auth.client ? createRegistrationService(auth.client.auth) : null, [auth.client])
  const [initial] = useState(() => {
    try { return parsePendingRegistration(sessionStorage.getItem(pendingRegistrationKey)) } catch { return null }
  })
  const [email, setEmail] = useState(initial?.email ?? '')
  const [verifying, setVerifying] = useState(Boolean(initial))
  const [busy, setBusy] = useState<'register' | 'verify' | 'resend' | 'logout' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendAt, setResendAt] = useState(initial?.resendAt ?? 0)
  const [now, setNow] = useState(Date.now)
  const operationRef = useRef({ version: 0, busy: false })
  const confirmed = Boolean(auth.session?.user.email_confirmed_at)
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000))
  useEffect(() => {
    const state = operationRef.current
    return () => { state.version++; state.busy = false }
  }, [])
  useEffect(() => {
    if (resendAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])
  useEffect(() => {
    if (confirmed) { try { sessionStorage.removeItem(pendingRegistrationKey) } catch { /* Optional resume storage. */ } }
  }, [confirmed])
  function remember(pending: PendingRegistration | null) {
    try {
      if (pending) sessionStorage.setItem(pendingRegistrationKey, JSON.stringify(pending))
      else sessionStorage.removeItem(pendingRegistrationKey)
    } catch { /* Registration still works without sessionStorage. */ }
  }
  async function run(action: NonNullable<typeof busy>, work: () => Promise<void>) {
    if (operationRef.current.busy || !service) return
    operationRef.current.busy = true
    const version = ++operationRef.current.version
    setBusy(action); setError(''); setNotice('')
    try { await work() }
    catch (error) { if (version === operationRef.current.version) setError(registrationError(error)) }
    finally { if (version === operationRef.current.version) { operationRef.current.busy = false; setBusy(null) } }
  }
  function nextSend() {
    const next = Date.now() + 60_000
    setResendAt(next); setNow(Date.now())
    remember({ email: email.trim(), resendAt: next })
  }
  return {
    ...auth, email, setEmail, verifying, busy, error, notice, cooldown, confirmed,
    clearError: () => setError(''),
    changeEmail() { if (busy) return; setVerifying(false); setError(''); setNotice(''); remember(null) },
    register(password: string) {
      return run('register', async () => {
        const version = operationRef.current.version
        const result = await service!.register(email, password)
        if (version !== operationRef.current.version) return
        if (!result.confirmed) { setEmail(email.trim()); setVerifying(true); nextSend() }
      })
    },
    verify(code: string) {
      return run('verify', async () => {
        const version = operationRef.current.version
        await service!.verify(email, code)
        if (version === operationRef.current.version) remember(null)
      })
    },
    resend() {
      if (Date.now() < resendAt) return
      return run('resend', async () => {
        const version = operationRef.current.version
        await service!.resend(email)
        if (version !== operationRef.current.version) return
        nextSend(); setNotice('Solicitamos un nuevo código. Usa el correo más reciente.')
      })
    },
    logout() {
      return run('logout', async () => {
        const version = operationRef.current.version
        const { error } = await auth.client!.auth.signOut({ scope: 'local' })
        if (error) throw error
        if (version !== operationRef.current.version) return
        remember(null); setVerifying(false); setEmail('')
      })
    },
  }
}
