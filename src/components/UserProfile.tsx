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
  return profile.photo
    ? <img className="avatar profile-photo" src={profile.photo} alt={`Foto de ${profile.name}`} />
    : <span className="avatar" aria-label={`Perfil de ${profile.name}`}>{profile.name.trim().charAt(0).toUpperCase()}</span>;
}

function ProfileSettings({ profile, onClose, onSave }: { profile: Profile; onClose: () => void; onSave: (profile: Profile) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(profile);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const readVersion = useRef(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => { dialog?.close(); readVersion.current += 1; };
  }, []);

  async function readPhoto(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 1024 * 1024) {
      setError("Elige una imagen PNG, JPG o WebP de hasta 1 MB.");
      return;
    }
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
      if (version === readVersion.current) setDraft(current => ({ ...current, photo }));
    } catch {
      if (version === readVersion.current) setError("No pudimos abrir esta imagen. Prueba con otra.");
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  }

  return <dialog ref={dialogRef} className="confirm-modal profile-settings" aria-labelledby="profile-settings-title"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="profile-settings-title">Configuración del perfil</h2>
    <form onSubmit={event => {
      event.preventDefault();
      if (!draft.name.trim() || reading) return;
      const nextProfile = { ...draft, name: draft.name.trim() };
      try {
        localStorage.setItem(storageKey, JSON.stringify(nextProfile));
        onSave(nextProfile);
      } catch { setError("No pudimos guardar tu perfil. Revisa el espacio disponible del navegador e inténtalo de nuevo."); }
    }}>
      <div className="profile-photo-editor"><Avatar profile={draft} /><div>
        <label className="photo-label" htmlFor="profile-photo">Foto de perfil</label>
        <input id="profile-photo" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} />
        <small>PNG, JPG o WebP · Hasta 1 MB</small>
      </div></div>
      {draft.photo && <button className="quiet-button" type="button" onClick={() => { readVersion.current += 1; setReading(false); setDraft(current => ({ ...current, photo: "" })); }}>Quitar foto</button>}
      <label className="profile-name-label" htmlFor="profile-name">Nombre de usuario</label>
      <input className="profile-name-input" id="profile-name" autoFocus required maxLength={60} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
      {reading && <p role="status">Cargando imagen…</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="confirm-modal-actions"><button className="modal-cancel" type="button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!draft.name.trim() || reading}>Guardar cambios</button></div>
    </form>
  </dialog>;
}

export function UserProfile() {
  const { client, session } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [profile, setProfile] = useState(loadProfile);
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
      <div className="profile-identity"><strong title={profile.name}>{profile.name}</strong><small>Perfil local</small></div>
      <button ref={triggerRef} className="profile-menu-trigger" type="button" aria-label="Opciones de usuario" aria-expanded={open} aria-controls="profile-options" onClick={() => setOpen(current => !current)}><Ellipsis size={18} aria-hidden="true" /></button>
      {open && <div className="profile-menu" id="profile-options" aria-label="Opciones de usuario">
        <button type="button" onClick={() => { setOpen(false); setSettings(true); }}><Settings size={15} aria-hidden="true" />Configuración</button>
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
    {settings && <ProfileSettings profile={profile} onClose={closeSettings} onSave={next => { setProfile(next); closeSettings(); }} />}
  </>;
}
