import { Link } from 'react-router'
import type { useBoard } from '../../hooks/useBoard'
import { BoardTabs } from '../BoardTabs'
import { KanbanBoard } from '../board/KanbanBoard'
import { WorkspaceSidebar } from './WorkspaceSidebar'

type Props = { workspace: ReturnType<typeof useBoard> }

export function WorkspaceScreen({ workspace }: Props) {
  const { boards, activeBoardId, openBoardIds, routeError, storageError, closeBoard } = workspace

  return (
    <div className="app-shell">
      <WorkspaceSidebar workspace={workspace} />
      <main id="board" className="main-content">
        <BoardTabs boards={boards} openBoardIds={openBoardIds} activeBoardId={activeBoardId} onClose={closeBoard} />
        {routeError ? (
          <div className="workspace-empty">
            <h1>Tablero no encontrado</h1>
            <p>La dirección no existe o este tablero no está guardado en este navegador.</p>
            <Link className="primary-button" to="/">Volver al espacio de trabajo</Link>
          </div>
        ) : !activeBoardId ? (
          <div className="workspace-empty">
            <h1>{boards.length === 0 ? 'No hay tableros' : 'Tu espacio de trabajo'}</h1>
            <p>{boards.length === 0 ? 'Crea un tablero desde el menú lateral para comenzar.' : 'Selecciona un tablero del menú lateral para abrirlo.'}</p>
            {storageError && <p role="alert">No pudimos guardar tus cambios en este navegador.</p>}
          </div>
        ) : <KanbanBoard key={activeBoardId} workspace={workspace} />}
      </main>
      {workspace.undoArchive && <div className="archive-toast" role="status"><span>«{workspace.undoArchive.title}» archivado.</span><button type="button" onClick={workspace.undoLastArchive}>Deshacer</button><button type="button" aria-label="Cerrar aviso" onClick={workspace.dismissUndo}>×</button></div>}
    </div>
  )
}
