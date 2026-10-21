import { Plus } from 'lucide-react'
import type { Label } from '../lib/labels'
import { labelColors } from '../lib/labels'

export function LabelBadge({ label }: { label: Label }) {
  const color = labelColors.find(color => color.id === label.color) ?? labelColors[0]
  return <span className="label-badge" style={{ background: color.background, color: color.text }}>{label.name}</span>
}

export function CardLabels({ labels, cardTitle, onOpen }: { labels: Label[]; cardTitle: string; onOpen: () => void }) {
  return <div className="card-labels">
    {labels.map(label => <button type="button" key={label.id} className="label-badge-button" aria-label={`Editar etiquetas de ${cardTitle}: ${label.name}`} onClick={onOpen}><LabelBadge label={label} /></button>)}
    <button type="button" className="card-category" aria-label={`Agregar etiqueta a ${cardTitle}`} onClick={onOpen}>
      {labels.length === 0 && 'Agregar etiqueta'}<Plus size={11} aria-hidden="true" />
    </button>
  </div>
}
