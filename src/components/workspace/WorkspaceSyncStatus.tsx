import { Link } from 'react-router'
import { Check, Cloud, Download, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { useBoard } from '../../hooks/useBoard'
import { createBackup } from '../../lib/workspaceBackup'
export function WorkspaceSyncStatus({ workspace }: { workspace: ReturnType<typeof useBoard> }) {
  const [exportError, setExportError] = useState('')
  const sync = workspace.sync
  if (!sync || sync.phase === 'ready') return null
  return <div className={`workspace-sync ${sync.phase === 'error' ? 'workspace-sync-error' : ''}`}>
    <span role={sync.phase === 'error' ? 'alert' : 'status'}>{sync.phase === 'loading' || sync.phase === 'saving' ? <LoaderCircle size={15} className="auth-spinner" /> : sync.phase === 'error' ? <TriangleAlert size={15} /> : <Check size={15} />}
      {sync.phase === 'loading' ? 'Cargando tus tableros…' : sync.phase === 'saving' ? 'Guardando en tu cuenta…' : sync.phase === 'error' ? sync.message : 'Guardado en tu cuenta'}
    </span>
    {sync.phase === 'error' && <div className="workspace-sync-actions">
      {!sync.dirty && <Link to="/settings">Revisar mi cuenta</Link>}
      {!sync.conflict && <button type="button" onClick={sync.retry}><RefreshCw size={13} />Reintentar</button>}
      {sync.dirty && <button type="button" onClick={() => {
        try {
          const url = URL.createObjectURL(new Blob([JSON.stringify(createBackup(workspace.exportWorkspace), null, 2)], { type: 'application/json' }))
          const link = document.createElement('a'); link.href = url; link.download = 'viflow-borrador-sin-guardar.json'; link.click()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
        } catch { setExportError('No pudimos descargar el borrador. Mantén esta pestaña abierta.') }
      }}><Download size={13} />Descargar borrador</button>}
      <button type="button" onClick={sync.reload}><Cloud size={13} />{sync.dirty ? 'Descartar borrador y recargar' : 'Recargar'}</button>
      {exportError && <small role="alert">{exportError}</small>}
    </div>}
  </div>
}
