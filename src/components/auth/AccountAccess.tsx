import { Link } from 'react-router'
import { UserRoundPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
export function AccountAccess() {
  const { session, loading } = useAuth()
  const connected = Boolean(session?.user.email_confirmed_at)
  if (connected) return null
  return <Link className="auth-preview-entry" to="/auth/login">
    <UserRoundPlus size={16} aria-hidden="true" />
    <span>Iniciar sesión<small>{loading ? 'Comprobando sesión…' : 'O crea una cuenta'}</small></span>
  </Link>
}
