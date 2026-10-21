import { Link } from 'react-router'
import { UserRound, UserRoundPlus } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
export function AccountAccess() {
  const { session, loading } = useAuth()
  const connected = Boolean(session?.user.email_confirmed_at)
  return <Link className="auth-preview-entry" to={connected ? '/auth/register' : '/auth/login'}>
    {connected ? <UserRound size={16} aria-hidden="true" /> : <UserRoundPlus size={16} aria-hidden="true" />}
    <span>{connected ? 'Tu cuenta' : 'Iniciar sesión'}<small>{loading ? 'Comprobando sesión…' : connected ? session?.user.email : 'O crea una cuenta'}</small></span>
  </Link>
}
