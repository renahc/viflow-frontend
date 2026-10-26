import * as m from 'motion/react-m'
import { popupVariants } from '../motion/presets'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDownWideNarrow, Check, Ellipsis, Trash2 } from 'lucide-react'
import type { Column } from '../../lib/board'
import type { ColumnSort } from '../../lib/columnSort'

type Props = { column: Column; onSort: (sort: ColumnSort) => void; onDelete: () => void }

export function ColumnOptions({ column, onSort, onDelete }: Props) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const id = useId()

  function close(restoreFocus = false) {
    setPosition(null)
    if (restoreFocus) trigger.current?.focus()
  }

  useEffect(() => {
    if (!position) return
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus()
    function outside(event: PointerEvent) {
      if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null)
    }
    function layoutChange(event: Event) {
      if (!popup.current?.contains(event.target as Node)) setPosition(null)
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', layoutChange)
    window.addEventListener('scroll', layoutChange, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', layoutChange)
      window.removeEventListener('scroll', layoutChange, true)
    }
  }, [position])

  return <>
    <button ref={trigger} className="icon-button" type="button" aria-label={`Opciones de columna ${column.title}`} aria-expanded={!!position} aria-controls={position ? id : undefined}
      onClick={() => {
        if (position) { close(); return }
        const rect = trigger.current!.getBoundingClientRect()
        setPosition({ left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)), top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 200)) })
      }}><Ellipsis size={18} aria-hidden="true" /></button>
    {position && createPortal(<m.div ref={popup} variants={popupVariants} initial="hidden" animate="visible" id={id} className="column-options-popup" style={position} role="group" aria-label={`Opciones de columna ${column.title}`}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true) } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget !== trigger.current) close() }}>
      <p><ArrowDownWideNarrow size={14} aria-hidden="true" />Ordenar por</p>
      {(['manual', 'priority'] as const).map(sort => <button key={sort} type="button" aria-pressed={(column.sort ?? 'manual') === sort}
        onClick={() => { onSort(sort); close(true) }}>
        <span>{sort === 'manual' ? 'Manual' : 'Prioridad'}</span>{(column.sort ?? 'manual') === sort && <Check size={14} aria-hidden="true" />}
      </button>)}
      <div className="column-options-divider" />
      <button className="column-delete-option" type="button" onClick={() => { close(true); onDelete() }}><Trash2 size={14} aria-hidden="true" />Eliminar columna</button>
    </m.div>, document.body)}
  </>
}
