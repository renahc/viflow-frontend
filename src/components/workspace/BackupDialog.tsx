import * as m from 'motion/react-m'
import { dialogVariants } from '../motion/presets'
import { LocalBoardImportPanel } from './LocalBoardImportPanel'
import { useEffect, useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import type { useBoard } from '../../hooks/useBoard'
import { backupCounts, createBackup, maxBackupBytes, parseBackup } from '../../lib/workspaceBackup'
import type { WorkspaceBackup } from '../../lib/workspaceBackup'

type Props = { workspace: ReturnType<typeof useBoard>; onClose: () => void }
export function BackupDialog({ workspace, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const readRequestsRef = useRef({ sequence: 0 })
  const [backup, setBackup] = useState<WorkspaceBackup | null>(null)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const requestState = readRequestsRef.current
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => { requestState.sequence++; dialog?.close() }
  }, [])
  const counts = backup ? backupCounts(backup) : null
  return <m.dialog variants={dialogVariants} initial="hidden" animate="visible" ref={dialogRef} className="confirm-modal backup-dialog" aria-labelledby="backup-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <header className="archive-header"><h2 id="backup-title">Respaldos</h2><button autoFocus type="button" className="icon-button" aria-label="Cerrar respaldos" disabled={busy} onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
    <section className="backup-section"><h3>Exportar espacio de trabajo</h3><p>Descarga todos tus tableros, tarjetas, etiquetas, comentarios y actividad, incluidos los archivados. Tu perfil y foto no se incluyen.</p>
      <button type="button" className="primary-button" onClick={() => {
        setError(''); setNotice('')
        try {
          const text = JSON.stringify(createBackup(workspace.exportWorkspace), null, 2)
          if (new TextEncoder().encode(text).byteLength > maxBackupBytes) { setError('El espacio supera los 10 MB admitidos por los respaldos de esta versión.'); return }
          const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
          const link = document.createElement('a')
          link.href = url; link.download = `viflow-respaldo-${new Date().toISOString().slice(0, 10)}.json`
          document.body.append(link); link.click(); link.remove()
          window.setTimeout(() => URL.revokeObjectURL(url), 1000)
          setNotice('Se solicitó la descarga del respaldo.')
        } catch { setError('No pudimos generar el respaldo. Inténtalo nuevamente.') }
      }}><Download size={15} aria-hidden="true" />Exportar JSON</button>
    </section>
    {!workspace.sync && <section className="backup-section"><h3>Importar respaldo</h3><p>Los tableros se agregarán como copias, sin reemplazar los que ya tienes. Importar el mismo archivo nuevamente creará más copias.</p>
      <label className="backup-file-label" htmlFor="backup-file">Seleccionar archivo JSON (máximo 10 MB)</label>
      <input id="backup-file" type="file" accept=".json,application/json" onChange={async event => {
        const file = event.currentTarget.files?.[0]
        const request = ++readRequestsRef.current.sequence
        setBackup(null); setError(''); setNotice(''); setFileName(file?.name ?? '')
        if (!file) { setBusy(false); return }
        if (file.size > maxBackupBytes) { setBusy(false); setError('El respaldo supera el límite de 10 MB.'); return }
        setBusy(true)
        try {
          const text = await file.text()
          if (readRequestsRef.current.sequence === request) setBackup(parseBackup(text))
        } catch (error) { if (readRequestsRef.current.sequence === request) setError(error instanceof Error ? error.message : 'No pudimos leer el archivo.') }
        finally { if (readRequestsRef.current.sequence === request) setBusy(false) }
      }} />
      {busy && <p role="status">Validando archivo…</p>}
      {counts && <div className="backup-preview"><strong>{fileName}</strong><p>{counts.boards} tableros · {counts.cards} tarjetas · {counts.archivedBoards} tableros archivados</p><p>Los elementos archivados seguirán disponibles en Archivados.</p>
        <button type="button" className="primary-button" disabled={!counts.boards || busy} onClick={() => {
          if (!backup) return
          if (!workspace.importBackup(backup)) { setError('No hay espacio o permiso para guardar el respaldo. Tus tableros actuales se conservaron.'); return }
          setNotice(`${counts.boards} tableros importados. Puedes abrirlos desde el menú lateral o Archivados.`)
          setBackup(null); setError('')
        }}><Upload size={15} aria-hidden="true" />Importar {counts.boards} tableros</button>
      </div>}
    </section>}
    {workspace.copyLocalBoards && <LocalBoardImportPanel workspace={workspace} onClose={onClose} onBusyChange={setBusy} />}
    {error && <p className="label-error" role="alert">{error}</p>}
    <p role="status">{notice}</p>
  </m.dialog>
}
