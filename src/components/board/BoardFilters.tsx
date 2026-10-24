import { Search, SlidersHorizontal, X } from 'lucide-react'
import type { Label } from '../../lib/labels'
import { priorities } from '../../lib/cardSchedule'
import { emptyCardFilters } from '../../lib/cardFilters'
import type { CardFilters } from '../../lib/cardFilters'

type Props = { value: CardFilters; onChange: (value: CardFilters) => void; labels: Label[]; count: number; total: number }
export function BoardFilters({ value, onChange, labels, count, total }: Props) {
  const active = Object.values(value).some(Boolean)
  const update = (field: keyof CardFilters, next: string) => onChange({ ...value, [field]: next })
  return <div className="board-filters" role="search" aria-label="Buscar y filtrar tarjetas">
    <label className="board-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Buscar tarjetas" placeholder="Buscar tarjetas…" value={value.query} onChange={event => update('query', event.target.value)} /></label>
    <span className="filter-caption"><SlidersHorizontal size={15} aria-hidden="true" />Filtrar</span>
    <select aria-label="Filtrar por etiqueta" value={value.label} onChange={event => update('label', event.target.value)}><option value="">Todas las etiquetas</option>{labels.map(label => <option key={label.id} value={label.id}>{label.name}</option>)}</select>
    <select aria-label="Filtrar por prioridad" value={value.priority} onChange={event => update('priority', event.target.value)}><option value="">Todas las prioridades</option>{Object.entries(priorities).map(([id, title]) => <option key={id} value={id}>{title}</option>)}</select>
    <select aria-label="Filtrar por vencimiento" value={value.due} onChange={event => update('due', event.target.value)}><option value="">Cualquier fecha</option><option value="overdue">Vencidas</option><option value="today">Vencen hoy</option><option value="soon">Vencen mañana</option><option value="dated">Con fecha</option><option value="none">Sin fecha</option></select>
    <select aria-label="Filtrar por estado" value={value.status} onChange={event => update('status', event.target.value)}><option value="">Todos los estados</option><option value="pending">Pendientes</option><option value="completed">Completadas</option></select>
    {active && <button type="button" className="quiet-button" onClick={() => onChange({ ...emptyCardFilters })}><X size={14} />Limpiar</button>}
    <span className="filter-results" role="status" aria-live="polite">{active ? `${count} de ${total} tarjetas` : ''}</span>
  </div>
}
