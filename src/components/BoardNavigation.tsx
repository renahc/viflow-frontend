import * as m from 'motion/react-m'
import { popupVariants, dialogVariants } from './motion/presets'
import { DuplicateDialog } from './DuplicateDialog'
import type { DuplicateOptions } from '../lib/duplicate'
import { NavLink } from 'react-router'
import { boardPath } from '../lib/routes'
import { Copy, Ellipsis, Kanban, Plus, SquarePen, Archive } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { WorkspaceBoard } from '../lib/workspace'
import { ConfirmDeleteModal } from './ConfirmDeleteModal'

type Props = {
  boards: WorkspaceBoard[]
  activeBoardId: string
  onCreate: (title: string) => string | undefined
  onRename: (id: string, title: string) => void
  onDuplicate: (id: string, options: DuplicateOptions) => string | undefined
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
  return <m.dialog variants={dialogVariants} initial="hidden" animate="visible" ref={ref} className="confirm-modal" aria-labelledby="rename-board-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <h2 id="rename-board-title">Renombrar tablero</h2>
    <form onSubmit={event => { event.preventDefault(); if (title.trim()) onSave(title.trim()) }}>
      <label className="profile-name-label" htmlFor="rename-board-name">Nombre del tablero</label>
      <input id="rename-board-name" className="profile-name-input" autoFocus required maxLength={80} value={title} onChange={event => setTitle(event.target.value)} />
      <div className="confirm-modal-actions"><button type="button" className="modal-cancel" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={!title.trim()}>Guardar</button></div>
    </form>
  </m.dialog>
}

export function BoardNavigation({ boards, activeBoardId, onCreate, onRename, onDelete, onDuplicate }: Props) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [menu, setMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [action, setAction] = useState<{ kind: 'rename' | 'delete' | 'duplicate'; board: WorkspaceBoard } | null>(null)
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
          <NavLink to={boardPath(board.id)} className="nav-item" title={board.title} onClick={() => setMenu(null)}>
            <Kanban size={18} aria-hidden="true" /><span className="board-link-title">{board.title}</span>
          </NavLink>
          <button className="board-options-trigger" type="button" aria-label={`Opciones de ${board.title}`} aria-expanded={menu === board.id} aria-controls={menu === board.id ? `board-options-${board.id}` : undefined}
            onClick={event => {
              triggerRef.current = event.currentTarget
              const rect = event.currentTarget.getBoundingClientRect()
              const width = 184
              setMenuPosition({
                top: Math.max(8, Math.min(rect.top, window.innerHeight - 155)),
                left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8)),
              })
              setMenu(current => current === board.id ? null : board.id)
            }}><Ellipsis size={18} aria-hidden="true" /></button>
        </div>
        {menu === board.id && <m.div variants={popupVariants} initial="hidden" animate="visible" className="board-item-options" style={menuPosition} id={`board-options-${board.id}`}>
          <button type="button" onClick={() => { setMenu(null); setAction({ kind: 'rename', board }) }}><SquarePen size={14} aria-hidden="true" />Renombrar</button>
          <button type="button" onClick={() => { setMenu(null); setAction({ kind: 'duplicate', board }) }}><Copy size={14} aria-hidden="true" />Duplicar tablero</button>
          <button type="button" className="board-delete-option" onClick={() => { setMenu(null); setAction({ kind: 'delete', board }) }}><Archive size={14} aria-hidden="true" />Archivar tablero</button>
        </m.div>}
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
    {action?.kind === 'duplicate' && <DuplicateDialog kind="board" title={action.board.title} onClose={closeAction} onDuplicate={options => onDuplicate(action.board.id, options)} />}
    {action?.kind === 'rename' && <RenameBoardModal board={action.board} onClose={closeAction} onSave={title => { onRename(action.board.id, title); closeAction() }} />}
    {action?.kind === 'delete' && <ConfirmDeleteModal confirmLabel="Archivar" title="Archivar tablero" description={`Se archivará «${action.board.title}» con todo su contenido. Podrás recuperarlo desde Archivados.`}
      onCancel={closeAction} onConfirm={() => { onDelete(action.board.id); closeAction() }} />}
  </nav>
}
