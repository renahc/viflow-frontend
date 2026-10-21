import type { SupabaseClient } from '@supabase/supabase-js'
import { registrationError } from './registrationService.ts'

type AuthApi = Pick<SupabaseClient['auth'], 'resetPasswordForEmail' | 'verifyOtp' | 'getUser' | 'updateUser'>
export class RecoverySessionError extends Error {
  constructor() { super('Recovery verification required'); this.name = 'RecoverySessionError' }
}
export function createPasswordRecoveryService(auth: AuthApi) {
  // Only a successful recovery OTP in this instance unlocks password updates.
  // Restoring an ordinary session or editing browser storage is not sufficient.
  let verifiedUserId: string | null = null
  return {
    revoke() { verifiedUserId = null },
    async request(email: string) {
      verifiedUserId = null
      const { error } = await auth.resetPasswordForEmail(email.trim())
      if (error) throw error
    },
    async verify(email: string, token: string) {
      verifiedUserId = null
      const { data, error } = await auth.verifyOtp({ email: email.trim(), token, type: 'recovery' })
      if (error) throw error
      if (!data.session || !data.user?.id || !data.user.email_confirmed_at || data.user.email?.toLowerCase() !== email.trim().toLowerCase()) throw new RecoverySessionError()
      verifiedUserId = data.user.id
    },
    async updatePassword(password: string) {
      if (!verifiedUserId) throw new RecoverySessionError()
      const { data: current, error: sessionError } = await auth.getUser()
      if (sessionError || current.user?.id !== verifiedUserId) { verifiedUserId = null; throw new RecoverySessionError() }
      const { data, error } = await auth.updateUser({ password })
      if (error) throw error
      if (data.user?.id !== verifiedUserId) { verifiedUserId = null; throw new RecoverySessionError() }
      verifiedUserId = null
    },
  }
}
export function passwordRecoveryError(error: unknown): string {
  const value = typeof error === 'object' && error !== null ? error as { code?: string; name?: string } : {}
  if (value.name === 'RecoverySessionError' || ['session_not_found', 'session_expired', 'refresh_token_not_found', 'refresh_token_already_used', 'reauthentication_needed'].includes(value.code ?? '')) return 'La verificación ya no está disponible. Solicita otro código antes de cambiar la contraseña.'
  if (value.code === 'same_password') return 'Elige una contraseña diferente de la anterior.'
  return registrationError(error)
}
