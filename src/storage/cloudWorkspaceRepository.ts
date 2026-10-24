import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWorkspace } from '../lib/workspace.ts'
import type { Workspace, WorkspaceBoard } from '../lib/workspace.ts'
import { formatDueDate } from '../lib/cardSchedule.ts'

export type CloudSnapshot = { workspace: Workspace; revisions: Record<string, number> }
export type CloudChange = { board: Record<string, unknown>; expectedRevision: number; position: number }
export type CloudRequest = { changes: CloudChange[]; operationId: string }
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_cloud_response')
  return value as Record<string, unknown>
}
function withoutNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutNulls)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([, value]) => value !== null).map(([key, value]) => [key, withoutNulls(value)]))
  return value
}
function activityMessage(value: unknown, titles: Record<string, unknown>): string {
  const entry = record(value)
  const details = record(entry.details ?? {})
  if (entry.source === 'local_import') {
    if (typeof details.imported_message !== 'string' || !details.imported_message.trim()) throw new Error('invalid_cloud_activity')
    return details.imported_message
  }
  const column = details.column_id
  const target = typeof column === 'string' ? column : column && typeof column === 'object' ? record(column).to : ''
  const title = typeof target === 'string' && typeof titles[target] === 'string' ? titles[target] : 'otra columna'
  switch (entry.kind) {
    case 'created': return `creó la tarjeta en «${title}».`
    case 'moved': return `movió la tarjeta a «${title}».`
    case 'reordered': return 'reordenó la tarjeta.'
    case 'archived': return 'archivó la tarjeta.'
    case 'restored': return 'restauró la tarjeta.'
    case 'title-edited': return 'actualizó el título de la tarjeta.'
    case 'description-edited': return 'actualizó la descripción.'
    case 'priority-edited': return 'actualizó la prioridad.'
    case 'due-date-edited': return typeof details.due_date === 'string' ? `cambió el vencimiento al ${formatDueDate(details.due_date)}.` : 'quitó la fecha de vencimiento.'
    case 'label-added': return `agregó la etiqueta «${String(details.label_name ?? '')}».`
    case 'label-removed': return `quitó la etiqueta «${String(details.label_name ?? '')}».`
    default: throw new Error('invalid_cloud_activity')
  }
}
export function decodeCloudSnapshot(value: unknown): CloudSnapshot {
  const data = record(withoutNulls(value))
  if (!Array.isArray(data.boards)) throw new Error('invalid_cloud_response')
  const boards = data.boards.map(value => {
    const board = record(value)
    if (!Array.isArray(board.cards)) throw new Error('invalid_cloud_response')
    const titles = record(board._columnTitles ?? {})
    return { ...board, cards: board.cards.map(value => {
      const card = record(value)
      if (!Array.isArray(card.activity)) throw new Error('invalid_cloud_response')
      return { ...card, activity: card.activity.map(value => ({ ...record(value), message: activityMessage(value, titles) })) }
    }) }
  })
  const workspace = parseWorkspace({ boards, activeBoardId: '', openBoardIds: [] })
  const revisions = record(data.revisions)
  if (!workspace || workspace.boards.some(board => !Number.isSafeInteger(revisions[board.id]) || Number(revisions[board.id]) < 1)) throw new Error('invalid_cloud_response')
  return { workspace, revisions: revisions as Record<string, number> }
}
function content(board: WorkspaceBoard): Record<string, unknown> {
  return {
    id: board.id, title: board.title, archivedAt: board.archivedAt,
    columns: board.columns.map(({ id, title, description, color, sort }) => ({ id, title, description, color, sort })),
    labels: (board.labels ?? []).map(({ id, name, color }) => ({ id, name, color })),
    cards: board.cards.map(card => ({ checklist: (card.checklist ?? []).map(({ id, title, completed }) => ({ id, title, completed })), id: card.id, title: card.title, description: card.description, status: card.status,
      priority: card.priority ?? 'none', dueDate: card.dueDate || undefined, archivedAt: card.archivedAt,
      labelIds: [...(card.labelIds ?? [])].sort(), comments: (card.comments ?? []).map(({ id, body }) => ({ id, body })) })),
  }
}
export function createCloudRequest(previous: CloudSnapshot, next: Workspace): CloudRequest {
  const changes = next.boards.flatMap((board, position) => {
    const oldIndex = previous.workspace.boards.findIndex(old => old.id === board.id)
    const old = previous.workspace.boards[oldIndex]
    return old && oldIndex === position && JSON.stringify(content(old)) === JSON.stringify(content(board)) ? []
      : [{ board: content(board), expectedRevision: previous.revisions[board.id] ?? 0, position }]
  })
  return { changes, operationId: crypto.randomUUID() }
}
export function createCloudWorkspaceRepository(client: Pick<SupabaseClient, 'rpc'>) {
  return {
    async load() {
      const { data, error } = await client.rpc('viflow_load_workspace')
      if (error) throw error
      return decodeCloudSnapshot(data)
    },
    async save(request: CloudRequest) {
      if (request.changes.some(change => (change.board.cards as { checklist?: unknown[] }[]).some(card => card.checklist?.length))) {
        const capability = await client.rpc('viflow_checklist_version')
        if (capability.error || capability.data !== 1) throw new Error('checklist_migration_required')
      }
      const { data, error } = await client.rpc('viflow_save_workspace', { p_changes: request.changes, p_operation_id: request.operationId })
      if (error) throw error
      return decodeCloudSnapshot(data)
    },
  }
}
export function cloudWorkspaceError(error: unknown): { conflict: boolean; message: string } {
  const value = error && typeof error === 'object' ? error as { code?: string; message?: string } : {}
  if (value.message === 'offline_pending') return { conflict: false, message: 'Sin conexión. Tus cambios están pendientes de guardarse en tu cuenta. Cuando vuelva internet, pulsa Reintentar.' }
  if (value.message === 'checklist_migration_required') return { conflict: false, message: 'Falta activar las checklists. Ejecuta 202610240002_card_checklists.sql en Supabase y reintenta; conservamos tu borrador.' }
  if (value.message?.startsWith('invalid_cloud')) return { conflict: false, message: 'La nube devolvió datos que no pudimos validar. Conservamos el borrador sin reemplazarlo; descarga una copia antes de recargar.' }
  if (value.code === '40001') return { conflict: true, message: 'Este tablero cambió en otro dispositivo. Descarga tu borrador antes de recargar la versión de la nube.' }
  if (['PGRST202', '42883'].includes(value.code ?? '')) return { conflict: false, message: 'Falta activar las operaciones de nube. Ejecuta la migración 202610220003_cloud_workspace.sql en Supabase.' }
  if (value.code === '42501' || value.code === 'PGRST301') return { conflict: false, message: 'No pudimos comprobar el acceso a tu cuenta. Revisa tu sesión y vuelve a intentarlo.' }
  if (value.code?.startsWith('22') || value.code?.startsWith('23')) return { conflict: false, message: 'Supabase rechazó el contenido. Conservamos el borrador: puedes descargarlo y recargar los datos guardados.' }
  return { conflict: false, message: 'No pudimos conectar con la nube. Tus cambios siguen pendientes; revisa el estado del borrador y reintenta cuando tengas conexión.' }
}
