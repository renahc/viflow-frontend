import { ArrowLeftRight, Check, ChevronDown, Circle, GripVertical, Kanban, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { BoardTabs } from "./components/BoardTabs";
import { BoardNavigation } from "./components/BoardNavigation";
import { UserProfile } from "./components/UserProfile";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { DeleteButton } from "./components/DeleteButton";
import { CardComposer } from "./components/CardComposer";
import { useBoard } from "./hooks/useBoard";
import type { Status } from "./lib/board";

export default function App() {
  const workspace = useBoard();
  const location = useLocation();
  return <WorkspaceScreen key={location.pathname} workspace={workspace} />;
}

function WorkspaceScreen({ workspace }: { workspace: ReturnType<typeof useBoard> }) {
  const { boards, activeBoardId, openBoardIds, closeBoard, title: boardTitle, routeError, addBoard, renameBoard, deleteBoard, columns, cards, storageError, addCard, moveCard, addColumn, deleteCard, deleteColumn } = workspace;
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");
  const [composer, setComposer] = useState<Status | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ kind: "card" | "column"; id: string; title: string } | null>(null);

  function resetBoardControls() {
    setAddingColumn(false);
    setColumnTitle("");
    setComposer(null);
    setDragging(null);
    setOver(null);
    setPendingDelete(null);
    setAnnouncement("");
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "column") {
      deleteColumn(pendingDelete.id);
      if (composer === pendingDelete.id) setComposer(null);
      setDragging(null);
      setOver(null);
    } else {
      deleteCard(pendingDelete.id);
    }
    setAnnouncement(`${pendingDelete.kind === "column" ? "Columna" : "Tarjeta"} ${pendingDelete.title} eliminada.`);
    setPendingDelete(null);
  }

  const completed = cards.filter((card) => card.status === "done").length;

  function move(id: string, status: Status) {
    moveCard(id, status);
    setAnnouncement(
      `Tarjeta movida a ${columns.find((column) => column.id === status)?.title}.`,
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          viflow
          <span className="brand-dot">.</span>
        </Link>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <BoardNavigation boards={boards} activeBoardId={activeBoardId}
          onCreate={(title) => { resetBoardControls(); return addBoard(title); }}
          onRename={renameBoard}
          onDelete={(id) => { resetBoardControls(); deleteBoard(id); }} />
        <div className="sidebar-note">
          <Sparkles className="sidebar-note-icon" size={28} aria-hidden="true" />
          <strong>Un paso a la vez.</strong>
          <p>Las grandes ideas se construyen con pequeños avances.</p>
        </div>
        <UserProfile />
      </aside>
      <main id="board" className="main-content">
        <BoardTabs boards={boards} openBoardIds={openBoardIds} activeBoardId={activeBoardId}
          onClose={(id) => { if (id === activeBoardId) resetBoardControls(); closeBoard(id); }} />
        {routeError ? <div className="workspace-empty"><h1>Tablero no encontrado</h1><p>La dirección no existe o este tablero no está guardado en este navegador.</p><Link className="primary-button" to="/">Volver al espacio de trabajo</Link></div> : !activeBoardId ? <div className="workspace-empty"><h1>{boards.length === 0 ? "No hay tableros" : "Tu espacio de trabajo"}</h1><p>{boards.length === 0 ? "Crea un tablero desde el menú lateral para comenzar." : "Selecciona un tablero del menú lateral para abrirlo."}</p>{storageError && <p role="alert">No pudimos guardar tus cambios en este navegador.</p>}</div> : <div className="board-content" key={activeBoardId}>
          <div className="board-toolbar">
            <span className="board-tab">
              <Kanban size={17} aria-hidden="true" />{boardTitle}
            </span>
            <span className="task-summary">
              {cards.length} tarjetas · {completed} completadas
            </span>
          </div>
          {storageError && (
            <p role="alert" className="storage-warning">
              No pudimos guardar en este navegador. Los cambios solo se
              mantendrán mientras esta página siga abierta.
            </p>
          )}
          <div className="kanban-grid" role="region" aria-label="Columnas del tablero" tabIndex={0}>
            {columns.map((column) => {
              const columnCards = cards.filter(
                (card) => card.status === column.id,
              );
              return (
                <section
                  key={column.id}
                  className={`kanban-column ${over === column.id ? "drop-active" : ""}`}
                  aria-labelledby={`heading-${column.id}`}
                  onDragOver={(event) => {
                    if (dragging) {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setOver(column.id);
                    }
                  }}
                  onDragLeave={(event) => {
                    if (
                      !event.currentTarget.contains(
                        event.relatedTarget as Node | null,
                      )
                    )
                      setOver(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (dragging) move(dragging, column.id);
                    setDragging(null);
                    setOver(null);
                  }}
                >
                  <div className="column-header">
                    <div className="column-heading">
                      <h2 id={`heading-${column.id}`}>
                        <span className={`status-dot ${column.id}`} />
                        {column.title}
                        <span className="column-count">{columnCards.length}</span>
                      </h2>
                      <div className="column-actions">
                      <button
                        className="icon-button"
                        aria-label={`Agregar tarjeta a ${column.title}`}
                        onClick={() => setComposer(column.id)}
                      >
                        <Plus size={18} aria-hidden="true" />
                      </button>
                        <DeleteButton label={`Eliminar columna ${column.title}`} onClick={() => {
                          setPendingDelete({ kind: "column", id: column.id, title: column.title });
                        }} />
                      </div>
                    </div>
                    {column.description && <p className="column-description">{column.description}</p>}
                  </div>
                  <div className="card-list">
                    {columnCards.map((card) => (
                      <article
                        key={card.id}
                        draggable
                        className={`task-card ${dragging === card.id ? "is-dragging" : ""}`}
                        onDragStart={(event) => {
                          event.dataTransfer.setData("text/plain", card.id);
                          event.dataTransfer.effectAllowed = "move";
                          setDragging(card.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                      >
                        <div className="card-topline">
                          <span className={`card-category ${column.id}`}>
                            {column.id === "done"
                              ? "Completado"
                              : column.id === "in-progress"
                                ? "En marcha"
                                : column.id === "todo" ? "Por explorar" : column.title}
                          </span>
                          <div className="card-actions">
                            <GripVertical className="drag-handle" size={16} aria-hidden="true" />
                            <DeleteButton label={`Eliminar tarjeta ${card.title}`} onClick={() => {
                              setPendingDelete({ kind: "card", id: card.id, title: card.title });
                            }} />
                          </div>
                        </div>
                        <h3>{card.title}</h3>
                        {card.description && (
                          <p className="card-description">{card.description}</p>
                        )}
                        <div className="card-footer">
                          <span
                            className={`card-marker ${column.id}`}
                            aria-hidden="true"
                          >
                            {column.id === "done" ? <Check size={16} /> : <Circle size={15} />}
                          </span>
                          <div className="card-status-select">
                          <select
                            aria-label={`Estado de ${card.title}`}
                            value={card.status}
                            onChange={(event) =>
                              move(card.id, event.target.value as Status)
                            }
                          >
                            {columns.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.title}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} aria-hidden="true" />
                          </div>
                        </div>
                      </article>
                    ))}
                    {columnCards.length === 0 && (
                      <p className="empty-column">
                        Tu próximo avance empieza aquí.
                        <br />
                        Arrastra una tarjeta a esta columna.
                      </p>
                    )}
                  </div>
                  {composer === column.id ? (
                    <CardComposer
                      status={column.id}
                      onAdd={addCard}
                      onClose={() => setComposer(null)}
                    />
                  ) : (
                    <button
                      className="add-card"
                      onClick={() => setComposer(column.id)}
                    >
                      <Plus size={16} aria-hidden="true" />Agregar tarjeta
                    </button>
                  )}
                </section>
              );
            })}
            <div className="column-creator">
              {addingColumn ? (
                <form className="composer" onSubmit={(event) => {
                  event.preventDefault();
                  const id = addColumn(columnTitle);
                  if (!id) return;
                  setAnnouncement(`Columna ${columnTitle.trim()} creada.`);
                  setColumnTitle("");
                  setAddingColumn(false);
                }} onKeyDown={(event) => {
                  if (event.key === "Escape") { setAddingColumn(false); setColumnTitle(""); }
                }}>
                  <label htmlFor="column-title">Nombre de la columna</label>
                  <input id="column-title" autoFocus required maxLength={80} value={columnTitle} onChange={(event) => setColumnTitle(event.target.value)} placeholder="Ej. En revisión" />
                  <div className="flex gap-2">
                    <button className="primary-button" disabled={!columnTitle.trim()}>Crear columna</button>
                    <button className="quiet-button" type="button" onClick={() => { setAddingColumn(false); setColumnTitle(""); }}>Cancelar</button>
                  </div>
                </form>
              ) : <button className="add-column" onClick={() => setAddingColumn(true)}><Plus size={16} aria-hidden="true" /> Agregar columna</button>}
            </div>
          </div>
          <footer className="board-footer">
            <ArrowLeftRight size={15} aria-hidden="true" />Arrastra las tarjetas para cambiar
            su estado.
            <span className="footer-private">
              Solo tú, tus ideas y un poco de flow.
            </span>
          </footer>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>}
      </main>
      {pendingDelete && (
        <ConfirmDeleteModal
          title={pendingDelete.kind === "column" ? "Eliminar columna" : "Eliminar tarjeta"}
          description={pendingDelete.kind === "column"
            ? `Se eliminará la columna «${pendingDelete.title}» y sus ${cards.filter(card => card.status === pendingDelete.id).length} tarjetas. Esta acción no se puede deshacer.`
            : `Se eliminará la tarjeta «${pendingDelete.title}». Esta acción no se puede deshacer.`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
