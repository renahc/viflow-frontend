import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { ArrowLeft, ArrowUpRight, Check, ChevronRight, Eye, EyeOff, Fingerprint, LoaderCircle, LogOut, Mail, Monitor, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useAccountAvatar } from '../../hooks/useAccountAvatar'
import { accountDisplayName } from '../../services/accountProfileService'
import { accountAvatarPath, createAccountAvatarService } from '../../services/accountAvatarService'
import { createAccountSecurityService, accountSecurityError } from '../../services/accountSecurityService'
import { registrationError } from '../../services/registrationService'
import { ProfileAvatar, ProfileEditor } from '../ProfileEditor'

function SecurityForm({ userId }: { userId: string }) {
  const { client } = useAuth()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const operation = useRef({ busy: false, version: 0 })
  useEffect(() => { const state = operation.current; return () => { state.version++; state.busy = false } }, [])
  return <form className="settings-security-form" aria-busy={busy} onSubmit={async event => {
    event.preventDefault()
    if (!client || operation.current.busy) return
    setError(''); setNotice('')
    if (password !== confirmation) { setError('Las contraseñas nuevas no coinciden.'); return }
    if (password === current) { setError('Elige una contraseña diferente de la actual.'); return }
    operation.current.busy = true
    const version = ++operation.current.version
    setBusy(true)
    const submitted = { current, password }
    setCurrent(''); setPassword(''); setConfirmation(''); setVisible(false)
    try {
      await createAccountSecurityService(client.auth).changePassword(userId, submitted.current, submitted.password)
      if (version === operation.current.version) setNotice('Tu contraseña se actualizó correctamente.')
    } catch (error) { if (version === operation.current.version) setError(accountSecurityError(error)) }
    finally { if (version === operation.current.version) { operation.current.busy = false; setBusy(false) } }
  }}>
    <div className="settings-field"><label htmlFor="settings-current">Contraseña actual</label><input id="settings-current" type={visible ? 'text' : 'password'} autoComplete="current-password" required maxLength={128} disabled={busy} value={current} onChange={event => setCurrent(event.target.value)} /></div>
    <div className="settings-field-pair">
      <div className="settings-field"><label htmlFor="settings-password">Nueva contraseña</label><input id="settings-password" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} value={password} onChange={event => setPassword(event.target.value)} /></div>
      <div className="settings-field"><label htmlFor="settings-confirm">Confirmar contraseña</label><input id="settings-confirm" type={visible ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={128} required disabled={busy} value={confirmation} onChange={event => setConfirmation(event.target.value)} /></div>
    </div>
    <div className="settings-password-hint"><small>Usa al menos 8 caracteres. Combina letras, números y símbolos.</small><button type="button" disabled={busy} aria-pressed={visible} onClick={() => setVisible(value => !value)}>{visible ? <EyeOff size={15} /> : <Eye size={15} />}{visible ? 'Ocultar' : 'Mostrar'}</button></div>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {notice && <p className="settings-feedback" role="status"><Check size={16} />{notice}</p>}
    <div className="settings-form-footer"><Link to="/auth/recover">¿Olvidaste tu contraseña?<ArrowUpRight size={14} /></Link><button className="primary-button" disabled={busy} type="submit">{busy && <LoaderCircle className="auth-spinner" size={15} />}{busy ? 'Actualizando…' : 'Actualizar contraseña'}</button></div>
  </form>
}

export function AccountSettingsScreen() {
  const { session, client, loading, sessionError, configurationError } = useAuth()
  const photo = useAccountAvatar()
  const navigate = useNavigate()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const logoutBusy = useRef(false)
  useEffect(() => { const title = document.title; document.title = 'Configuración de cuenta · viflow'; return () => { document.title = title } }, [])
  const user = session?.user.email_confirmed_at ? session.user : null
  const name = accountDisplayName(user?.user_metadata)
  const profile = { name, photo }
  const sections = [{ id: 'perfil', label: 'Mi perfil', icon: UserRound }, { id: 'seguridad', label: 'Seguridad', icon: ShieldCheck }, { id: 'sesion', label: 'Sesión', icon: Monitor }]
  return <div className="account-settings-page">
    <header className="settings-topbar"><Link className="brand" to="/">viflow<span className="brand-dot">.</span></Link><Link className="settings-back" to="/"><ArrowLeft size={16} />Volver al tablero</Link></header>
    <div className="settings-layout">
      <aside className="settings-sidebar"><span className="settings-eyebrow">TU ESPACIO PERSONAL</span><h1>Configuración</h1><p>Un espacio que se siente tuyo.</p><nav aria-label="Secciones de configuración">{sections.map(({ id, label, icon: Icon }) => <a key={id} href={`#${id}`} aria-current={(location.hash || '#perfil') === `#${id}` ? 'location' : undefined}><Icon size={18} /><span>{label}</span><ChevronRight size={14} /></a>)}</nav><div className="settings-sidebar-note"><Sparkles size={20} /><p>Pequeños detalles.<br />Una experiencia más tuya.</p></div></aside>
      <main className="settings-content">
        {loading ? <div className="settings-empty" role="status"><LoaderCircle className="auth-spinner" />Preparando tu cuenta…</div> : !user ? <div className="settings-empty"><UserRound size={32} /><h2>Tu cuenta, a tu manera</h2><p>{sessionError || configurationError ? 'No pudimos conectar con tu cuenta. Revisa tu conexión o recarga la página.' : 'Inicia sesión para personalizar tu perfil y administrar tu seguridad.'}</p><Link className="primary-button" to="/auth/login">Iniciar sesión</Link><Link to="/">Continuar sin cuenta</Link></div> : <>
          <div className="settings-page-intro"><span className="settings-eyebrow">CONFIGURACIÓN DE CUENTA</span><h2>Los detalles hacen la diferencia<span>.</span></h2><p>Cuida tu perfil y mantén tu cuenta a tu gusto.</p></div>
          <section id="perfil" className="settings-card"><div className="settings-profile-banner"><span>HECHO A TU MANERA</span><div aria-hidden="true" className="settings-orbit" /></div><div className="settings-profile-summary"><ProfileAvatar profile={{ name: name || 'Tu cuenta', photo }} /><div><h2>{name || 'Completa tu perfil'}</h2><span><Check size={12} />Cuenta verificada</span></div></div><div className="settings-card-body"><div className="settings-section-heading"><span className="settings-section-icon"><UserRound size={19} /></span><div><h3>Mi perfil</h3><p>Así te verás en viflow.</p></div></div><ProfileEditor key={user.id} embedded account profile={profile} hasPhoto={Boolean(accountAvatarPath(user.id, user.user_metadata))} onClose={() => { void navigate('/') }} onSave={async (next, image) => {
            if (!client) throw new Error('session_missing')
            return createAccountAvatarService(client).save(user.id, next.name, image)
          }} /></div></section>
          <section id="seguridad" className="settings-card"><div className="settings-card-body"><div className="settings-section-heading"><span className="settings-section-icon"><Fingerprint size={21} /></span><div><h3>Seguridad</h3><p>Una contraseña solo para ti.</p></div><span className="settings-subtle-badge"><ShieldCheck size={13} />Acceso protegido</span></div><SecurityForm key={user.id} userId={user.id} /></div></section>
          <section id="sesion" className="settings-card"><div className="settings-card-body"><div className="settings-section-heading"><span className="settings-section-icon"><Monitor size={20} /></span><div><h3>Tu sesión</h3><p>Conectado, con el control en tus manos.</p></div></div><div className="settings-email-row"><span className="settings-mail-icon"><Mail size={19} /></span><div><small>Correo electrónico</small><strong>{user.email}</strong></div><span className="settings-verified"><Check size={13} />Verificado</span></div><div className="settings-session-row"><div><strong>Este navegador</strong><p>Cierra tu sesión aquí cuando lo necesites.</p></div><button type="button" className="settings-logout" disabled={busy} onClick={async () => {
            if (!client || logoutBusy.current) return
            logoutBusy.current = true; setBusy(true); setError('')
            try { const { error } = await client.auth.signOut({ scope: 'local' }); if (error) throw error; void navigate('/') }
            catch (error) { setError(registrationError(error)) }
            finally { logoutBusy.current = false; setBusy(false) }
          }}><LogOut size={15} />{busy ? 'Cerrando…' : 'Cerrar sesión'}</button></div>{error && <p role="alert" className="auth-error">{error}</p>}<p className="settings-storage-note">Tus tableros siguen guardados en este navegador, incluso después de cerrar sesión.</p></div></section>
          <footer className="settings-footer">Solo tú, tus ideas y un poco de flow.<Sparkles size={14} /></footer>
        </>}
      </main>
    </div>
  </div>
}
