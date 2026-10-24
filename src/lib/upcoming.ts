import type { Card } from './board'
import type { WorkspaceBoard } from './workspace'
export type DueGroup = 'overdue' | 'today' | 'week'
export type DueEntry = { board: WorkspaceBoard; card: Card; group: DueGroup }
function day(date: Date) { return `${String(date.getFullYear()).padStart(4,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` }
export function upcomingCards(boards: WorkspaceBoard[], now = new Date()): DueEntry[] {
  const today=day(now)
  const sunday=new Date(now); sunday.setDate(sunday.getDate()+(7-sunday.getDay())%7)
  const end=day(sunday)
  return boards.filter(board=>!board.archivedAt).flatMap(board=>board.cards.flatMap(card=> {
    if (card.archivedAt || card.status==='done' || !card.dueDate || card.dueDate>end) return []
    const group: DueGroup=card.dueDate<today?'overdue':card.dueDate===today?'today':'week'
    return [{board,card,group}]
  })).sort((a,b)=>a.card.dueDate!.localeCompare(b.card.dueDate!))
}
