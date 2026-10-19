import { useState } from 'react'
import { CardComposer } from './components/CardComposer'
import { useBoard } from './hooks/useBoard'
import { columns } from './lib/board'
import type { Status } from './lib/board'

export default function App() {
  const { cards, storageError, addCard, moveCard } = useBoard()
  const [composer, setComposer] = useState<Status | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<Status | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const completed = cards.filter(card => card.status === 'done').length
  function move(id: string, status: Status) {
    moveCard(id, status)
    setAnnouncement(`Tarjeta movida a ${columns.find(column => column.id === status)?.title}.`)
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#board"><span className="brand-mark">v</span>viflow<span className="brand-dot">.</span></a>
      <div className="workspace"><span className="workspace-icon">P</span><div><strong>Mi espacio</strong><small>Un lugar para tus ideas</small></div></div>
      <p className="nav-label">ESPACIO DE TRABAJO</p>
      <a className="nav-item" href="#board" aria-current="page"><span aria-hidden="true">▦</span><span className="nav-text">Mi tablero</span><span className="nav-count">1</span></a>
      <div className="sidebar-note"><span aria-hidden="true">✳</span><strong>Un paso a la vez.</strong><p>Las grandes ideas se construyen con pequeños avances.</p></div>
      <div className="profile"><span className="avatar">T</span><div><strong>Tu espacio personal</strong><small>Hecho para fluir</small></div></div>
    </aside>
    <main id="board" className="main-content">
      <header className="topbar"><div>Mi espacio <span>/</span> <strong>Mi tablero</strong></div><span className="local-badge"><span />Guardado local</span></header>
      <div className="board-content">
        <section className="board-heading" aria-labelledby="board-title"><div><p className="eyebrow">MENOS RUIDO, MÁS ENFOQUE</p><h1 id="board-title">Mi tablero<span>.</span></h1><p className="board-subtitle">Dale espacio a tus ideas y movimiento a tus proyectos.</p></div><button className="primary-button new-card" onClick={() => setComposer('todo')}><span aria-hidden="true">＋</span>Nueva tarjeta</button></section>
        <div className="board-toolbar"><span className="board-tab"><span aria-hidden="true">▥</span>Tablero</span><span className="task-summary">{cards.length} tarjetas · {completed} completadas</span></div>
        {storageError && <p role="alert" className="storage-warning">No pudimos guardar en este navegador. Los cambios solo se mantendrán mientras esta página siga abierta.</p>}
        <div className="kanban-grid">{columns.map(column => {
          const columnCards = cards.filter(card => card.status === column.id)
          return <section key={column.id} className={`kanban-column ${over === column.id ? 'drop-active' : ''}`} aria-labelledby={`heading-${column.id}`}
            onDragOver={event => { if (dragging) { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setOver(column.id) } }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null) }}
            onDrop={event => { event.preventDefault(); if (dragging) move(dragging, column.id); setDragging(null); setOver(null) }}>
            <div className="column-heading"><h2 id={`heading-${column.id}`}><span className={`status-dot ${column.id}`} />{column.title}<span className="column-count">{columnCards.length}</span></h2><button className="icon-button" aria-label={`Agregar tarjeta a ${column.title}`} onClick={() => setComposer(column.id)}>＋</button></div>
            <p className="column-description">{column.description}</p>
            <div className="card-list">{columnCards.map(card => <article key={card.id} draggable className={`task-card ${dragging === card.id ? 'is-dragging' : ''}`}
              onDragStart={event => { event.dataTransfer.setData('text/plain', card.id); event.dataTransfer.effectAllowed = 'move'; setDragging(card.id) }} onDragEnd={() => { setDragging(null); setOver(null) }}>
              <div className="card-topline"><span className={`card-category ${column.id}`}>{column.id === 'done' ? 'Completado' : column.id === 'in-progress' ? 'En marcha' : 'Por explorar'}</span><span className="drag-handle" aria-hidden="true">⠿</span></div>
              <h3>{card.title}</h3>{card.description && <p className="card-description">{card.description}</p>}
              <div className="card-footer"><span className={`card-marker ${column.id}`} aria-hidden="true">{column.id === 'done' ? '✓' : '○'}</span><select aria-label={`Estado de ${card.title}`} value={card.status} onChange={event => move(card.id, event.target.value as Status)}>{columns.map(option => <option key={option.id} value={option.id}>{option.title}</option>)}</select></div>
            </article>)}{columnCards.length === 0 && <p className="empty-column">Tu próximo avance empieza aquí.<br />Arrastra una tarjeta a esta columna.</p>}</div>
            {composer === column.id ? <CardComposer status={column.id} onAdd={addCard} onClose={() => setComposer(null)} /> : <button className="add-card" onClick={() => setComposer(column.id)}><span aria-hidden="true">＋</span>Agregar tarjeta</button>}
          </section>
        })}</div>
        <footer className="board-footer"><span aria-hidden="true">↔</span>Arrastra las tarjetas para cambiar su estado.<span className="footer-private">Solo tú, tus ideas y un poco de flow.</span></footer>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
    </main>
  </div>
}
