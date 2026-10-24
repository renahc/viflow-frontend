import { useNavigate } from 'react-router';
import { ProfileAvatar, ProfileEditor } from './ProfileEditor';
import { useAccountAvatar } from '../hooks/useAccountAvatar';
import { accountAvatarPath, createAccountAvatarService } from '../services/accountAvatarService';
import { accountDisplayName } from '../services/accountProfileService';
import { useAuth } from '../hooks/useAuth';
import { registrationError } from '../services/registrationService';
import type { useBoard } from '../hooks/useBoard';
import { CloudCheck, CloudUpload, CloudAlert, LoaderCircle, RefreshCw, Ellipsis, LogOut, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Profile = { name: string; photo: string };
const storageKey = "viflow.profile.v1";
const emptyProfile: Profile = { name: "Tu usuario", photo: "" };
const photoPattern = /^data:image\/(png|jpeg|webp);base64,/;

function loadProfile(): Profile {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (typeof stored === "object" && stored !== null) {
      const profile = stored as Record<string, unknown>;
      if (typeof profile.name === "string" && profile.name.trim() && typeof profile.photo === "string"
        && (!profile.photo || photoPattern.test(profile.photo))) {
        return { name: profile.name, photo: profile.photo };
      }
    }
  } catch { /* The default profile remains usable without storage. */ }
  return emptyProfile;
}


export function UserProfile({ sync }: { sync?: ReturnType<typeof useBoard>['sync'] } = {}) {
  const navigate = useNavigate();
  const { client, session } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [localProfile, setProfile] = useState(loadProfile);
  const connected = Boolean(session?.user.email_confirmed_at);
  const name = accountDisplayName(session?.user.user_metadata);
  const accountPhoto = useAccountAvatar();
  const hasPhoto = Boolean(session && accountAvatarPath(session.user.id, session.user.user_metadata));
  const profile = connected ? { name: name || 'Tu cuenta', photo: accountPhoto } : localProfile;
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOutside(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open]);

  function closeSettings() {
    setSettings(false);
    triggerRef.current?.focus();
  }

  return <>
    <div className="profile" ref={containerRef} onKeyDown={event => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <ProfileAvatar profile={profile} />
      <div className="profile-identity"><div className="profile-name-row"><strong title={profile.name}>{profile.name}</strong>{sync && <span className={`profile-cloud-status ${sync.phase === 'error' ? 'has-error' : ''}`} role="status" aria-label={sync.phase === 'ready' ? 'Guardado en tu cuenta' : sync.phase === 'saving' ? 'Guardando en tu cuenta' : sync.phase === 'loading' ? 'Cargando tus tableros' : 'Hay cambios sin sincronizar'} title={sync.phase === 'ready' ? 'Todos tus cambios están guardados en tu cuenta' : sync.phase === 'saving' ? 'Guardando cambios…' : sync.phase === 'loading' ? 'Cargando tableros…' : sync.message}>
        {sync.phase === 'ready' ? <CloudCheck size={15} aria-hidden="true" /> : sync.phase === 'saving' ? <CloudUpload size={15} aria-hidden="true" /> : sync.phase === 'loading' ? <LoaderCircle size={15} className="auth-spinner" aria-hidden="true" /> : <CloudAlert size={15} aria-hidden="true" />}
      </span>}</div><small title={connected ? session?.user.email : undefined}>{connected ? session?.user.email : 'Perfil local'}</small></div>
      <button ref={triggerRef} className="profile-menu-trigger" type="button" aria-label="Opciones de usuario" aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen(current => !current)}><Ellipsis size={18} aria-hidden="true" /></button>
      {open && <div className="profile-menu" id="profile-options" aria-label="Opciones de usuario">
        <button type="button" onClick={() => { setOpen(false); if (connected) void navigate('/settings'); else setSettings(true); }}><Settings size={15} aria-hidden="true" />{connected && !name ? 'Completar perfil' : 'Configuración'}</button>
        {sync && <button type="button" disabled={sync.phase !== 'ready'} onClick={() => { setOpen(false); sync.reload(); }}><RefreshCw size={15} aria-hidden="true" />Actualizar tableros</button>}
        <button type="button" disabled={!session || !client || loggingOut} aria-describedby={!session ? "logout-description" : undefined} onClick={async () => {
          if (!client || loggingOut) return;
          setLoggingOut(true); setLogoutError("");
          try {
            const { error } = await client.auth.signOut({ scope: 'local' });
            if (error) throw error;
            setOpen(false);
          } catch (error) { setLogoutError(registrationError(error)); }
          finally { setLoggingOut(false); }
        }}><LogOut size={15} aria-hidden="true" />{loggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</button>
        {!session && <small id="logout-description">Estás usando el perfil local, sin una sesión conectada.</small>}
        {logoutError && <small role="alert">{logoutError}</small>}
      </div>}
    </div>
    {settings && <ProfileEditor key={connected ? session?.user.id : 'local'} profile={connected ? { ...profile, name } : profile} account={connected} hasPhoto={hasPhoto} onClose={closeSettings} onSave={async (next, photo) => {
      if (connected) {
        if (!client) throw new Error('session_missing');
        return await createAccountAvatarService(client).save(session!.user.id, next.name, photo);
      } else {
        localStorage.setItem(storageKey, JSON.stringify(next));
        setProfile(next);
      }
    }} />}
  </>;
}
