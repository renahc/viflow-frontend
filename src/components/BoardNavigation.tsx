import { useState } from 'react'
import type { WorkspaceBoard } from '../lib/workspace'

type Props = {
  boards: WorkspaceBoard[]
  activeBoardId: string
  onSelect: (id: string) => void
  onCreate: (title: string) => string | undefined
}

export function BoardNavigation({ boards, activeBoardId, onSelect, onCreate }: Props) {
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  return <nav className="board-navigation" aria-label="Tableros">
    <div className="board-links">{boards.map(board => (
      <button key={board.id} type="button" className={`nav-item ${board.id === activeBoardId ? 'is-active' : ''}`}
        aria-current={board.id === activeBoardId ? 'page' : undefined} title={board.title} onClick={() => onSelect(board.id)}>
        <span aria-hidden="true">▦</span><span className="board-link-title">{board.title}</span>
      </button>
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
    </form> : <button type="button" className="new-board-button" onClick={() => setCreating(true)}><span aria-hidden="true">＋</span>Nuevo tablero</button>}
  </nav>
}
