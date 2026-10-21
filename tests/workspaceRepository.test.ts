import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLocalWorkspaceRepository } from '../src/storage/localWorkspaceRepository.ts'
import { workspaceStorageKey } from '../src/lib/workspace.ts'
import type { Workspace } from '../src/lib/workspace.ts'

function fixture() {
  const data = new Map<string, string>()
  const repository = createLocalWorkspaceRepository(() => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => { data.set(key, value) } }))
  return { data, repository }
}
test('loads empty storage and persists a workspace using the existing key', () => {
  const { data, repository } = fixture()
  const loaded = repository.load()
  assert.equal(loaded.error, false)
  assert.equal(loaded.workspace.boards.length, 1)
  assert.equal(data.size, 0)
  repository.save(loaded.workspace)
  assert.ok(data.has(workspaceStorageKey))
  assert.deepEqual(repository.load().workspace, loaded.workspace)
})
test('preserves archived boards but excludes them from active tabs after loading', () => {
  const { repository } = fixture()
  const workspace: Workspace = { boards: [{ id: 'a', title: 'Archivado', archivedAt: '2026-10-21T12:00:00Z', columns: [], cards: [] }], activeBoardId: 'a', openBoardIds: ['a'] }
  repository.save(workspace)
  assert.deepEqual(repository.load(), { error: false, workspace: { ...workspace, activeBoardId: '', openBoardIds: [] } })
})
test('reads legacy single-board data without deleting or overwriting its source', () => {
  const { data, repository } = fixture()
  data.set('viflow.board.v1', JSON.stringify([{ id: 'a', title: 'Anterior', description: '', status: 'todo' }]))
  assert.equal(repository.load().workspace.boards[0].cards[0].title, 'Anterior')
  assert.equal(data.size, 1)
  const legacy = { columns: [{ id: 'custom', title: 'Columna', description: '' }], cards: [{ id: 'b', title: 'Segunda', description: '', status: 'custom', labelIds: ['l'] }], labels: [{ id: 'l', name: 'Etiqueta', color: 'rose' }] }
  data.set('viflow.board.v2', JSON.stringify(legacy))
  assert.deepEqual(repository.load().workspace.boards[0].labels, legacy.labels)
})
test('reports invalid data and unavailable storage without writing during load', () => {
  const { data, repository } = fixture()
  data.set(workspaceStorageKey, '{broken')
  assert.equal(repository.load().error, true)
  assert.equal(data.get(workspaceStorageKey), '{broken')
  const denied = createLocalWorkspaceRepository(() => { throw new Error('Denied') })
  assert.equal(denied.load().error, true)
  assert.throws(() => denied.save(repository.load().workspace))
})
test('failed atomic storage write preserves the previous saved workspace', () => {
  const { data, repository } = fixture()
  const original = repository.load().workspace
  repository.save(original)
  const previous = data.get(workspaceStorageKey)
  const full = createLocalWorkspaceRepository(() => ({ getItem: key => data.get(key) ?? null, setItem: () => { throw new Error('QuotaExceededError') } }))
  assert.throws(() => full.save({ boards: [], openBoardIds: [], activeBoardId: '' }))
  assert.equal(data.get(workspaceStorageKey), previous)
})
