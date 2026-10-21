import { NavLink } from 'react-router'
import { boardPath } from '../lib/routes'
import { Kanban, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { WorkspaceBoard } from '../lib/workspace'

type Props = {
  boards: WorkspaceBoard[]
  openBoardIds: string[]
  activeBoardId: string
  onClose: (id: string) => void
}

export function BoardTabs({ boards, openBoardIds, activeBoardId, onClose }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const restoreFocus = useRef(false)

  useEffect(() => {
    const selected = navRef.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')
    selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (restoreFocus.current) {
      if (selected) selected.focus()
      else document.querySelector<HTMLAnchorElement>('.board-links button, .new-board-button')?.focus()
      restoreFocus.current = false
    }
  }, [activeBoardId, openBoardIds])

  return <nav ref={navRef} className="board-tabs" aria-label="Tableros abiertos">
    {openBoardIds.map(id => {
      const board = boards.find(board => board.id === id)
      if (!board) return null
      return <div key={id} className={`open-board-tab ${id === activeBoardId ? 'is-active' : ''}`}>
        <NavLink to={boardPath(id)} title={board.title}>
          <Kanban size={15} aria-hidden="true" /><span className="open-tab-title">{board.title}</span>
        </NavLink>
        <button type="button" className="close-board-tab" aria-label={`Cerrar pestaña ${board.title}`} title="Cerrar pestaña" onClick={() => { restoreFocus.current = true; onClose(id) }}><X size={14} aria-hidden="true" /></button>
      </div>
    })}
  </nav>
}
