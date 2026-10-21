import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './useAuth'
import { createPasswordRecoveryService, passwordRecoveryError } from '../services/passwordRecoveryService'
import { parsePendingRegistration } from '../lib/pendingRegistration'

const storageKey = 'viflow.auth.recovery.v1'
type Step = 'request' | 'verify' | 'password' | 'success'
export function usePasswordRecovery() {
  const auth = useAuth()
  const service = useMemo(() => auth.client ? createPasswordRecoveryService(auth.client.auth) : null, [auth.client])
  const [initial] = useState(() => {
    try { return parsePendingRegistration(sessionStorage.getItem(storageKey)) } catch { return null }
  })
  const [email, setEmail] = useState(initial?.email ?? '')
  const [step, setStep] = useState<Step>(initial ? 'verify' : 'request')
  const [busy, setBusy] = useState<'request' | 'verify' | 'update' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resendAt, setResendAt] = useState(initial?.resendAt ?? 0)
  const [now, setNow] = useState(Date.now)
  const requestRef = useRef({ version: 0, busy: false })
  useEffect(() => {
    const request = requestRef.current
    return () => { request.version++; request.busy = false; service?.revoke() }
  }, [service])
  useEffect(() => {
    if (resendAt <= Date.now()) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])
  function remember(pending: { email: string; resendAt: number } | null) {
    try {
      if (pending) sessionStorage.setItem(storageKey, JSON.stringify(pending))
      else sessionStorage.removeItem(storageKey)
    } catch { /* Resume is optional; passwords and grants are never stored. */ }
  }
  async function run(action: NonNullable<typeof busy>, work: () => Promise<void>) {
    if (!service || requestRef.current.busy) return
    requestRef.current.busy = true
    const version = ++requestRef.current.version
    setBusy(action); setError(''); setNotice('')
    try { await work() }
    catch (error) { if (version === requestRef.current.version) setError(passwordRecoveryError(error)) }
    finally { if (version === requestRef.current.version) { requestRef.current.busy = false; setBusy(null) } }
  }
  return {
    ...auth, email, setEmail, step, busy, error, notice,
    cooldown: Math.max(0, Math.ceil((resendAt - now) / 1000)),
    clearError: () => setError(''),
    restart() {
      if (requestRef.current.busy) return
      service?.revoke(); remember(null); setStep('request'); setError(''); setNotice('')
    },
    requestCode() {
      if (Date.now() < resendAt) return
      return run('request', async () => {
        const version = requestRef.current.version
        await service!.request(email)
        if (version !== requestRef.current.version) return
        const next = Date.now() + 60_000
        setEmail(email.trim()); setResendAt(next); setNow(Date.now()); setStep('verify')
        remember({ email: email.trim(), resendAt: next })
        setNotice('Si existe una cuenta con este correo, recibirás un código de recuperación.')
      })
    },
    verifyCode(code: string) {
      return run('verify', async () => {
        const version = requestRef.current.version
        await service!.verify(email, code)
        if (version === requestRef.current.version) setStep('password')
      })
    },
    updatePassword(password: string) {
      if (step !== 'password') return
      return run('update', async () => {
        const version = requestRef.current.version
        await service!.updatePassword(password)
        if (version !== requestRef.current.version) return
        remember(null); setStep('success')
      })
    },
  }
}
