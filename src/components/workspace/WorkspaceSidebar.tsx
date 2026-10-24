import { AccountAccess } from '../auth/AccountAccess'
import { useState } from 'react'
import { BackupDialog } from './BackupDialog'
import { ArchiveDialog } from './ArchiveDialog'
import { Archive, Download, Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import type { useBoard } from '../../hooks/useBoard'
import { BoardNavigation } from '../BoardNavigation'
import { UserProfile } from '../UserProfile'

type Props = { workspace: ReturnType<typeof useBoard> }

export function WorkspaceSidebar({ workspace }: Props) {
  const [backupOpen, setBackupOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  return (
    <aside className="sidebar">
      <Link className="brand" to="/">viflow<span className="brand-dot">.</span></Link>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <BoardNavigation boards={workspace.boards} activeBoardId={workspace.activeBoardId}
        onCreate={workspace.addBoard} onRename={workspace.renameBoard} onDelete={workspace.archiveBoard} />
      <button type="button" className="archive-open-button" onClick={() => setArchiveOpen(true)}><Archive size={16} aria-hidden="true" />Archivados</button>
      {archiveOpen && <ArchiveDialog workspace={workspace} onClose={() => setArchiveOpen(false)} />}
      <button type="button" className="archive-open-button" onClick={() => setBackupOpen(true)}><Download size={16} aria-hidden="true" />Respaldos</button>
      {backupOpen && <BackupDialog workspace={workspace} onClose={() => setBackupOpen(false)} />}
      <div className="sidebar-note">
        <Sparkles className="sidebar-note-icon" size={28} aria-hidden="true" />
        <strong>Un paso a la vez.</strong>
        <p>Las grandes ideas se construyen con pequeños avances.</p>
      </div>
      <AccountAccess />
      <UserProfile sync={workspace.sync} />
    </aside>
  )
}
