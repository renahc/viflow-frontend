import { createCloudDraftStore } from '../storage/cloudDrafts'
import type { CloudDraft } from '../storage/cloudDrafts'
import { LocalBoardImportError } from '../lib/localBoardImport'
import { createLocalBoardImportService } from '../services/localBoardImportService'
import type { WorkspaceBoard } from '../lib/workspace'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseWorkspace } from '../lib/workspace'
import type { Workspace } from '../lib/workspace'
import { cloudWorkspaceError, createCloudRequest, createCloudWorkspaceRepository } from '../storage/cloudWorkspaceRepository'
import type { CloudRequest, CloudSnapshot } from '../storage/cloudWorkspaceRepository'
import type { WorkspaceState } from '../storage/workspaceRepository'
const empty = (): Workspace => ({ boards: [], activeBoardId: '', openBoardIds: [] })
function navigation(snapshot: CloudSnapshot, previous: Workspace): Workspace {
  return parseWorkspace({ ...snapshot.workspace, activeBoardId: previous.activeBoardId, openBoardIds: previous.openBoardIds })!
}
export function useCloudWorkspace(client: SupabaseClient, userId: string): WorkspaceState {
  const repository = useMemo(() => createCloudWorkspaceRepository(client), [client])
  const draftsStore = useMemo(() => createCloudDraftStore(() => localStorage), [])
  const [drafts, setDrafts] = useState<CloudDraft[]>([])
  const [draftError, setDraftError] = useState('')
  const [draftSaved, setDraftSaved] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const refreshDrafts = useCallback(() => {
    const result = draftsStore.read(userId); setDrafts(result.drafts)
    setDraftError(result.error ? 'No pudimos leer algunos borradores de este dispositivo. No los hemos eliminado.' : '')
  }, [draftsStore, userId])
  const [workspace, setWorkspace] = useState(empty)
  const [phase, setPhase] = useState<'loading' | 'saving' | 'ready' | 'error'>('loading')
  const [dirty, setDirty] = useState(false)
  const [failure, setFailure] = useState({ message: '', conflict: false })
  const state = useRef({ version: 0, active: false, phase: 'loading', importing: false, snapshot: { workspace: empty(), revisions: {} } as CloudSnapshot, pending: null as { request: CloudRequest; next: Workspace } | null })
  const load = useCallback(async () => {
    const current = state.current
    const version = ++current.version
    refreshDrafts()
    current.phase = 'loading'; setPhase('loading'); setFailure({ message: '', conflict: false })
    try {
      const loaded = await repository.load()
      if (!current.active || current.version !== version) return
      const next = navigation(loaded, current.pending?.next ?? current.snapshot.workspace)
      const removed = !current.pending || draftsStore.remove(userId, current.pending.request.operationId)
      refreshDrafts(); if (!removed) setDraftError('Los datos de nube se cargaron, pero no pudimos retirar el borrador local. Puedes descartarlo desde este aviso.'); setDraftSaved(false)
      current.snapshot = { ...loaded, workspace: next }; current.pending = null; current.phase = 'ready'
      setWorkspace(next); setDirty(false); setPhase('ready')
    } catch (error) {
      if (!current.active || current.version !== version) return
      current.phase = 'error'; setFailure(cloudWorkspaceError(error)); setPhase('error')
    }
  }, [repository, draftsStore, refreshDrafts, userId])
  useEffect(() => {
    const current = state.current
    current.active = true
    const version = ++current.version
    queueMicrotask(() => { if (current.active && current.version === version) void load() })
    return () => { current.active = false; current.version++; current.pending = null; current.importing = false }
  }, [load])
  useEffect(() => {
    function connection() { setOnline(navigator.onLine) }
    function storageChanged() { refreshDrafts() }
    window.addEventListener('online', connection); window.addEventListener('offline', connection); window.addEventListener('storage', storageChanged)
    return () => { window.removeEventListener('online', connection); window.removeEventListener('offline', connection); window.removeEventListener('storage', storageChanged) }
  }, [refreshDrafts])
  useEffect(() => {
    function preventLoss(event: BeforeUnloadEvent) {
      if (state.current.pending || state.current.importing) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', preventLoss)
    return () => window.removeEventListener('beforeunload', preventLoss)
  }, [])
  const send = useCallback(async () => {
    const current = state.current
    const pending = current.pending
    if (!pending) return
    const version = ++current.version
    current.phase = 'saving'; setPhase('saving'); setFailure({ message: '', conflict: false })
    try {
      if (!navigator.onLine) throw new Error('offline_pending')
      const saved = await repository.save(pending.request)
      if (!current.active || current.version !== version) return
      const removed = draftsStore.remove(userId, pending.request.operationId); refreshDrafts(); setDraftSaved(false)
      if (!removed) setDraftError('Los cambios están guardados en tu cuenta, pero no pudimos retirar el borrador local. Reintentarlo no duplicará los cambios.')
      const next = navigation(saved, pending.next)
      current.snapshot = { ...saved, workspace: next }; current.pending = null; current.phase = 'ready'
      setWorkspace(next); setDirty(false); setPhase('ready')
    } catch (error) {
      if (!current.active || current.version !== version) return
      current.phase = 'error'; setFailure(cloudWorkspaceError(error)); setPhase('error')
    }
  }, [repository, draftsStore, refreshDrafts, userId])
  const saveWorkspace = useCallback((next: Workspace) => {
    const current = state.current
    if (!current.active || current.phase !== 'ready') return false
    const request = createCloudRequest(current.snapshot, next)
    if (!request.changes.length) {
      current.snapshot = { ...current.snapshot, workspace: next }; setWorkspace(next); return true
    }
    setDraftSaved(draftsStore.write({ userId, savedAt: new Date().toISOString(), request, next }))
    current.pending = { request, next }; current.phase = 'saving'
    setWorkspace(next); setDirty(true); setPhase('saving'); void send()
    return true
  }, [send, draftsStore, userId])
  const copyLocalBoards = useCallback(async (boards: WorkspaceBoard[]) => {
    const current = state.current
    if (!current.active || current.phase !== 'ready') throw new LocalBoardImportError('Espera a que termine el guardado antes de importar.')
    const version = ++current.version
    current.phase = 'saving'; current.importing = true; setPhase('saving')
    try {
      const result = await createLocalBoardImportService(client, userId, sessionStorage).copy(boards)
      if (!current.active || current.version !== version) throw new LocalBoardImportError('La sesión cambió. Abre tu cuenta para comprobar la importación.')
      const next = navigation(result.snapshot, current.snapshot.workspace)
      current.snapshot = { ...result.snapshot, workspace: next }; setWorkspace(next)
      return result.importedBoardIds
    } finally {
      if (current.active && current.version === version) { current.importing = false; current.phase = 'ready'; setPhase('ready') }
    }
  }, [client, userId])
  return { workspace, copyLocalBoards, storageError: phase === 'error', saveWorkspace,
    // Cloud imports need a separate, explicit transaction and provenance mapping.
    importWorkspace: () => false,
    sync: { phase, message: failure.message, conflict: failure.conflict, dirty, online, draftSaved, draftError,
      drafts: drafts.map(draft => ({ id: draft.request.operationId, boardId: draft.next.activeBoardId || String(draft.request.changes[0].board.id), savedAt: draft.savedAt, titles: draft.request.changes.map(change => String(change.board.title)) })),
      recoverDraft: (id: string) => {
        const current = state.current
        if (current.pending || !['ready','error'].includes(current.phase)) return
        const recovered = draftsStore.read(userId).drafts.find(draft => draft.request.operationId === id)
        if (!recovered) { refreshDrafts(); return }
        current.version++; current.pending = { request: recovered.request, next: recovered.next }; current.phase = 'error'
        setWorkspace(recovered.next); setDirty(true); setDraftSaved(true); setPhase('error')
        setFailure({ conflict: false, message: 'Borrador recuperado. Reintenta para confirmar el guardado en tu cuenta. Si la versión de la nube cambió, te avisaremos antes de reemplazarla.' })
      },
      discardDraft: (id: string) => {
        if (state.current.pending?.request.operationId === id) return
        if (!draftsStore.remove(userId, id)) { setDraftError('No pudimos descartar el borrador. Sigue guardado en este dispositivo.'); return }
        refreshDrafts()
      },
      retry: () => { if (state.current.phase !== 'error') return; if (state.current.pending) void send(); else void load() },
      reload: () => { if (['ready', 'error'].includes(state.current.phase)) void load() },
    },
  }
}
