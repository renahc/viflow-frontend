import { useEffect, useRef, useState } from 'react'
import { avatarSaveError, validateAvatar } from '../services/accountAvatarService'
type Profile = { name: string; photo: string }
export function ProfileAvatar({ profile }: { profile: Profile }) {
  const [failedPhoto, setFailedPhoto] = useState("");
  return profile.photo && profile.photo !== failedPhoto
    ? <img className="avatar profile-photo" src={profile.photo} onError={() => setFailedPhoto(profile.photo)} alt={`Foto de ${profile.name}`} />
    : <span className="avatar" aria-label={`Perfil de ${profile.name}`}>{profile.name.trim().charAt(0).toUpperCase() || 'T'}</span>;
}

export function ProfileEditor({ profile, account, hasPhoto, onClose, onSave, embedded = false }: { profile: Profile; embedded?: boolean; account: boolean; hasPhoto: boolean; onClose: () => void; onSave: (profile: Profile, photo: File | null | undefined) => Promise<{ cleanupPending?: boolean } | void> }) {
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
    if (!embedded) dialog?.showModal();
    return () => { mounted.current = false; dialog?.close(); readVersion.current += 1; };
  }, [embedded]);

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

  const content = <>
    {!embedded && <h2 id="profile-settings-title">Configuración del perfil</h2>}
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
          } else if (embedded) { setPhotoChange(undefined); setNotice('Tu perfil se guardó correctamente.'); } else onClose();
        }
      } catch (error) {
        if (mounted.current) setError(account ? avatarSaveError(error) : "No pudimos guardar tu perfil. Revisa el espacio disponible del navegador e inténtalo de nuevo.");
      } finally {
        savingRef.current = false;
        if (mounted.current) setSaving(false);
      }
    }}>
      <div className="profile-photo-editor"><ProfileAvatar profile={preview} /><div>
        <label className="photo-label" htmlFor="profile-photo">Foto de perfil</label>
        <input id="profile-photo" disabled={saving} type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} />
        <small>PNG, JPG o WebP · Hasta 1 MB</small>
      </div></div>
      {(preview.photo || (account && hasPhoto && photoChange !== null)) && <button className="quiet-button" type="button" disabled={saving} onClick={() => { readVersion.current += 1; setReading(false); setDraft(current => ({ ...current, photo: "" })); setPhotoChange(null); setError(""); }}>Quitar foto</button>}
      {account && <p>Este nombre se mostrará en tu cuenta. No tiene que ser único.</p>}
      <label className="profile-name-label" htmlFor="profile-name">Nombre para mostrar</label>
      <input className="profile-name-input" id="profile-name" disabled={saving} autoFocus={!embedded} required maxLength={60} value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} />
      {reading && <p role="status">Cargando imagen…</p>}
      {notice && <p role="status">{notice}</p>}
      {error && <p className="profile-error" role="alert">{error}</p>}
      <div className="confirm-modal-actions"><button className="modal-cancel" type="button" disabled={saving} onClick={onClose}>{embedded ? 'Volver al tablero' : 'Cancelar'}</button><button className="primary-button" disabled={!draft.name.trim() || reading || saving}>{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
    </form>
  </>;
  return embedded ? <div className="profile-settings settings-profile-editor">{content}</div> : <dialog ref={dialogRef} className="confirm-modal profile-settings" aria-labelledby="profile-settings-title" onCancel={event => { event.preventDefault(); if (!savingRef.current) onClose(); }}>{content}</dialog>;
}
