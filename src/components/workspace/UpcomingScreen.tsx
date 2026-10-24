import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUpRight, CalendarDays, CalendarRange, CircleCheck, Clock3, Flag, Kanban } from 'lucide-react'
import { upcomingCards } from '../../lib/upcoming'
import { formatDueDate, priorities } from '../../lib/cardSchedule'
import { boardPath } from '../../lib/routes'
import type { WorkspaceBoard } from '../../lib/workspace'
const groups = [
  {id:'overdue' as const,title:'Vencidas',hint:'Un poco de atención para retomar el ritmo.',icon:Clock3},
  {id:'today' as const,title:'Hoy',hint:'Tu foco para este día.',icon:CalendarDays},
  {id:'week' as const,title:'Esta semana',hint:'Lo que viene, hasta el domingo.',icon:CalendarRange},
]
export function UpcomingScreen({ boards }: { boards: WorkspaceBoard[] }) {
  useEffect(() => { const previous = document.title; document.title = 'Vencimientos · viflow'; return () => { document.title = previous } }, [])
  const [now,setNow]=useState(()=>new Date())
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60_000);return()=>window.clearInterval(timer)},[])
  const entries=upcomingCards(boards,now)
  return <div className="upcoming-screen">
    <header className="upcoming-header"><span className="upcoming-eyebrow"><CalendarDays size={14} />TU AGENDA</span><h1>Un paso a tiempo<span>.</span></h1><p>Los próximos vencimientos de todos tus tableros, en un solo lugar.</p><span className="upcoming-date">{new Intl.DateTimeFormat('es-CL',{weekday:'long',day:'numeric',month:'long'}).format(now)}</span></header>
    <div className="upcoming-groups">{groups.map(group=> {
      const cards=entries.filter(entry=>entry.group===group.id)
      return <section key={group.id} className={`upcoming-group upcoming-${group.id}`} aria-labelledby={`upcoming-${group.id}`}><div className="upcoming-group-heading"><span><group.icon size={17} /></span><div><h2 id={`upcoming-${group.id}`}>{group.title}<small>{cards.length}</small></h2><p>{group.hint}</p></div></div>
        {cards.length ? <ul>{cards.map(({board,card})=><li key={`${board.id}:${card.id}`}><Link className="upcoming-card" to={`${boardPath(board.id)}?card=${encodeURIComponent(card.id)}`}><span className="upcoming-card-context"><Kanban size={12} />{board.title}<ArrowUpRight size={13} /></span><h3>{card.title}</h3><span className="upcoming-column">{board.columns.find(column=>column.id===card.status)?.title}</span><div className="upcoming-card-meta"><span><CalendarDays size={12} />{formatDueDate(card.dueDate!)}</span>{card.priority && card.priority!=='none' && <span className={`priority-badge priority-${card.priority}`}><Flag size={11} />{priorities[card.priority]}</span>}</div></Link></li>)}</ul> : <div className="upcoming-empty"><CircleCheck size={22} /><p>{group.id==='overdue'?'Todo al día por aquí.':group.id==='today'?'Sin vencimientos para hoy.':'Nada más pendiente esta semana.'}</p></div>}
      </section>
    })}</div><p className="upcoming-footnote">Solo se muestran tarjetas pendientes con fecha. Los tableros y las tarjetas archivados quedan fuera de esta vista.</p>
  </div>
}
