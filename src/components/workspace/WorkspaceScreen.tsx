import * as m from 'motion/react-m'
import { WorkspaceSyncStatus } from './WorkspaceSyncStatus'
import { UpcomingScreen } from './UpcomingScreen'
import { Link, useLocation } from 'react-router'
import type { useBoard } from '../../hooks/useBoard'
import { BoardTabs } from '../BoardTabs'
import { KanbanBoard } from '../board/KanbanBoard'
import { WorkspaceSidebar } from './WorkspaceSidebar'

type Props = { workspace: ReturnType<typeof useBoard> }

export function WorkspaceScreen({ workspace }: Props) {
  const upcoming = useLocation().pathname === '/upcoming'
  const { boards, activeBoardId, openBoardIds, routeError, storageError, closeBoard } = workspace

  return (
    <div className="workspace-page">
      <WorkspaceSyncStatus workspace={workspace} />
      <div className="app-shell" inert={Boolean(workspace.sync && workspace.sync.phase !== 'ready')}>
        <WorkspaceSidebar workspace={workspace} />
        <main id="board" className="main-content">
          <div className="workspace-tab-bar">
            <BoardTabs boards={boards} openBoardIds={openBoardIds} activeBoardId={activeBoardId} onClose={closeBoard} />
            {!routeError && activeBoardId && <span className="workspace-card-summary">{workspace.cards.length} tarjetas · {workspace.cards.filter(card => card.status === 'done').length} completadas</span>}
          </div>
          {upcoming ? <UpcomingScreen boards={workspace.allBoards} /> : routeError ? (
            <div className="workspace-empty">
              <h1>Tablero no encontrado</h1>
              <p>La dirección no existe o este tablero no está disponible en el espacio de trabajo actual.</p>
              <Link className="primary-button" to="/">Volver al espacio de trabajo</Link>
            </div>
          ) : !activeBoardId ? (
            <div className="workspace-empty">
              <h1>{boards.length === 0 ? 'No hay tableros' : 'Tu espacio de trabajo'}</h1>
              <p>{boards.length === 0 ? 'Crea un tablero desde el menú lateral para comenzar.' : 'Selecciona un tablero del menú lateral para abrirlo.'}</p>
              {storageError && <p role="alert">No pudimos guardar tus cambios.</p>}
            </div>
          ) : <KanbanBoard key={activeBoardId} workspace={workspace} />}
        </main>
        {workspace.undoArchive && <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ x: '-50%' }} className="archive-toast" role="status"><span>«{workspace.undoArchive.title}» archivado.</span><button type="button" onClick={workspace.undoLastArchive}>Deshacer</button><button type="button" aria-label="Cerrar aviso" onClick={workspace.dismissUndo}>×</button></m.div>}
      </div>
    </div>
  )
}
