import * as m from 'motion/react-m'
import { ConfirmDeleteModal } from '../ConfirmDeleteModal'
import { boardPath } from '../../lib/routes'
import { Link, useNavigate } from 'react-router'
import { Cloud, Download, HardDrive, LoaderCircle, RefreshCw, TriangleAlert, WifiOff } from 'lucide-react'
import { useState } from 'react'
import type { useBoard } from '../../hooks/useBoard'
import { createBackup } from '../../lib/workspaceBackup'
export function WorkspaceSyncStatus({ workspace }: { workspace: ReturnType<typeof useBoard> }) {
  const navigate = useNavigate()
  const [exportError, setExportError] = useState('')
  const [discard, setDiscard] = useState<string | null>(null)
  const sync = workspace.sync
  if (!sync) return null
  if (sync.phase === 'saving') return <m.div className="workspace-saving-toast" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} role="status" aria-live="polite">
    <span><LoaderCircle size={14} className="auth-spinner" aria-hidden="true" />Guardando en tu cuenta…</span>
    {sync.dirty && !sync.draftSaved && <small>No se pudo guardar una copia local. Mantén esta pestaña abierta hasta confirmar el guardado.</small>}
  </m.div>
  const drafts = sync.drafts ?? []
  if (sync.phase === 'ready' && sync.online !== false && !drafts.length && !sync.draftError) return null
  return <><div className={`workspace-sync ${sync.phase === 'error' ? 'workspace-sync-error' : ''}`}>
    <span role={sync.phase === 'error' ? 'alert' : 'status'}>{sync.phase === 'loading' ? <LoaderCircle size={15} className="auth-spinner" /> : sync.phase === 'error' ? <TriangleAlert size={15} /> : sync.online === false ? <WifiOff size={15} /> : <HardDrive size={15} />}
      {sync.phase === 'loading' ? 'Cargando tus tableros…' : sync.phase === 'error' ? sync.message : sync.online === false ? 'Sin conexión. Los próximos cambios quedarán pendientes hasta que vuelvas a conectarte.' : drafts.length ? 'Encontramos cambios pendientes en este dispositivo.' : sync.draftError}
    </span>
    {sync.phase === 'error' && <div className="workspace-sync-actions">
      {!sync.dirty && <Link to="/settings">Revisar mi cuenta</Link>}
      {!sync.conflict && <button type="button" disabled={sync.online === false} onClick={sync.retry}><RefreshCw size={13} />{sync.online === false ? 'Esperando conexión' : 'Reintentar'}</button>}
      {sync.dirty && <button type="button" onClick={() => {
        try {
          const url = URL.createObjectURL(new Blob([JSON.stringify(createBackup(workspace.exportWorkspace), null, 2)], { type: 'application/json' }))
          const link = document.createElement('a'); link.href = url; link.download = 'viflow-borrador-sin-guardar.json'; link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch { setExportError('No pudimos descargar el borrador. Mantén esta pestaña abierta.') }
      }}><Download size={13} />Descargar borrador</button>}
      <button type="button" onClick={() => sync.dirty ? setDiscard('pending') : sync.reload()}><Cloud size={13} />{sync.dirty ? 'Descartar borrador y recargar' : 'Recargar'}</button>
      {exportError && <small role="alert">{exportError}</small>}
    </div>}
    {sync.dirty && <p className={`draft-safety-note ${sync.draftSaved ? '' : 'draft-at-risk'}`} role="status"><HardDrive size={13} />{sync.draftSaved ? 'Borrador guardado en este dispositivo. Podrás recuperarlo al volver con esta cuenta.' : 'No pudimos guardar una copia en este dispositivo. Mantén esta pestaña abierta o descarga el borrador antes de salir.'}</p>}
    {sync.draftError && (sync.phase !== 'ready' || drafts.length > 0) && <p className="draft-safety-note" role="alert">{sync.draftError}</p>}
    {!sync.dirty && drafts.length > 0 && <div className="recovery-drafts">{drafts.map(draft => <div key={draft.id} className="recovery-draft"><HardDrive size={18} /><div><strong>{draft.titles.join(', ')}</strong><small>{new Intl.DateTimeFormat('es-CL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(draft.savedAt))} · Pendiente de confirmar en la nube</small></div><button type="button" disabled={sync.phase === 'loading'} onClick={() => { sync.recoverDraft?.(draft.id); void navigate(boardPath(draft.boardId)) }}>Recuperar borrador</button><button type="button" disabled={sync.phase === 'loading'} onClick={() => setDiscard(draft.id)}>Descartar</button></div>)}</div>}
  </div>
  {discard && <ConfirmDeleteModal title="Descartar borrador" confirmLabel="Descartar borrador" description="Se eliminarán los cambios pendientes de este borrador en el dispositivo. Los datos ya guardados en tu cuenta permanecerán intactos." onCancel={() => setDiscard(null)} onConfirm={() => { if (discard === 'pending') sync.reload(); else sync.discardDraft?.(discard); setDiscard(null) }} />}
  </>
}
