import { accountDisplayName } from '../services/accountProfileService.ts'
import type { Board } from './board'

const activityKinds = ['archived', 'restored', 'due-date-edited', 'priority-edited', 'created', 'moved', 'reordered', 'title-edited', 'description-edited', 'label-added', 'label-removed'] as const
export type ActivityKind = (typeof activityKinds)[number]
export type CardActivity = { id: string; kind: ActivityKind; actor: string; message: string; createdAt: string; source?: 'account' | 'local_import' }
export type CardComment = { id: string; author: string; body: string; createdAt: string; source?: 'account' | 'local_import' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}
export function isCardComment(value: unknown): value is CardComment {
  return isRecord(value) && (value.source === undefined || value.source === 'account' || value.source === 'local_import') && typeof value.id === 'string' && !!value.id.trim()
    && typeof value.author === 'string' && !!value.author.trim()
    && typeof value.body === 'string' && !!value.body.trim() && value.body.length <= 2000
    && isTimestamp(value.createdAt)
}
export function isCardActivity(value: unknown): value is CardActivity {
  return isRecord(value) && (value.source === undefined || value.source === 'account' || value.source === 'local_import') && typeof value.id === 'string' && !!value.id.trim()
    && activityKinds.some(kind => kind === value.kind)
    && typeof value.actor === 'string' && !!value.actor.trim()
    && typeof value.message === 'string' && !!value.message.trim() && isTimestamp(value.createdAt)
}

export function readActivityActor(user?: { email_confirmed_at?: string; user_metadata?: Record<string, unknown> } | null): string {
  if (user?.email_confirmed_at) return accountDisplayName(user.user_metadata) || 'Tu cuenta'
  try {
    const profile: unknown = JSON.parse(localStorage.getItem('viflow.profile.v1') ?? 'null')
    if (isRecord(profile) && typeof profile.name === 'string' && profile.name.trim()) return profile.name.trim()
  } catch { /* A local profile is optional. */ }
  return 'Tú'
}

export function appendCardActivity(board: Board, cardId: string, kind: ActivityKind, message: string, actor: string): Board {
  if (!board.cards.some(card => card.id === cardId)) return board
  const entry: CardActivity = { id: crypto.randomUUID(), kind, message, actor: actor.trim() || 'Tú', createdAt: new Date().toISOString() }
  return { ...board, cards: board.cards.map(card => card.id === cardId
    ? { ...card, activity: [entry, ...(card.activity ?? [])] } : card) }
}

export function addCardComment(board: Board, cardId: string, body: string, author: string): { board: Board; error?: string } {
  const trimmed = body.trim()
  if (!trimmed || trimmed.length > 2000) return { board, error: 'Escribe un comentario de hasta 2000 caracteres.' }
  if (!board.cards.some(card => card.id === cardId)) return { board, error: 'La tarjeta ya no existe.' }
  const comment: CardComment = { id: crypto.randomUUID(), body: trimmed, author: author.trim() || 'Tú', createdAt: new Date().toISOString() }
  return { board: { ...board, cards: board.cards.map(card => card.id === cardId
    ? { ...card, comments: [comment, ...(card.comments ?? [])] } : card) } }
}
