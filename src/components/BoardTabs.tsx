import { useEffect, useRef } from 'react'
import type { WorkspaceBoard } from '../lib/workspace'

type Props = {
  boards: WorkspaceBoard[]
  openBoardIds: string[]
  activeBoardId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
}

export function BoardTabs({ boards, openBoardIds, activeBoardId, onSelect, onClose }: Props) {
  const navRef = useRef<HTMLElement>(null)
  const restoreFocus = useRef(false)

  useEffect(() => {
    const selected = navRef.current?.querySelector<HTMLButtonElement>('[aria-current="page"]')
    selected?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    if (restoreFocus.current) {
      if (selected) selected.focus()
      else document.querySelector<HTMLButtonElement>('.board-links button, .new-board-button')?.focus()
      restoreFocus.current = false
    }
  }, [activeBoardId, openBoardIds])

  return <nav ref={navRef} className="board-tabs" aria-label="Tableros abiertos">
    {openBoardIds.map(id => {
      const board = boards.find(board => board.id === id)
      if (!board) return null
      return <div key={id} className={`open-board-tab ${id === activeBoardId ? 'is-active' : ''}`}>
        <button type="button" aria-current={id === activeBoardId ? 'page' : undefined} title={board.title} onClick={() => onSelect(id)}>
          <span aria-hidden="true">▦</span><span className="open-tab-title">{board.title}</span>
        </button>
        <button type="button" className="close-board-tab" aria-label={`Cerrar pestaña ${board.title}`} title="Cerrar pestaña" onClick={() => { restoreFocus.current = true; onClose(id) }}>×</button>
      </div>
    })}
  </nav>
}
