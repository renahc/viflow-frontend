import * as m from 'motion/react-m'
import { popupVariants } from '../motion/presets'
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Archive, Copy, Ellipsis } from 'lucide-react'
type Props = { title: string; onDuplicate: () => void; onArchive: () => void }
export function CardOptions({ title, onDuplicate, onArchive }: Props) {
  const [position, setPosition] = useState<{ top:number; left:number } | null>(null)
  const trigger=useRef<HTMLButtonElement>(null)
  const popup=useRef<HTMLDivElement>(null)
  const id=useId()
  function close(focus=false) { setPosition(null); if (focus) trigger.current?.focus() }
  useEffect(() => {
    if (!position) return
    popup.current?.querySelector<HTMLButtonElement>('button')?.focus()
    function outside(event: PointerEvent) { if (!popup.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setPosition(null) }
    function layout(event: Event) { if (!popup.current?.contains(event.target as Node)) setPosition(null) }
    document.addEventListener('pointerdown',outside); window.addEventListener('resize',layout); window.addEventListener('scroll',layout,true)
    return () => { document.removeEventListener('pointerdown',outside); window.removeEventListener('resize',layout); window.removeEventListener('scroll',layout,true) }
  },[position])
  return <><button ref={trigger} type="button" className="delete-button" aria-label={`Opciones de tarjeta ${title}`} title="Opciones de tarjeta" aria-expanded={!!position} aria-controls={position ? id : undefined} onClick={() => {
    if (position) { close(); return }
    const rect=trigger.current!.getBoundingClientRect()
    setPosition({left:Math.max(8,Math.min(rect.right-220,window.innerWidth-228)),top:Math.max(8,Math.min(rect.bottom+6,window.innerHeight-110))})
  }}><Ellipsis size={16} /></button>{position && createPortal(<m.div ref={popup} variants={popupVariants} initial="hidden" animate="visible" id={id} role="group" aria-label={`Acciones de ${title}`} className="column-options-popup" style={position} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); close(true) } }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && event.relatedTarget !== trigger.current) close() }}>
    <button type="button" onClick={() => { close(true); onDuplicate() }}><Copy size={14} />Duplicar tarjeta</button><div className="column-options-divider" /><button type="button" className="column-delete-option" onClick={() => { close(true); onArchive() }}><Archive size={14} />Archivar tarjeta</button>
  </m.div>,document.body)}</>
}
