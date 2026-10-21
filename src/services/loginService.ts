import type { SupabaseClient } from '@supabase/supabase-js'
import { registrationError } from './registrationService.ts'

type AuthApi = Pick<SupabaseClient['auth'], 'signInWithPassword'>
export function createLoginService(auth: AuthApi) {
  return {
    async login(email: string, password: string) {
      const { data, error } = await auth.signInWithPassword({ email: email.trim(), password })
      if (error) throw error
      if (!data.session || !data.user?.email_confirmed_at) throw new Error('Missing verified session')
    },
  }
}
export function isUnconfirmedEmail(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'email_not_confirmed'
}
export function loginError(error: unknown): string {
  if (isUnconfirmedEmail(error)) return 'Tu correo todavía no está verificado. Confírmalo antes de iniciar sesión.'
  const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  if (code === 'invalid_credentials' || code === 'user_not_found' || code === 'invalid_grant') return 'El correo o la contraseña no son correctos.'
  return registrationError(error)
}
