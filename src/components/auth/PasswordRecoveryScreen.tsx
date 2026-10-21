import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, LoaderCircle, Mail } from 'lucide-react'
import { usePasswordRecovery } from '../../hooks/usePasswordRecovery'

export function PasswordRecoveryScreen() {
  const recovery = usePasswordRecovery()
  const { step, busy, error, email, cooldown, notice } = recovery
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const headingRef = useRef<HTMLHeadingElement>(null)
  const blocked = Boolean(busy) || recovery.loading || !recovery.client
  const titles = { request: 'Recupera tu contraseña', verify: 'Revisa tu correo', password: 'Elige una contraseña nueva', success: 'Contraseña actualizada' }
  useEffect(() => {
    const previous = document.title
    document.title = 'Recuperar contraseña · viflow'
    return () => { document.title = previous }
  }, [])
  useEffect(() => { headingRef.current?.focus() }, [step])
  function clearFields() { setCode(''); setPassword(''); setConfirmation(''); setFormError(''); setShowPassword(false) }

  return <div className="auth-preview-page">
    <header className="auth-page-header"><Link className="brand" to="/" aria-label="viflow, volver al espacio de trabajo">viflow<span className="brand-dot">.</span></Link><Link className="auth-back-link" to="/auth/login"><ArrowLeft size={15} aria-hidden="true" />Volver a iniciar sesión</Link></header>
    <main className="auth-preview-main"><section className="auth-panel" aria-labelledby="recovery-heading">
      <div className="auth-step"><span>{step === 'request' ? '01 / Solicitar código' : step === 'verify' ? '02 / Verificar código' : step === 'password' ? '03 / Nueva contraseña' : 'Recuperación completada'}</span></div>
      {(step === 'verify' || step === 'success') && <span className={`auth-state-icon ${step === 'success' ? 'auth-success-icon' : ''}`}>{step === 'success' ? <Check size={25} aria-hidden="true" /> : <Mail size={23} aria-hidden="true" />}</span>}
      <h1 ref={headingRef} tabIndex={-1} id="recovery-heading">{titles[step]}</h1>
      {recovery.configurationError && <p className="auth-error" role="alert">La recuperación todavía no está configurada. Puedes seguir usando viflow sin cuenta.</p>}
      {recovery.sessionError && <p className="auth-error" role="alert">No pudimos recuperar la conexión con tu sesión. Recarga la página para intentarlo otra vez.</p>}
      {recovery.loading && <p className="auth-feedback" role="status">Preparando recuperación…</p>}
      {step === 'request' && <>
        <p className="auth-intro">Te enviaremos un código para que puedas elegir una contraseña nueva.</p>
        <form className="auth-form" aria-busy={Boolean(busy)} onSubmit={event => { event.preventDefault(); if (!blocked) { clearFields(); void recovery.requestCode() } }}>
          <label htmlFor="recovery-email">Correo electrónico</label>
          <input id="recovery-email" type="email" autoComplete="email" inputMode="email" required maxLength={254} placeholder="tu@correo.com" value={email} disabled={blocked} onChange={event => { recovery.setEmail(event.target.value); recovery.clearError() }} />
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={blocked || cooldown > 0}>{busy === 'request' ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Enviando…</> : cooldown ? `Solicitar en ${cooldown} s` : <>Enviar código<ArrowRight size={16} aria-hidden="true" /></>}</button>
        </form>
      </>}
      {step === 'verify' && <>
        <p className="auth-intro">Si existe una cuenta asociada a <strong>{email}</strong>, recibirás un código. Usa el del correo más reciente.</p>
        <button className="auth-text-button" type="button" disabled={Boolean(busy)} onClick={() => { clearFields(); recovery.restart() }}>Usar otro correo</button>
        <form className="auth-form" aria-busy={Boolean(busy)} onSubmit={event => { event.preventDefault(); if (!blocked && /^\d{6,10}$/.test(code)) { const submitted = code; setCode(''); void recovery.verifyCode(submitted) } }}>
          <label htmlFor="recovery-code">Código de recuperación</label>
          <input id="recovery-code" className="auth-code-input" type="text" inputMode="numeric" autoComplete="one-time-code" required pattern="[0-9]{6,10}" maxLength={10} placeholder="000000" disabled={blocked} value={code} aria-invalid={Boolean(error)} aria-describedby={error ? 'recovery-error' : undefined} onChange={event => { setCode(event.target.value.replace(/\D/g, '').slice(0, 10)); recovery.clearError() }} />
          {error && <p id="recovery-error" className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-feedback" role="status">{notice}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={blocked || code.length < 6}>{busy === 'verify' ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Verificando…</> : 'Verificar código'}</button>
        </form>
        <div className="auth-resend"><span>¿No recibiste el código?</span><button type="button" className="auth-text-button" disabled={blocked || cooldown > 0} onClick={() => { setCode(''); void recovery.requestCode() }}>{busy === 'request' ? 'Enviando…' : cooldown ? `Reenviar en ${cooldown} s` : 'Reenviar código'}</button></div>
      </>}
      {step === 'password' && <>
        <p className="auth-intro">El correo fue verificado. Introduce una contraseña nueva para <strong>{email}</strong>.</p>
        <form className="auth-form" aria-busy={Boolean(busy)} onSubmit={event => {
          event.preventDefault()
          if (blocked) return
          if (password !== confirmation) { setFormError('Las contraseñas no coinciden.'); return }
          const submitted = password
          clearFields(); void recovery.updatePassword(submitted)
        }}>
          <label htmlFor="recovery-password">Nueva contraseña</label>
          <div className="auth-password-field"><input id="recovery-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} placeholder="Al menos 8 caracteres" disabled={blocked} value={password} onChange={event => { setPassword(event.target.value); setFormError(''); recovery.clearError() }} />
            <button type="button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} disabled={blocked} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}</button>
          </div>
          <label htmlFor="recovery-confirmation">Confirmar nueva contraseña</label>
          <input id="recovery-confirmation" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={blocked} value={confirmation} aria-invalid={Boolean(formError)} aria-describedby={formError ? 'recovery-match-error' : undefined} onChange={event => { setConfirmation(event.target.value); setFormError('') }} />
          {formError && <p id="recovery-match-error" className="auth-error" role="alert">{formError}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button auth-submit" disabled={blocked}>{busy === 'update' ? <><LoaderCircle className="auth-spinner" size={16} aria-hidden="true" />Guardando…</> : 'Guardar nueva contraseña'}</button>
        </form>
        <button className="auth-text-button auth-signout" type="button" disabled={Boolean(busy)} onClick={() => { clearFields(); recovery.restart() }}>Solicitar otro código</button>
      </>}
      {step === 'success' && <>
        <p className="auth-intro">Ya puedes usar tu nueva contraseña. Tu sesión está activa en este dispositivo.</p>
        <Link className="primary-button auth-submit" to="/">Volver a mis tableros<ArrowRight size={16} aria-hidden="true" /></Link>
        <p className="auth-local-note">Puedes cerrar sesión desde el menú del perfil para probar tu contraseña nueva. Tus tableros locales se conservan.</p>
      </>}
      {step !== 'success' && <div className="auth-panel-footer"><Link to="/auth/login">Volver a iniciar sesión<ArrowRight size={14} aria-hidden="true" /></Link><Link to="/">Continuar sin cuenta<ArrowRight size={14} aria-hidden="true" /></Link></div>}
    </section></main>
  </div>
}
