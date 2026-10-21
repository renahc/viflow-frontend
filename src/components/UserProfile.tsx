import { useAccountAvatar } from '../hooks/useAccountAvatar';
import { accountAvatarPath, avatarSaveError, createAccountAvatarService, validateAvatar } from '../services/accountAvatarService';
import { accountDisplayName } from '../services/accountProfileService';
import { useAuth } from '../hooks/useAuth';
import { registrationError } from '../services/registrationService';
import { Ellipsis, LogOut, Settings } from "lucide-react";
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

function Avatar({ profile }: { profile: Profile }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  return profile.photo && profile.photo !== failedPhoto
    ? <img className="avatar profile-photo" src={profile.photo} onError={() => setFailedPhoto(profile.photo)} alt={`Foto de ${profile.name}`} />
    : <span className="avatar" aria-label={`Perfil de ${profile.name}`}>{profile.name.trim().charAt(0).toUpperCase() || 'T'}</span>;
}

function ProfileSettings({ profile, account, hasPhoto, onClose, onSave }: { profile: Profile; account: boolean; hasPhoto: boolean; onClose: () => void; onSave: (profile: Profile, photo: File | null | undefined) => Promise<{ cleanupPending?: boolean } | void> }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(profile);
  const [photoChange, setPhotoChange] = useState<File | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const preview = account && photoChange === undefined ? { ...draft, photo: profile.photo } : draft;
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mounted = useRef(false);
  const [reading, setReading] = useState(false);
  const readVersion = useRef(0);

  useEffect(() => {
    mounted.current = true;
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { mounted.current = false; dialog?.close(); readVersion.current += 1; };
  }, []);

  async function readPhoto(file: File | undefined) {
    if (!file || savingRef.current) return;
    try { validateAvatar(file); }
    catch { setError("Elige una imagen PNG, JPG o WebP de hasta 1 MB."); return; }
    const version = ++readVersion.current;
    setReading(true);
    setError("");
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("read"));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = photo;
      await image.decode();
      if (version === readVersion.current) { setDraft(current => ({ ...current, photo })); setPhotoChange(file); }
    } catch {
      if (version === readVersion.current) setError("No pudimos abrir esta imagen. Prueba con otra.");
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  return <dialog ref={dialogRef} className="confirm-modal profile-settings" aria-labelledby="profile-settings-title"
    onCancel={event => { event.preventDefault(); if (!savingRef.current) onClose(); }}>
    <h2 id="profile-settings-title">Configuración del perfil</h2>
    <form aria-busy={saving} onSubmit={async event => {
      event.preventDefault();
      if (!draft.name.trim() || reading || savingRef.current) return;
      savingRef.current = true; setSaving(true); setError("");
      try {
        const result = await onSave({ ...draft, name: draft.name.trim() }, photoChange);
        if (mounted.current) {
          if (result?.cleanupPending) {
            setPhotoChange(undefined);
            setNotice('El perfil se guardó, pero no pudimos borrar la foto anterior del almacenamiento. Puedes cerrar esta ventana.');
          } else onClose();
        }
      } catch (error) {
        if (mounted.current) setError(account ? avatarSaveError(error) : "No pudimos guardar tu perfil. Revisa el espacio disponible del navegador e inténtalo de nuevo.");
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    }}>
      <div className="profile-photo-editor"><Avatar profile={preview} /><div>
        <label className="photo-label" htmlFor="profile-photo">Foto de perfil</label>
        <input id="profile-photo" disabled={saving} type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} />
        <small>PNG, JPG o WebP · Hasta 1 MB</small>
      </div></div>
      {(preview.photo || (account && hasPhoto && photoChange !== null)) && <button className="quiet-button" type="button" disabled={saving} onClick={() => { readVersion.current += 1; setReading(false); setDraft(current => ({ ...current, photo: "" })); setPhotoChange(null); setError(""); }}>Quitar foto</button>}
      {account && <p>Este nombre se mostrará en tu cuenta. No tiene que ser único.</p>}
      <label className="profile-name-label" htmlFor="profile-name">Nombre para mostrar</label>
      <input className="profile-name-input" id="profile-name" disabled={saving} autoFocus required maxLength={60} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
      {reading && <p role="status">Cargando imagen…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="confirm-modal-actions"><button className="modal-cancel" type="button" disabled={saving} onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!draft.name.trim() || reading || saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </dialog>;
}

export function UserProfile() {
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
      <Avatar profile={profile} />
      <div className="profile-identity"><strong title={profile.name}>{profile.name}</strong><small title={connected ? session?.user.email : undefined}>{connected ? session?.user.email : 'Perfil local'}</small></div>
      <button ref={triggerRef} className="profile-menu-trigger" type="button" aria-label="Opciones de usuario" aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen(current => !current)}><Ellipsis size={18} aria-hidden="true" /></button>
      {open && <div className="profile-menu" id="profile-options" aria-label="Opciones de usuario">
        <button type="button" onClick={() => { setOpen(false); setSettings(true); }}><Settings size={15} aria-hidden="true" />{connected && !name ? 'Completar perfil' : 'Configuración'}</button>
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
    {settings && <ProfileSettings key={connected ? session?.user.id : 'local'} profile={connected ? { ...profile, name } : profile} account={connected} hasPhoto={hasPhoto} onClose={closeSettings} onSave={async (next, photo) => {
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
