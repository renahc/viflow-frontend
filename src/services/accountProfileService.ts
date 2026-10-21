import type { SupabaseClient } from '@supabase/supabase-js'

export function validateDisplayName(value: string): string {
  const name = value.trim()
  if (!name || name.length > 60) throw new Error('El nombre debe tener entre 1 y 60 caracteres.')
  return name
}

export function accountDisplayName(metadata: Record<string, unknown> | undefined): string {
  const name = metadata?.display_name
  return typeof name === 'string' && name.trim() && name.trim().length <= 60 ? name.trim() : ''
}

export function createAccountProfileService(auth: Pick<SupabaseClient['auth'], 'updateUser'>) {
  return {
    async saveName(value: string) {
      const name = validateDisplayName(value)
      const { data, error } = await auth.updateUser({ data: { display_name: name } })
      if (error) throw error
      if (!data.user || accountDisplayName(data.user.user_metadata) !== name) throw new Error('profile_update_failed')
      return name
    },
  }
}
