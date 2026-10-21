import { Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { useBoard } from '../../hooks/useBoard'
import { BoardNavigation } from '../BoardNavigation'
import { UserProfile } from '../UserProfile'

type Props = { workspace: ReturnType<typeof useBoard> }

export function WorkspaceSidebar({ workspace }: Props) {
  return (
    <aside className="sidebar">
      <Link className="brand" to="/">viflow<span className="brand-dot">.</span></Link>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <BoardNavigation boards={workspace.boards} activeBoardId={workspace.activeBoardId}
        onCreate={workspace.addBoard} onRename={workspace.renameBoard} onDelete={workspace.deleteBoard} />
      <div className="sidebar-note">
        <Sparkles className="sidebar-note-icon" size={28} aria-hidden="true" />
        <strong>Un paso a la vez.</strong>
        <p>Las grandes ideas se construyen con pequeños avances.</p>
      </div>
      <UserProfile />
    </aside>
  )
}
