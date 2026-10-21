import type { Board } from './board'

export const labelColors = [
  { id: 'purple', name: 'Morado', background: '#eae2f3', text: '#563776' },
  { id: 'rose', name: 'Rosa', background: '#f4e2eb', text: '#873e60' },
  { id: 'blue', name: 'Azul', background: '#e2e9f5', text: '#3f5e89' },
  { id: 'teal', name: 'Petróleo', background: '#dfedec', text: '#356b67' },
  { id: 'amber', name: 'Ámbar', background: '#f5ecd9', text: '#856525' },
  { id: 'slate', name: 'Gris', background: '#e8e5ed', text: '#62596f' },
] as const
export type LabelColor = (typeof labelColors)[number]['id']
export type Label = { id: string; name: string; color: LabelColor }

export function isLabelColor(value: unknown): value is LabelColor {
  return labelColors.some(color => color.id === value)
}

export function isLabel(value: unknown): value is Label {
  if (typeof value !== 'object' || value === null) return false
  const label = value as Record<string, unknown>
  return typeof label.id === 'string' && !!label.id.trim()
    && typeof label.name === 'string' && !!label.name.trim() && label.name.length <= 32
    && isLabelColor(label.color)
}

export function createCardLabel(board: Board, cardId: string, name: string, color: LabelColor): { board: Board; error?: string } {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 32) return { board, error: 'Escribe un nombre de hasta 32 caracteres.' }
  if (!isLabelColor(color)) return { board, error: 'Selecciona un color de la paleta.' }
  if (!board.cards.some(card => card.id === cardId)) return { board, error: 'Esta tarjeta ya no existe.' }
  const labels = board.labels ?? []
  if (labels.some(label => label.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase())) {
    return { board, error: 'Ya existe una etiqueta con ese nombre. Puedes seleccionarla arriba.' }
  }
  const label: Label = { id: crypto.randomUUID(), name: trimmed, color }
  return { board: { ...board, labels: [...labels, label], cards: board.cards.map(card => card.id === cardId
    ? { ...card, labelIds: [...(card.labelIds ?? []), label.id] } : card) } }
}

export function toggleCardLabel(board: Board, cardId: string, labelId: string): Board {
  if (!board.labels?.some(label => label.id === labelId) || !board.cards.some(card => card.id === cardId)) return board
  return { ...board, cards: board.cards.map(card => {
    if (card.id !== cardId) return card
    const ids = card.labelIds ?? []
    return { ...card, labelIds: ids.includes(labelId) ? ids.filter(id => id !== labelId) : [...ids, labelId] }
  }) }
}

export function deleteBoardLabel(board: Board, labelId: string): Board {
  if (!board.labels?.some(label => label.id === labelId)) return board
  return {
    ...board,
    labels: board.labels.filter(label => label.id !== labelId),
    cards: board.cards.map(card => card.labelIds?.includes(labelId)
      ? { ...card, labelIds: card.labelIds.filter(id => id !== labelId) } : card),
  }
}
