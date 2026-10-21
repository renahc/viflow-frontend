import { Ellipsis, Kanban, Plus, SquarePen, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { WorkspaceBoard } from '../lib/workspace'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

type Props = {
  boards: WorkspaceBoard[]
  activeBoardId: string
  onSelect: (id: string) => void
  onCreate: (title: string) => string | undefined
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
}

function RenameBoardModal({ board, onSave, onClose }: { board: WorkspaceBoard; onSave: (title: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(board.title)
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return <dialog ref={ref} className="confirm-modal" aria-labelledby="rename-board-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="rename-board-title">Renombrar tablero</h2>
    <form onSubmit={event => { event.preventDefault(); if (title.trim()) onSave(title.trim()) }}>
      <label className="profile-name-label" htmlFor="rename-board-name">Nombre del tablero</label>
      <input id="rename-board-name" className="profile-name-input" autoFocus required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} />
      <div className="confirm-modal-actions"><button type="button" className="modal-cancel" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!title.trim()}>Guardar</button></div>
    </form>
  </dialog>
}

export function BoardNavigation({ boards, activeBoardId, onSelect, onCreate, onRename, onDelete }: Props) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [action, setAction] = useState<{ kind: 'rename' | 'delete'; board: WorkspaceBoard } | null>(null)
  const navRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!menu) return
    function closeOutside(event: PointerEvent) {
      const target = event.target as Element
      if (!navRef.current?.querySelector(`[data-board-menu="${CSS.escape(menu!)}"]`)?.contains(target)) setMenu(null)
    }
    function closeOnLayoutChange() { setMenu(null) }
    function closeOnScroll(event: Event) {
      const target = event.target as Node
      const popup = document.getElementById(`board-options-${menu}`)
      if (!popup?.contains(target)) setMenu(null)
    }
    document.addEventListener('pointerdown', closeOutside)
    window.addEventListener('resize', closeOnLayoutChange)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      window.removeEventListener('resize', closeOnLayoutChange)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [menu])

  function closeAction() {
    setAction(null)
    triggerRef.current?.focus()
  }

  return <nav className="board-navigation" aria-label="Tableros" ref={navRef}>
    <div className="board-links">{boards.map(board => (
      <div key={board.id} className={`board-entry ${board.id === activeBoardId ? 'is-active' : ''}`} data-board-menu={board.id}
        onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMenu(null) }}
        onKeyDown={event => { if (event.key === 'Escape') { setMenu(null); triggerRef.current?.focus() } }}>
        <div className="board-entry-row">
          <button type="button" className="nav-item" aria-current={board.id === activeBoardId ? 'page' : undefined} title={board.title} onClick={() => { setMenu(null); onSelect(board.id) }}>
            <Kanban size={18} aria-hidden="true" /><span className="board-link-title">{board.title}</span>
          </button>
          <button className="board-options-trigger" type="button" aria-label={`Opciones de ${board.title}`} aria-expanded={menu === board.id} aria-controls={menu === board.id ? `board-options-${board.id}` : undefined}
            onClick={event => {
              triggerRef.current = event.currentTarget
              const rect = event.currentTarget.getBoundingClientRect()
              const width = 184
              setMenuPosition({
                top: Math.max(8, Math.min(rect.top, window.innerHeight - 110)),
                left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)),
              })
              setMenu(current => current === board.id ? null : board.id)
            }}><Ellipsis size={18} aria-hidden="true" /></button>
        </div>
        {menu === board.id && <div className="board-item-options" style={menuPosition} id={`board-options-${board.id}`}>
          <button type="button" onClick={() => { setMenu(null); setAction({ kind: 'rename', board }) }}><SquarePen size={14} aria-hidden="true" />Renombrar</button>
          <button type="button" className="board-delete-option" onClick={() => { setMenu(null); setAction({ kind: 'delete', board }) }}><Trash2 size={14} aria-hidden="true" />Eliminar tablero</button>
        </div>}
      </div>
    ))}</div>
    {creating ? <form className="composer board-composer" onSubmit={event => {
      event.preventDefault()
      if (!onCreate(title)) return
      setCreating(false)
      setTitle('')
    }} onKeyDown={event => {
      if (event.key === 'Escape') { setCreating(false); setTitle('') }
    }}>
      <label htmlFor="board-name">Nombre del tablero</label>
      <input id="board-name" autoFocus required maxLength={80} placeholder="Ej. Proyecto personal" value={title} onChange={event => setTitle(event.target.value)} />
      <div className="board-composer-actions"><button className="primary-button" disabled={!title.trim()}>Crear</button><button type="button" className="quiet-button" onClick={() => { setCreating(false); setTitle('') }}>Cancelar</button></div>
    </form> : <button type="button" className="new-board-button" onClick={() => setCreating(true)}><Plus size={16} aria-hidden="true" />Nuevo tablero</button>}
    {action?.kind === 'rename' && <RenameBoardModal board={action.board} onClose={closeAction} onSave={title => { onRename(action.board.id, title); closeAction() }} />}
    {action?.kind === 'delete' && <ConfirmDeleteModal title="Eliminar tablero" description={`Se eliminará «${action.board.title}», con sus ${action.board.columns.length} columnas y ${action.board.cards.length} tarjetas. Esta acción no se puede deshacer.`}
      onCancel={closeAction} onConfirm={() => { onDelete(action.board.id); closeAction() }} />}
  </nav>
}
