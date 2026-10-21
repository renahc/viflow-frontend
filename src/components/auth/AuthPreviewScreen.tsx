import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react'

type View = 'register' | 'verify' | 'success'
type Status = 'idle' | 'loading' | 'error' | 'expired' | 'resent'

// A design-only flow: no requests, credentials, sessions, or persistent data.
export function AuthPreviewScreen() {
  const [view, setView] = useState<View>('register')
  const [status, setStatus] = useState<Status>('idle')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const pending = status === 'loading'

  useEffect(() => {
    const previous = document.title
    document.title = 'Crear cuenta · Vista previa · viflow'
    return () => { document.title = previous }
  }, [])
  useEffect(() => { headingRef.current?.focus() }, [view])
  useEffect(() => {
    if (!cooldown) return
    const timer = window.setTimeout(() => setCooldown(current => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  function changeView(next: View) {
    setPassword(''); setShowPassword(false); setCode(''); setError(''); setStatus('idle'); setCooldown(0); setView(next)
  }
  function preview(nextView: View, nextStatus: Status) {
    changeView(nextView)
    setStatus(nextStatus)
    if (nextView !== 'register' && !email.trim()) setEmail('tu@ejemplo.com')
    if (nextStatus === 'error') setError(nextView === 'register' ? 'No pudimos continuar. Inténtalo de nuevo en unos momentos.' : 'El código no es correcto. Revísalo e inténtalo de nuevo.')
    if (nextStatus === 'expired') setError('Este código venció. Solicita uno nuevo para continuar.')
    if (nextStatus === 'resent') setCooldown(30)
  }

  return <div className="auth-preview-page">
    <header className="auth-page-header"><Link className="brand" to="/" aria-label="viflow, volver al espacio de trabajo">viflow<span className="brand-dot">.</span></Link><Link className="auth-back-link" to="/"><ArrowLeft size={15} aria-hidden="true" />Volver al tablero</Link></header>
    <main className="auth-preview-main">
      <div className="auth-preview-notice"><span>Vista previa de diseño</span><p>Usa datos de prueba. No se crean cuentas ni se envían correos.</p></div>
      <section className="auth-panel" aria-labelledby="auth-heading">
        <div className="auth-step"><span>{view === 'success' ? 'Recorrido completado' : view === 'register' ? '01 / Crear cuenta' : '02 / Verificar correo'}</span><span className="auth-step-dots" aria-hidden="true"><i className="active" /><i className={view !== 'register' ? 'active' : ''} /></span></div>
        {view === 'register' ? <>
          <h1 ref={headingRef} tabIndex={-1} id="auth-heading">Crea tu cuenta</h1>
          <p className="auth-intro">Un espacio para tus tableros, también cuando cambias de dispositivo.</p>
          <form className="auth-form" aria-busy={pending} onSubmit={event => {
            event.preventDefault()
            if (pending) return
            if (!email.trim() || password.length < 8) { setError('Introduce un correo válido y una contraseña de al menos 8 caracteres.'); return }
            setEmail(email.trim()); changeView('verify')
          }}>
            <label htmlFor="auth-email">Correo electrónico</label>
            <input id="auth-email" type="email" inputMode="email" autoComplete="off" required maxLength={254} placeholder="tu@ejemplo.com" value={email} disabled={pending} onChange={event => { setEmail(event.target.value); setError(''); setStatus('idle') }} />
            <label htmlFor="auth-password">Contraseña</label>
            <div className="auth-password-field"><input id="auth-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Al menos 8 caracteres" value={password} disabled={pending} aria-describedby="auth-password-hint" onChange={event => { setPassword(event.target.value); setError(''); setStatus('idle') }} />
              <button type="button" disabled={pending} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
            </div>
            <small id="auth-password-hint">Usa una contraseña de ejemplo para esta demostración.</small>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="primary-button auth-submit" disabled={pending} type="submit">{pending ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Creando cuenta…</> : <>Continuar<ArrowRight size={16} aria-hidden="true" /></>}</button>
          </form>
          <div className="auth-panel-footer">¿Prefieres comenzar sin cuenta?<Link to="/">Continuar en este navegador<ArrowRight size={14} aria-hidden="true" /></Link></div>
        </> : view === 'verify' ? <>
          <span className="auth-state-icon"><Mail size={23} aria-hidden="true" /></span>
          <h1 ref={headingRef} tabIndex={-1} id="auth-heading">Verifica tu correo</h1>
          <p className="auth-intro">Aquí recibirás un código de verificación para <strong>{email.trim()}</strong>.</p>
          <button className="auth-text-button" type="button" disabled={pending} onClick={() => changeView('register')}>Cambiar correo</button>
          <form className="auth-form" aria-busy={pending} onSubmit={event => {
            event.preventDefault()
            if (pending) return
            if (code === '123456') { changeView('success'); return }
            setStatus(code === '999999' ? 'expired' : 'error')
            setError(code === '999999' ? 'Este código venció. Solicita uno nuevo para continuar.' : 'El código no es correcto. Revísalo e inténtalo de nuevo.')
          }}>
            <label htmlFor="auth-code">Código de verificación</label>
            <input className="auth-code-input" id="auth-code" type="text" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" value={code} disabled={pending} aria-invalid={status === 'error' || status === 'expired'} aria-describedby={`auth-code-hint${error ? ' auth-code-error' : ''}`} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 6)); if (status !== 'expired') { setError(''); setStatus('idle') } }} />
            <small id="auth-code-hint">En esta vista previa, usa <strong>123456</strong>. No se envió ningún correo.</small>
            {error && <p id="auth-code-error" className="auth-error" role="alert">{error}</p>}
            {status === 'resent' && <p className="auth-feedback" role="status">Reenvío simulado. Puedes probar otra vez con 123456.</p>}
            <button className="primary-button auth-submit" type="submit" disabled={pending || code.length !== 6 || status === 'expired'}>{pending ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Verificando…</> : 'Verificar correo'}</button>
          </form>
          <div className="auth-resend"><span>¿No recibiste el código?</span><button className="auth-text-button" type="button" disabled={pending || cooldown > 0} onClick={() => { setCode(''); setError(''); setStatus('resent'); setCooldown(30) }}>{cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</button></div>
        </> : <>
          <span className="auth-state-icon auth-success-icon"><Check size={25} aria-hidden="true" /></span>
          <h1 ref={headingRef} tabIndex={-1} id="auth-heading">Todo listo</h1>
          <p className="auth-intro">Así se verá la confirmación después de verificar tu correo.</p>
          <p className="auth-success-note">Terminaste la demostración. Tu perfil y tus tableros locales siguen igual; todavía no hay una cuenta conectada.</p>
          <Link className="primary-button auth-submit" to="/">Volver a mis tableros<ArrowRight size={16} aria-hidden="true" /></Link>
        </>}
      </section>
      <details className="auth-preview-controls"><summary>Revisar estados del diseño</summary><p>Estos controles simulan los estados que conectaremos al servicio de autenticación.</p>
        <div className="auth-preview-state-buttons">
          <button type="button" onClick={() => preview('register', 'idle')}>Registro</button>
          <button type="button" onClick={() => preview('register', 'loading')}>Registro: cargando</button>
          <button type="button" onClick={() => preview('register', 'error')}>Registro: error</button>
          <button type="button" onClick={() => preview('verify', 'idle')}>Verificación</button>
          <button type="button" onClick={() => preview('verify', 'loading')}>Verificación: cargando</button>
          <button type="button" onClick={() => preview('verify', 'error')}>Código incorrecto</button>
          <button type="button" onClick={() => preview('verify', 'expired')}>Código vencido</button>
          <button type="button" onClick={() => preview('verify', 'resent')}>Código reenviado</button>
          <button type="button" onClick={() => preview('success', 'idle')}>Confirmación</button>
        </div>
      </details>
    </main>
  </div>
}
