import type { SupabaseClient } from '@supabase/supabase-js'
import { validateDisplayName } from './accountProfileService.ts'

export const avatarBucket = 'account-avatars'
const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }
export const avatarMaxBytes = 1024 * 1024

export function validateAvatar(file: Pick<File, 'type' | 'size'>) {
  if (!extensions[file.type] || file.size <= 0 || file.size > avatarMaxBytes) {
    throw new Error('Elige una imagen PNG, JPG o WebP de hasta 1 MB.')
  }
}

export function accountAvatarPath(userId: string, metadata?: Record<string, unknown>): string {
  const path = metadata?.avatar_path
  if (typeof path !== 'string') return ''
  const parts = path.split('/')
  return parts.length === 2 && parts[0] === userId && /^[a-f0-9-]+\.(png|jpg|webp)$/.test(parts[1]) ? path : ''
}

type Client = Pick<SupabaseClient, 'auth' | 'storage'>
export function createAccountAvatarService(client: Client) {
  const bucket = client.storage.from(avatarBucket)
  async function removeUnused(path: string): Promise<boolean> {
    try { const { error } = await bucket.remove([path]); return !error } catch { return false }
  }
  return {
    // undefined keeps the current photo; null removes it; a File replaces it.
    async save(userId: string, displayName: string, photo: File | null | undefined) {
      const name = validateDisplayName(displayName)
      if (photo) validateAvatar(photo)
      const { data: current, error: sessionError } = await client.auth.getUser()
      if (sessionError) throw sessionError
      if (!current.user?.email_confirmed_at || current.user.id !== userId) throw new Error('session_missing')
      const previousPath = accountAvatarPath(userId, current.user.user_metadata)
      let nextPath = previousPath
      let uploadedPath = ''
      if (photo) {
        nextPath = `${userId}/${crypto.randomUUID()}.${extensions[photo.type]}`
        const { error } = await bucket.upload(nextPath, photo, { contentType: photo.type, upsert: false })
        if (error) throw error
        uploadedPath = nextPath
      } else if (photo === null) nextPath = ''
      try {
        // Recheck after upload in case the user signed out or changed accounts.
        const { data: checked, error: checkError } = await client.auth.getUser()
        if (checkError) throw checkError
        if (checked.user?.id !== userId) throw new Error('session_missing')
        const metadata: Record<string, string | null> = { display_name: name }
        if (photo !== undefined) metadata.avatar_path = nextPath || null
        const { data, error } = await client.auth.updateUser({ data: metadata })
        if (error) throw error
        if (data.user?.id !== userId) throw new Error('profile_update_failed')
      } catch (error) {
        if (uploadedPath) await removeUnused(uploadedPath)
        throw error
      }
      // Only remove the old object after the new profile was saved successfully.
      const cleanupPending = Boolean(photo !== undefined && previousPath && previousPath !== nextPath && !await removeUnused(previousPath))
      return { cleanupPending }
    },
    async load(userId: string, path: string) {
      if (!accountAvatarPath(userId, { avatar_path: path })) throw new Error('invalid_avatar_path')
      const { data, error } = await bucket.download(path)
      if (error) throw error
      return data
    },
  }
}

export function avatarSaveError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'message' in error ? String(error.message) : ''
  if (/bucket not found/i.test(code)) return 'Falta configurar el almacenamiento de fotos en Supabase. Ejecuta el SQL de account-avatars.'
  if (code === 'session_missing') return 'Tu sesión cambió. Cierra esta ventana e inicia sesión de nuevo.'
  return 'No pudimos guardar el perfil. Revisa tu conexión y los permisos del almacenamiento e inténtalo de nuevo.'
}
