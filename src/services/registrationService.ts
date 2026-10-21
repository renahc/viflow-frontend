import { validateDisplayName } from './accountProfileService.ts'
import type { SupabaseClient } from '@supabase/supabase-js'

type AuthApi = Pick<SupabaseClient['auth'], 'signUp' | 'verifyOtp' | 'resend'>
export function createRegistrationService(auth: AuthApi) {
  return {
    async register(email: string, password: string, displayName: string) {
      const { data, error } = await auth.signUp({ email: email.trim(), password, options: { data: { display_name: validateDisplayName(displayName) } } })
      if (error) throw error
      // Supabase may deliberately conceal an existing account. Do not infer
      // successful verification from a user object or an empty identities array.
      return { confirmed: Boolean(data.session && data.user?.email_confirmed_at) }
    },
    async verify(email: string, token: string) {
      const { data, error } = await auth.verifyOtp({ email: email.trim(), token, type: 'email' })
      if (error) throw error
      if (!data.session || !data.user?.email_confirmed_at) throw new Error('unconfirmed')
    },
    async resend(email: string) {
      const { error } = await auth.resend({ type: 'signup', email: email.trim() })
      if (error) throw error
    },
  }
}
export type RegistrationService = ReturnType<typeof createRegistrationService>

export function registrationError(error: unknown): string {
  const value = typeof error === 'object' && error !== null ? error as { code?: string; status?: number; name?: string } : {}
  if (value.status === 429 || value.code === 'over_email_send_rate_limit' || value.code === 'over_request_rate_limit' || value.code === 'over_request_rate_limit_by_email') return 'Se alcanzó el límite de solicitudes. Espera unos minutos antes de intentarlo de nuevo.'
  switch (value.code) {
    case 'otp_expired': case 'otp_disabled': return 'El código no es válido o venció. Revísalo o solicita uno nuevo.'
    case 'weak_password': return 'La contraseña no cumple los requisitos. Prueba una más larga y combina letras, números y símbolos.'
    case 'email_address_invalid': case 'validation_failed': return 'Revisa el correo y los datos introducidos. Usa una dirección de correo válida.'
    case 'user_already_exists': case 'email_exists': return 'No pudimos completar el registro con este correo. Si ya tienes una cuenta, no necesitas registrarte otra vez.'
    case 'email_address_not_authorized': return 'El servicio de correo todavía no permite enviar a esta dirección. Revisa la configuración SMTP.'
    case 'signup_disabled': case 'email_provider_disabled': return 'El registro por correo no está disponible en este momento.'
    case 'unexpected_failure': case 'email_send_failed': return 'No pudimos enviar el correo. Inténtalo más tarde o revisa la configuración del servicio de correo.'
  }
  if (value.name === 'AuthRetryableFetchError' || value.name === 'TypeError') return 'No pudimos conectar con el servicio. Revisa tu conexión e inténtalo otra vez.'
  return 'No pudimos completar la solicitud. Inténtalo de nuevo en unos momentos.'
}
