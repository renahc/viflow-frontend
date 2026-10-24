import type { Card } from './board'
import type { WorkspaceBoard } from './workspace'
export type DuplicateOptions = { title: string; keepDates: boolean; keepLabels: boolean }
export function duplicateCard(source: Card, options: DuplicateOptions): Card {
  return { id: crypto.randomUUID(), title: options.title.trim(), description: source.description, status: source.status,
    priority: source.priority, dueDate: options.keepDates ? source.dueDate : undefined,
    labelIds: options.keepLabels ? [...(source.labelIds ?? [])] : [],
    checklist: source.checklist?.map(item => ({ id: crypto.randomUUID(), title: item.title, completed: false })) }
}
export function duplicateBoard(source: WorkspaceBoard, options: DuplicateOptions): WorkspaceBoard {
  const labelIds = new Map((source.labels ?? []).map(label => [label.id, crypto.randomUUID()]))
  return { id: crypto.randomUUID(), title: options.title.trim(),
    // Client column keys are scoped to a board; retain done's completion semantics.
    columns: source.columns.map(({ id, title, description, color, sort }) => ({ id, title, description, color, sort })),
    labels: options.keepLabels ? (source.labels ?? []).map(label => ({ id: labelIds.get(label.id)!, name: label.name, color: label.color })) : [],
    cards: source.cards.filter(card => !card.archivedAt).map(card => {
      const copy = duplicateCard(card, { ...options, title: card.title })
      return { ...copy, labelIds: (copy.labelIds ?? []).flatMap(id => labelIds.has(id) ? [labelIds.get(id)!] : []) }
    }) }
}
