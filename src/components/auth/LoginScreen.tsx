import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ArrowLeft, ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useLogin } from '../../hooks/useLogin'

export function LoginScreen() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const blocked = login.busy || login.loading || !login.client || login.configurationError
  useEffect(() => {
    const previous = document.title
    document.title = 'Iniciar sesión · viflow'
    headingRef.current?.focus()
    return () => { document.title = previous }
  }, [])
  if (login.session?.user.email_confirmed_at) return <Navigate to="/" replace />

  return <div className="auth-preview-page">
    <header className="auth-page-header"><Link className="brand" to="/" aria-label="viflow, volver al espacio de trabajo">viflow<span className="brand-dot">.</span></Link><Link className="auth-back-link" to="/"><ArrowLeft size={15} aria-hidden="true" />Volver al tablero</Link></header>
    <main className="auth-preview-main">
      <section className="auth-panel" aria-labelledby="login-heading">
        <div className="auth-step"><span>Tu cuenta de viflow</span></div>
        <h1 ref={headingRef} tabIndex={-1} id="login-heading">Inicia sesión</h1>
        <p className="auth-intro">Introduce el correo y la contraseña de tu cuenta.</p>
        {login.configurationError && <p className="auth-error" role="alert">El inicio de sesión todavía no está configurado. Puedes seguir usando viflow sin cuenta.</p>}
        {login.sessionError && <p className="auth-error" role="alert">No pudimos recuperar tu sesión. Comprueba tu conexión y recarga la página.</p>}
        {login.loading && <p className="auth-feedback" role="status">Comprobando sesión…</p>}
        <form className="auth-form" aria-busy={login.busy} onSubmit={event => {
          event.preventDefault()
          if (blocked) return
          const submitted = password
          setPassword(''); setShowPassword(false)
          void login.login(email, submitted)
        }}>
          <label htmlFor="login-email">Correo electrónico</label>
          <input id="login-email" type="email" inputMode="email" autoComplete="username" required maxLength={254} placeholder="tu@correo.com" value={email} disabled={blocked} onChange={event => { setEmail(event.target.value); login.clearError() }} />
          <label htmlFor="login-password">Contraseña</label>
          <div className="auth-password-field"><input id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required value={password} disabled={blocked} aria-describedby={login.error ? 'login-error' : undefined} onChange={event => { setPassword(event.target.value); login.clearError() }} />
            <button type="button" disabled={blocked} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
          </div>
          <Link className="auth-text-button auth-forgot-link" to="/auth/recover">¿Olvidaste tu contraseña?</Link>
          {login.error && <p className="auth-error" id="login-error" role="alert">{login.error}</p>}
          {login.needsVerification && <Link className="auth-text-button" to="/auth/register" state={{ verificationEmail: email.trim() }}>Verificar mi correo</Link>}
          <button className="primary-button auth-submit" type="submit" disabled={blocked}>{login.busy ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Iniciando sesión…</> : <>Iniciar sesión<ArrowRight size={16} aria-hidden="true" /></>}</button>
        </form>
        <p className="auth-local-note">Accede a tus tableros guardados en la nube. Los tableros de invitado permanecen separados en este navegador.</p>
        <div className="auth-login-register">¿Todavía no tienes una cuenta?<Link to="/auth/register">Crear cuenta<ArrowRight size={14} aria-hidden="true" /></Link></div>
        <div className="auth-panel-footer">También puedes trabajar sin una cuenta.<Link to="/">Continuar en este navegador<ArrowRight size={14} aria-hidden="true" /></Link></div>
      </section>
    </main>
  </div>
}
