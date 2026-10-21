import { useState } from 'react'
import type { DragEvent } from 'react'
import type { Status } from '../lib/board'

type DropTarget = { columnId: string; beforeId: string | null }
type MoveCard = (id: string, status: Status, beforeId?: string | null) => void

function findBeforeId(column: HTMLElement, draggingId: string, pointerY: number) {
  if (column.dataset.sort === 'priority') return null
  const cards = Array.from(column.querySelectorAll<HTMLElement>('[data-card-id]'))
  return cards.find(element => {
    if (element.dataset.cardId === draggingId) return false
    const rect = element.getBoundingClientRect()
    return pointerY < rect.top + rect.height / 2
  })?.dataset.cardId ?? null
}

export function useCardDrag(onMove: MoveCard) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)

  function reset() {
    setDraggingId(null)
    setDropTarget(null)
  }

  function start(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'move'
    setDraggingId(id)
    setDropTarget(null)
  }

  function over(event: DragEvent<HTMLElement>, columnId: string) {
    if (!draggingId) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    const beforeId = findBeforeId(event.currentTarget, draggingId, event.clientY)
    setDropTarget(current => current?.columnId === columnId && current.beforeId === beforeId
      ? current : { columnId, beforeId })
  }

  function leave(event: DragEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDropTarget(null)
  }

  function drop(event: DragEvent<HTMLElement>, columnId: string) {
    event.preventDefault()
    if (draggingId) {
      // Read the final pointer position, even if the last dragover render is still pending.
      onMove(draggingId, columnId, findBeforeId(event.currentTarget, draggingId, event.clientY))
    }
    reset()
  }

  return { draggingId, dropTarget, start, over, leave, drop, reset }
}

export type CardDrag = ReturnType<typeof useCardDrag>
