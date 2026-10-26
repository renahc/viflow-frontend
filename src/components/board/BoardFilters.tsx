import * as m from 'motion/react-m'
import { popupVariants } from '../motion/presets'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, Check, Flag, ListFilter, Search, SlidersHorizontal, Tag, X } from 'lucide-react'
import type { Label } from '../../lib/labels'
import { labelColors } from '../../lib/labels'
import { priorities } from '../../lib/cardSchedule'
import { emptyCardFilters } from '../../lib/cardFilters'
import type { CardFilters } from '../../lib/cardFilters'

const dates = { overdue: 'Vencidas', today: 'Hoy', soon: 'Mañana', dated: 'Con fecha', none: 'Sin fecha' }
const states = { pending: 'Pendientes', completed: 'Completadas' }
type Props = { value: CardFilters; onChange: (value: CardFilters) => void; labels: Label[]; count: number; total: number }
export function BoardFilters({ value, onChange, labels, count, total }: Props) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const id = useId()
  const active = Object.values(value).some(Boolean)
  const number = [value.label, value.priority, value.due, value.status].filter(Boolean).length
  const update = (field: keyof CardFilters, next: string) => onChange({ ...value, [field]: next })
  const close = () => { setPosition(null); trigger.current?.focus() }
  useEffect(() => {
    if (!position) return
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus()
    function outside(event: PointerEvent) {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null)
    }
    function resize() { setPosition(null) }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize) }
  }, [position])
  const groups = [
    { field: 'status' as const, title: 'Estado', icon: ListFilter, options: Object.entries(states) },
    { field: 'priority' as const, title: 'Prioridad', icon: Flag, options: Object.entries(priorities) },
    { field: 'due' as const, title: 'Vencimiento', icon: CalendarDays, options: Object.entries(dates) },
    { field: 'label' as const, title: 'Etiquetas', icon: Tag, options: labels.map(label => [label.id, label.name]) },
  ]
  return <>
    <div className="board-filters" role="search" aria-label="Buscar y filtrar tarjetas">
      <div className="board-filter-main">
        <label className="board-search"><Search size={17} aria-hidden="true" /><input type="search" aria-label="Buscar tarjetas" placeholder="Encuentra una tarjeta…" value={value.query} onChange={event => update('query', event.target.value)} /></label>
        <button ref={trigger} type="button" className={`board-filter-trigger ${number ? 'has-filters' : ''}`} aria-expanded={!!position} aria-controls={position ? id : undefined} onClick={() => {
          if (position) { setPosition(null); return }
          const rect = trigger.current!.getBoundingClientRect()
          setPosition({ left: Math.max(12, Math.min(rect.right - 360, window.innerWidth - 372)), top: Math.min(rect.bottom + 10, Math.max(12, window.innerHeight - 380)) })
        }}><SlidersHorizontal size={15} aria-hidden="true" />Filtros{number > 0 && <span>{number}</span>}</button>
        <span className="filter-results" role="status" aria-live="polite">{active ? `${count} de ${total} tarjetas` : ''}</span>
      </div>
      {active && <div className="board-filter-chips" aria-label="Filtros activos">
        {groups.filter(group => value[group.field]).map(group => <button key={group.field} type="button" className="board-filter-chip" onClick={() => update(group.field, '')} aria-label={`Quitar filtro ${group.title}`}><group.icon size={12} />{group.options.find(([key]) => key === value[group.field])?.[1] ?? 'Etiqueta eliminada'}<X size={12} /></button>)}
        <button type="button" className="filter-clear" onClick={() => onChange({ ...emptyCardFilters })}>Limpiar todo</button>
      </div>}
    </div>
    {position && createPortal(<m.div id={id} ref={popup} variants={popupVariants} initial="hidden" animate="visible" className="board-filter-popup" style={{ ...position, maxHeight: `calc(100dvh - ${position.top + 12}px)` }} role="dialog" aria-label="Filtros del tablero" onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close() } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget !== trigger.current) setPosition(null) }}>
      <div className="filter-popup-heading"><div><strong>Enfoca tu tablero</strong><p>Quédate con lo que necesitas ver.</p></div><button type="button" className="icon-button" aria-label="Cerrar filtros" onClick={close}><X size={16} /></button></div>
      <div className="filter-popup-body">{groups.map(group => <fieldset key={group.field}><legend><group.icon size={13} />{group.title}</legend><div className="filter-option-list">{group.options.map(([key, title]) => {
        const label = group.field === 'label' ? labels.find(label => label.id === key) : undefined
        const color = labelColors.find(color => color.id === label?.color)?.text
        return <button type="button" key={key} aria-pressed={value[group.field] === key} onClick={() => update(group.field, value[group.field] === key ? '' : key)}>{color && <span className="filter-label-dot" style={{ background: color }} />}{title}{value[group.field] === key && <Check size={12} />}</button>
      })}{!group.options.length && <span className="filter-no-labels">Aún no hay etiquetas en este tablero.</span>}</div></fieldset>)}</div>
      <div className="filter-popup-footer"><span>{count} {count === 1 ? 'tarjeta visible' : 'tarjetas visibles'}</span><button type="button" onClick={close}>Ver resultados</button></div>
    </m.div>, document.body)}
  </>
}
