import type { SupabaseClient } from '@supabase/supabase-js'
import { registrationError } from './registrationService.ts'

export function createAccountSecurityService(auth: Pick<SupabaseClient['auth'], 'getUser' | 'signInWithPassword' | 'updateUser'>) {
  return {
    async changePassword(userId: string, currentPassword: string, password: string) {
      if (!currentPassword || password.length < 8 || password.length > 128) throw new Error('invalid_password')
      const { data: current, error: sessionError } = await auth.getUser()
      if (sessionError) throw sessionError
      if (current.user?.id !== userId || !current.user.email_confirmed_at) throw new Error('session_changed')
      if (!current.user.email) throw new Error('session_changed')
      // Validate the current password even when the project's optional
      // require-current-password setting is disabled.
      const { data: verified, error: verificationError } = await auth.signInWithPassword({ email: current.user.email, password: currentPassword })
      if (verificationError) throw verificationError
      if (!verified.session || verified.user?.id !== userId) throw new Error('session_changed')
      const { data, error } = await auth.updateUser({ password, current_password: currentPassword })
      if (error) throw error
      if (data.user?.id !== userId) throw new Error('session_changed')
    },
  }
}
export function accountSecurityError(error: unknown) {
  const value = typeof error === 'object' && error !== null ? error as { code?: string; message?: string } : {}
  if (value.message === 'session_changed') return 'Tu sesión cambió. Vuelve a iniciar sesión antes de continuar.'
  if (value.code === 'same_password') return 'Elige una contraseña diferente de la actual.'
  if (value.code === 'invalid_credentials' || value.code === 'current_password_invalid') return 'La contraseña actual no es correcta.'
  if (value.code === 'reauthentication_needed' || value.code === 'reauthentication_not_valid') return 'Por seguridad, utiliza la recuperación por correo para cambiar tu contraseña.'
  return registrationError(error)
}
