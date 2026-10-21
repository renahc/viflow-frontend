import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react'
import { useRegistration } from '../../hooks/useRegistration'

export function RegistrationScreen() {
  const registration = useRegistration()
  const { email, setEmail, verifying, confirmed, busy, loading, error, notice, cooldown, configurationError, sessionError } = registration
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = confirmed ? 'success' : verifying ? 'verify' : 'register'
  const blocked = Boolean(busy) || loading || configurationError || !registration.client
  useEffect(() => {
    const previous = document.title
    document.title = 'Crear cuenta · viflow'
    return () => { document.title = previous }
  }, [])
  useEffect(() => { headingRef.current?.focus() }, [step])

  return <div className="auth-preview-page">
    <header className="auth-page-header"><Link className="brand" to="/" aria-label="viflow, volver al espacio de trabajo">viflow<span className="brand-dot">.</span></Link><Link className="auth-back-link" to="/"><ArrowLeft size={15} aria-hidden="true" />Volver al tablero</Link></header>
    <main className="auth-preview-main">
      <section className="auth-panel" aria-labelledby="registration-heading">
        <div className="auth-step"><span>{confirmed ? 'Tu cuenta' : verifying ? '02 / Verificar correo' : '01 / Crear cuenta'}</span><span className="auth-step-dots" aria-hidden="true"><i className="active" /><i className={step !== 'register' ? 'active' : ''} /></span></div>
        {configurationError && <p className="auth-error" role="alert">El registro todavía no está configurado. Puedes seguir usando viflow sin cuenta.</p>}
        {sessionError && <p className="auth-error" role="alert">No pudimos recuperar tu sesión. Comprueba tu conexión y recarga la página.</p>}
        {loading && <p className="auth-feedback" role="status">Comprobando sesión…</p>}
        {confirmed ? <>
          <span className="auth-state-icon auth-success-icon"><Check size={25} aria-hidden="true" /></span>
          <h1 ref={headingRef} tabIndex={-1} id="registration-heading">Tu cuenta está lista</h1>
          <p className="auth-intro">Correo verificado: <strong>{registration.session?.user.email}</strong></p>
          <p className="auth-success-note">Tus tableros siguen guardándose en este navegador. La sincronización con tu cuenta estará disponible más adelante.</p>
          <Link className="primary-button auth-submit" to="/">Volver a mis tableros<ArrowRight size={16} aria-hidden="true" /></Link>
          <button className="auth-text-button auth-signout" type="button" disabled={Boolean(busy)} onClick={() => { setPassword(''); setCode(''); void registration.logout() }}>{busy === 'logout' ? 'Cerrando sesión…' : 'Cerrar sesión en este dispositivo'}</button>
          {error && <p className="auth-error" role="alert">{error}</p>}
        </> : verifying ? <>
          <span className="auth-state-icon"><Mail size={23} aria-hidden="true" /></span>
          <h1 ref={headingRef} tabIndex={-1} id="registration-heading">Verifica tu correo</h1>
          <p className="auth-intro">Revisa el correo de <strong>{email}</strong> e introduce el código de confirmación. Si ya tienes una cuenta verificada, no necesitas registrarte otra vez.</p>
          <button className="auth-text-button" type="button" disabled={Boolean(busy)} onClick={() => { setCode(''); setPassword(''); registration.changeEmail() }}>Usar otro correo</button>
          <form className="auth-form" aria-busy={Boolean(busy)} onSubmit={event => { event.preventDefault(); if (!blocked && /^\d{6,10}$/.test(code)) void registration.verify(code) }}>
            <label htmlFor="registration-code">Código de verificación</label>
            <input className="auth-code-input" id="registration-code" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10} placeholder="000000" value={code} disabled={blocked} aria-invalid={Boolean(error)} aria-describedby={`registration-code-hint${error ? ' registration-code-error' : ''}`} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 10)); registration.clearError() }} />
            <small id="registration-code-hint">Usa el código del correo más reciente. Nunca te pediremos que lo compartas por chat.</small>
            {error && <p id="registration-code-error" className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-feedback" role="status">{notice}</p>}
            <button className="primary-button auth-submit" type="submit" disabled={blocked || code.length < 6}>{busy === 'verify' ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Verificando…</> : 'Verificar correo'}</button>
          </form>
          <div className="auth-resend"><span>¿No recibiste el código?</span><button className="auth-text-button" type="button" disabled={blocked || cooldown > 0} onClick={() => { setCode(''); void registration.resend() }}>{busy === 'resend' ? 'Enviando…' : cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</button></div>
        </> : <>
          <h1 ref={headingRef} tabIndex={-1} id="registration-heading">Crea tu cuenta</h1>
          <p className="auth-intro">Regístrate con tu correo y confirma tu dirección con un código.</p>
          <form className="auth-form" aria-busy={Boolean(busy)} onSubmit={event => {
            event.preventDefault()
            if (blocked) return
            const submitted = password
            setPassword(''); setShowPassword(false)
            void registration.register(submitted)
          }}>
            <label htmlFor="registration-email">Correo electrónico</label>
            <input id="registration-email" type="email" inputMode="email" autoComplete="email" required maxLength={254} placeholder="tu@correo.com" disabled={blocked} value={email} onChange={event => { setEmail(event.target.value); registration.clearError() }} />
            <label htmlFor="registration-password">Contraseña</label>
            <div className="auth-password-field"><input id="registration-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Al menos 8 caracteres" value={password} disabled={blocked} aria-describedby="registration-password-hint" onChange={event => { setPassword(event.target.value); registration.clearError() }} />
              <button type="button" disabled={blocked} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
            </div>
            <small id="registration-password-hint">Al menos 8 caracteres. Combina letras, números y símbolos.</small>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={blocked} type="submit">{busy === 'register' ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Creando cuenta…</> : <>Crear cuenta<ArrowRight size={16} aria-hidden="true" /></>}</button>
          </form>
          <p className="auth-local-note">Por ahora, tus tableros permanecen en este navegador. Crear una cuenta no los sube a la nube.</p>
        </>}
        {!confirmed && <div className="auth-login-register">¿Ya tienes una cuenta?<Link to="/auth/login">Iniciar sesión<ArrowRight size={14} aria-hidden="true" /></Link></div>}
        {!confirmed && <div className="auth-panel-footer">Puedes seguir trabajando sin registrarte.<Link to="/">Continuar en este navegador<ArrowRight size={14} aria-hidden="true" /></Link></div>}
      </section>
    </main>
  </div>
}
