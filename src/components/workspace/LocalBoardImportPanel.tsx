import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, ArrowUpRight, Check, Copy, HardDrive, LoaderCircle, RefreshCw } from 'lucide-react'
import type { useBoard } from '../../hooks/useBoard'
import { localImportCounts, prepareLocalBoardImport, readLocalImportBoards } from '../../lib/localBoardImport'
import type { WorkspaceBoard } from '../../lib/workspace'
import { localBoardImportError } from '../../services/localBoardImportService'
import { boardPath } from '../../lib/routes'

type Props = { workspace: ReturnType<typeof useBoard>; onClose: () => void; onBusyChange: (busy: boolean) => void }
function read() {
  try { return { boards: readLocalImportBoards(localStorage), error: '' } }
  catch { return { boards: [] as WorkspaceBoard[], error: 'No pudimos leer los tableros de este navegador. No se ha modificado ningún dato local.' } }
}
export function LocalBoardImportPanel({ workspace, onClose, onBusyChange }: Props) {
  const [local, setLocal] = useState(read)
  const [selected, setSelected] = useState<string[]>([])
  const [step, setStep] = useState<'choose' | 'review' | 'done'>('choose')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [importedIds, setImportedIds] = useState<string[]>([])
  const mounted = useRef(false)
  const working = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const boards = local.boards.filter(board => selected.includes(board.id))
  const counts = localImportCounts(boards)
  return <section className="local-import-panel" aria-labelledby="local-import-title">
    <div className="local-import-heading"><span><HardDrive size={18} /></span><div><h3 id="local-import-title">Importar desde este dispositivo</h3><p>Copia tus tableros locales a tu cuenta, a tu ritmo.</p></div></div>
    {step === 'done' ? <div className="local-import-success" role="status"><Check size={23} /><h4>{importedIds.length} {importedIds.length === 1 ? 'tablero copiado' : 'tableros copiados'} a tu cuenta</h4><p>Los originales siguen en este dispositivo. Las copias ya están guardadas en la nube.</p>
      <ul>{importedIds.map(id => { const board = workspace.allBoards.find(board => board.id === id); return <li key={id}>{board?.archivedAt ? <span>{board.title}<small>Disponible en Archivados</small></span> : <Link to={boardPath(id)} onClick={onClose}>{board?.title ?? 'Abrir tablero'}<ArrowUpRight size={14} /></Link>}</li> })}</ul>
      <button type="button" className="quiet-button" onClick={() => { setStep('choose'); setSelected([]); setError(''); setLocal(read()) }}>Elegir otros tableros</button>
    </div> : <>
      {step === 'choose' ? <>
        <p className="local-import-hint">Solo aparecen los tableros guardados en este navegador. Selecciona los que quieras llevar a tu cuenta.</p>
        {local.error && <p role="alert" className="label-error">{local.error}</p>}
        {!local.boards.length && !local.error ? <div className="local-import-empty"><HardDrive size={24} /><strong>No hay tableros locales guardados</strong><p>Si los creaste en otro navegador o dispositivo, debes iniciar sesión allí para copiarlos.</p></div> : <div className="local-import-list">{local.boards.map(board => <label key={board.id} className="local-import-option"><input type="checkbox" checked={selected.includes(board.id)} disabled={busy} onChange={event => { setSelected(ids => event.target.checked ? [...ids, board.id] : ids.filter(id => id !== board.id)); setError('') }} /><span><strong>{board.title}</strong><small>{board.cards.length} tarjetas · {board.columns.length} columnas{board.archivedAt ? ' · Archivado' : ''}</small></span></label>)}</div>}
        <div className="local-import-actions"><button type="button" className="quiet-button" onClick={() => { setLocal(read()); setSelected([]); setError('') }}><RefreshCw size={13} />Actualizar lista</button><button type="button" className="primary-button" disabled={!selected.length || busy} onClick={() => { try { prepareLocalBoardImport(boards); setStep('review'); setError('') } catch (error) { setError(localBoardImportError(error)) } }}>Revisar selección<ArrowUpRight size={14} /></button></div>
      </> : <>
        <button type="button" className="quiet-button" disabled={busy} onClick={() => { setStep('choose'); setError('') }}><ArrowLeft size={13} />Cambiar selección</button>
        <div className="local-import-summary"><h4>Esto se copiará a tu cuenta</h4><div><span><strong>{counts.boards}</strong>Tableros</span><span><strong>{counts.cards}</strong>Tarjetas</span><span><strong>{counts.labels}</strong>Etiquetas</span></div><p>{counts.comments} comentarios · {counts.activity} registros de actividad · {counts.archived} tableros archivados</p></div>
        <ul className="local-import-promises"><li>Los originales permanecen en este dispositivo.</li><li>Los comentarios y la actividad conservan sus nombres y fechas, con la marca «Historial importado».</li><li>Se crean copias independientes. Copiar de nuevo después de una importación confirmada creará otras copias.</li></ul>
        <button type="button" className="primary-button local-import-confirm" disabled={busy} onClick={async () => {
          if (working.current || !workspace.copyLocalBoards) return
          working.current = true; setBusy(true); onBusyChange(true); setError('')
          try { const ids = await workspace.copyLocalBoards(boards); if (mounted.current) { setImportedIds(ids); setStep('done') } }
          catch (error) { if (mounted.current) setError(localBoardImportError(error)) }
          finally { working.current = false; if (mounted.current) { setBusy(false); onBusyChange(false) } }
        }}>{busy ? <LoaderCircle className="auth-spinner" size={15} /> : <Copy size={15} />}{busy ? 'Copiando a tu cuenta…' : 'Copiar a mi cuenta'}</button>
      </>}
      {error && <p className="label-error" role="alert">{error}</p>}
    </>}
  </section>
}
