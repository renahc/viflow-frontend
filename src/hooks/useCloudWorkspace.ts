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
export function useCloudWorkspace(client: SupabaseClient): WorkspaceState {
  const repository = useMemo(() => createCloudWorkspaceRepository(client), [client])
  const [workspace, setWorkspace] = useState(empty)
  const [phase, setPhase] = useState<'loading' | 'saving' | 'ready' | 'error'>('loading')
  const [dirty, setDirty] = useState(false)
  const [failure, setFailure] = useState({ message: '', conflict: false })
  const state = useRef({ version: 0, active: false, phase: 'loading', snapshot: { workspace: empty(), revisions: {} } as CloudSnapshot, pending: null as { request: CloudRequest; next: Workspace } | null })
  const load = useCallback(async () => {
    const current = state.current
    const version = ++current.version
    current.phase = 'loading'; setPhase('loading'); setFailure({ message: '', conflict: false })
    try {
      const loaded = await repository.load()
      if (!current.active || current.version !== version) return
      const next = navigation(loaded, current.pending?.next ?? current.snapshot.workspace)
      current.snapshot = { ...loaded, workspace: next }; current.pending = null; current.phase = 'ready'
      setWorkspace(next); setDirty(false); setPhase('ready')
    } catch (error) {
      if (!current.active || current.version !== version) return
      current.phase = 'error'; setFailure(cloudWorkspaceError(error)); setPhase('error')
    }
  }, [repository])
  useEffect(() => {
    const current = state.current
    current.active = true
    const version = ++current.version
    queueMicrotask(() => { if (current.active && current.version === version) void load() })
    return () => { current.active = false; current.version++; current.pending = null }
  }, [load])
  useEffect(() => {
    function preventLoss(event: BeforeUnloadEvent) {
      if (state.current.pending) { event.preventDefault(); event.returnValue = '' }
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
      const saved = await repository.save(pending.request)
      if (!current.active || current.version !== version) return
      const next = navigation(saved, pending.next)
      current.snapshot = { ...saved, workspace: next }; current.pending = null; current.phase = 'ready'
      setWorkspace(next); setDirty(false); setPhase('ready')
    } catch (error) {
      if (!current.active || current.version !== version) return
      current.phase = 'error'; setFailure(cloudWorkspaceError(error)); setPhase('error')
    }
  }, [repository])
  const saveWorkspace = useCallback((next: Workspace) => {
    const current = state.current
    if (!current.active || current.phase !== 'ready') return false
    const request = createCloudRequest(current.snapshot, next)
    if (!request.changes.length) {
      current.snapshot = { ...current.snapshot, workspace: next }; setWorkspace(next); return true
    }
    current.pending = { request, next }; current.phase = 'saving'
    setWorkspace(next); setDirty(true); setPhase('saving'); void send()
    return true
  }, [send])
  return { workspace, storageError: phase === 'error', saveWorkspace,
    // Cloud imports need a separate, explicit transaction and provenance mapping.
    importWorkspace: () => false,
    sync: { phase, message: failure.message, conflict: failure.conflict, dirty,
      retry: () => { if (state.current.phase !== 'error') return; if (state.current.pending) void send(); else void load() },
      reload: () => { if (['ready', 'error'].includes(state.current.phase)) void load() },
    },
  }
}
