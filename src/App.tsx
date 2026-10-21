import { useState } from "react";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";
import { DeleteButton } from "./components/DeleteButton";
import { CardComposer } from "./components/CardComposer";
import { useBoard } from "./hooks/useBoard";
import type { Status } from "./lib/board";

export default function App() {
  const { columns, cards, storageError, addCard, moveCard, addColumn, deleteCard, deleteColumn } = useBoard();
  const [addingColumn, setAddingColumn] = useState(false);
  const [columnTitle, setColumnTitle] = useState("");
  const [composer, setComposer] = useState<Status | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Status | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pendingDelete, setPendingDelete] = useState<{ kind: "card" | "column"; id: string; title: string } | null>(null);

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
        <a className="brand" href="#board">
          viflow
          <span className="brand-dot">.</span>
        </a>
        <p className="nav-label">ESPACIO DE TRABAJO</p>
        <a className="nav-item" href="#board" aria-current="page">
          <span aria-hidden="true">▦</span>
          <span className="nav-text">Mi tablero</span>
          <span className="nav-count">1</span>
        </a>
        <div className="sidebar-note">
          <span aria-hidden="true">✳</span>
          <strong>Un paso a la vez.</strong>
          <p>Las grandes ideas se construyen con pequeños avances.</p>
        </div>
        <div className="profile">
          <span className="avatar">T</span>
          <div>
            <strong>Tu espacio personal</strong>
            <small>Hecho para fluir</small>
          </div>
        </div>
      </aside>
      <main id="board" className="main-content">
        <div className="board-content">
          <div className="board-toolbar">
            <span className="board-tab">
              <span aria-hidden="true">▥</span>Tablero
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
                        ＋
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
                            <span className="drag-handle" aria-hidden="true">⠿</span>
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
                            {column.id === "done" ? "✓" : "○"}
                          </span>
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
                      <span aria-hidden="true">＋</span>Agregar tarjeta
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
              ) : <button className="add-column" onClick={() => setAddingColumn(true)}><span aria-hidden="true">＋</span> Agregar columna</button>}
            </div>
          </div>
          <footer className="board-footer">
            <span aria-hidden="true">↔</span>Arrastra las tarjetas para cambiar
            su estado.
            <span className="footer-private">
              Solo tú, tus ideas y un poco de flow.
            </span>
          </footer>
          <p className="sr-only" role="status" aria-live="polite">
            {announcement}
          </p>
        </div>
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
