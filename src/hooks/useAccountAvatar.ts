import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { accountAvatarPath, createAccountAvatarService } from '../services/accountAvatarService'

export function useAccountAvatar() {
  const { client, session } = useAuth()
  const userId = session?.user.email_confirmed_at ? session.user.id : ''
  const path = accountAvatarPath(userId, session?.user.user_metadata)
  const key = `${userId}:${path}`
  const [image, setImage] = useState({ key: '', url: '' })
  useEffect(() => {
    if (!client || !userId || !path) return
    let active = true
    let objectUrl = ''
    void createAccountAvatarService(client).load(userId, path).then(blob => {
      if (!active) return
      objectUrl = URL.createObjectURL(blob)
      setImage({ key, url: objectUrl })
    }).catch(() => { if (active) setImage({ key, url: '' }) })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [client, userId, path, key])
  return image.key === key ? image.url : ''
}
