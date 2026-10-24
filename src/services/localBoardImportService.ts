import type { SupabaseClient } from '@supabase/supabase-js'
import type { WorkspaceBoard } from '../lib/workspace.ts'
import { LocalBoardImportError, prepareLocalBoardImport } from '../lib/localBoardImport.ts'
import { decodeCloudSnapshot } from '../storage/cloudWorkspaceRepository.ts'

type IntentStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export function createLocalBoardImportService(client: Pick<SupabaseClient, 'auth' | 'rpc'>, userId: string, storage: IntentStorage) {
  return {
    async copy(boards: WorkspaceBoard[]) {
      const clean = prepareLocalBoardImport(boards)
      const serialized = JSON.stringify(clean)
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized))
      const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
      const key = `viflow.local-import.v1:${userId}:${fingerprint}`
      let operationId: string
      try {
        const previous = storage.getItem(key)
        operationId = previous && /^[a-f0-9-]{36}$/i.test(previous) ? previous : crypto.randomUUID()
        storage.setItem(key, operationId)
        if (storage.getItem(key) !== operationId) throw new Error('storage_unavailable')
      } catch { throw new LocalBoardImportError('Permite el almacenamiento de esta pestaña para importar con reintentos seguros. No se ha enviado ningún tablero.') }
      const { data: current, error: sessionError } = await client.auth.getUser()
      if (sessionError) throw sessionError
      if (current.user?.id !== userId || !current.user.email_confirmed_at) throw new LocalBoardImportError('La sesión cambió. Vuelve a abrir Respaldos con tu cuenta.')
      if (clean.some(board => board.cards.some(card => card.checklist?.length))) {
        const capability = await client.rpc('viflow_checklist_version')
        if (capability.error || capability.data !== 1) throw new LocalBoardImportError('Ejecuta 202610240002_card_checklists.sql en Supabase para importar checklists sin perder pasos.')
      }
      const { data, error } = await client.rpc('viflow_import_local_boards', { p_boards: clean, p_operation_id: operationId })
      if (error) throw error
      const snapshot = decodeCloudSnapshot(data)
      const ids: unknown = data?.importedBoardIds
      if (!Array.isArray(ids) || ids.length !== clean.length || new Set(ids).size !== ids.length || !ids.every(id => typeof id === 'string' && snapshot.workspace.boards.some(board => board.id === id))) throw new Error('invalid_cloud_import')
      // Only acknowledgement clears the intent. Errors keep it across dialog close/reload.
      try { storage.removeItem(key) } catch { /* Keeping the key is safer than duplicating an uncertain import. */ }
      return { snapshot, importedBoardIds: ids as string[] }
    },
  }
}
export function localBoardImportError(error: unknown): string {
  const value = error && typeof error === 'object' ? error as { code?: string; message?: string } : {}
  if (value.code === 'PGRST202' || value.code === '42883') return 'Falta activar la importación en Supabase. Ejecuta 202610240001_import_local_boards.sql.'
  if (value.code?.startsWith('22') || value.code?.startsWith('23')) return 'La nube rechazó la selección. No se importó parcialmente ningún tablero; revisa sus datos y vuelve a intentarlo.'
  if (value.code === '42501') return 'No pudimos comprobar el acceso a tu cuenta. Revisa tu sesión.'
  if (error instanceof LocalBoardImportError) return error.message
  return 'No pudimos confirmar la copia. Puedes reintentar la misma selección sin duplicarla. Tus originales siguen en este dispositivo.'
}
