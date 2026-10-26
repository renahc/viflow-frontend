import * as m from 'motion/react-m'
import { dialogVariants } from '../motion/presets'
import { useEffect, useRef, useState } from 'react'
import { Archive, RotateCcw, X } from 'lucide-react'
import type { useBoard } from '../../hooks/useBoard'

type Props = { workspace: ReturnType<typeof useBoard>; onClose: () => void }
export function ArchiveDialog({ workspace, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [filter, setFilter] = useState<'cards' | 'boards'>('cards')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  const boards = workspace.allBoards.filter(board => board.archivedAt)
  const cards = workspace.allBoards.filter(board => !board.archivedAt).flatMap(board => board.cards.filter(card => card.archivedAt).map(card => ({ board, card })))
  function restore(boardId: string, title: string, cardId?: string) {
    workspace.restoreArchived(boardId, cardId)
    setNotice(`«${title}» restaurado${cardId ? ' en su columna' : ' en el menú lateral'}.`)
  }
  return <m.dialog variants={dialogVariants} initial="hidden" animate="visible" ref={ref} className="confirm-modal archive-dialog" aria-labelledby="archive-title"
    onCancel={event => { event.preventDefault(); onClose() }}>
    <header className="archive-header"><h2 id="archive-title"><Archive size={18} aria-hidden="true" />Archivados</h2><button autoFocus type="button" className="icon-button" aria-label="Cerrar archivados" onClick={onClose}><X size={18} aria-hidden="true" /></button></header>
    <div className="activity-filters" role="group" aria-label="Tipo de archivo">
      <button type="button" aria-pressed={filter === 'cards'} onClick={() => setFilter('cards')}>Tarjetas ({cards.length})</button>
      <button type="button" aria-pressed={filter === 'boards'} onClick={() => setFilter('boards')}>Tableros ({boards.length})</button>
    </div>
    <p className="archive-hint">Conservan su contenido. Las tarjetas de un tablero archivado se recuperan al restaurar el tablero.</p>
    <div className="archive-list">
      {filter === 'boards' ? boards.length ? boards.map(board => <div className="archive-entry" key={board.id}><div><strong>{board.title}</strong><small>{board.cards.filter(card => !card.archivedAt).length} tarjetas</small></div><button className="quiet-button" type="button" onClick={() => restore(board.id, board.title)} aria-label={`Restaurar tablero ${board.title}`}><RotateCcw size={14} aria-hidden="true" />Restaurar</button></div>) : <p>No hay tableros archivados.</p>
        : cards.length ? cards.map(({ board, card }) => <div className="archive-entry" key={`${board.id}-${card.id}`}><div><strong>{card.title}</strong><small>{board.title} · {board.columns.find(column => column.id === card.status)?.title}</small></div><button className="quiet-button" type="button" onClick={() => restore(board.id, card.title, card.id)} aria-label={`Restaurar tarjeta ${card.title}`}><RotateCcw size={14} aria-hidden="true" />Restaurar</button></div>) : <p>No hay tarjetas archivadas.</p>}
    </div>
    <p role="status">{notice}</p>
    {workspace.storageError && <p role="alert">No pudimos guardar en este navegador. Los cambios solo se mantendrán durante esta sesión.</p>}
  </m.dialog>
}
