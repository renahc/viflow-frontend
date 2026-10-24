import { useState } from 'react'
import { ListChecks, Plus, X } from 'lucide-react'
import type { ChecklistItem } from '../../lib/checklist'
type Props = { items: ChecklistItem[]; onChange: (items: ChecklistItem[]) => void }
export function CardChecklist({ items, onChange }: Props) {
  const [draft, setDraft] = useState('')
  const completed = items.filter(item => item.completed).length
  function add() {
    if (!draft.trim() || items.length >= 100) return
    onChange([...items, { id: crypto.randomUUID(), title: draft.trim(), completed: false }]); setDraft('')
  }
  return <section className="card-checklist" aria-label="Checklist de la tarjeta">
    <div className="checklist-heading"><h3><ListChecks size={16} />Checklist</h3><span>{completed} de {items.length}</span></div>
    {!!items.length && <div className="checklist-track" role="progressbar" aria-label="Pasos completados" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={completed}><span style={{ width: `${completed / items.length * 100}%` }} /></div>}
    <ul>{items.map(item => <li key={item.id}><input type="checkbox" aria-label={`Completar ${item.title}`} checked={item.completed} onChange={() => onChange(items.map(current => current.id === item.id ? { ...current, completed: !current.completed } : current))} /><input type="text" aria-label={`Texto del paso ${item.title}`} maxLength={200} value={item.title} className={item.completed ? 'completed' : ''} onChange={event => onChange(items.map(current => current.id === item.id ? { ...current, title: event.target.value } : current))} /><button type="button" className="icon-button" aria-label={`Eliminar paso ${item.title}`} onClick={() => onChange(items.filter(current => current.id !== item.id))}><X size={14} /></button></li>)}</ul>
    {items.length < 100 && <div className="checklist-add"><input aria-label="Nuevo paso" placeholder="Agregar un paso…" maxLength={200} value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); add() } }} /><button type="button" aria-label="Agregar paso" disabled={!draft.trim()} onClick={add}><Plus size={16} /></button></div>}
    <small>Los pasos se guardan al pulsar «Guardar cambios».</small>
  </section>
}
