import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBackup, mergeBackup, parseBackup } from '../src/lib/workspaceBackup.ts'
import type { Workspace } from '../src/lib/workspace.ts'

const workspace: Workspace = {
  activeBoardId: 'board', openBoardIds: ['board'], boards: [{
    id: 'board', title: 'Proyecto', columns: [{ id: 'todo', title: 'Por hacer', description: '', sort: 'priority', color: 'rose' }],
    labels: [{ id: 'label', name: 'Diseño', color: 'purple' }],
    cards: [{ id: 'card', title: 'Tarjeta', description: 'Texto\ncon líneas', status: 'todo', labelIds: ['label'], dueDate: '2026-10-23', priority: 'urgent', archivedAt: '2026-10-21T12:00:00Z',
      comments: [{ id: 'comment', author: 'Rena', body: 'Comentario', createdAt: '2026-10-21T12:00:00Z' }],
      activity: [{ id: 'event', actor: 'Rena', kind: 'archived', message: 'archivó la tarjeta.', createdAt: '2026-10-21T12:00:00Z' }],
    }],
  }, { id: 'archived', title: 'Archivado', archivedAt: '2026-10-21T12:00:00Z', columns: [], cards: [] }],
}
const serializable = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

test('backup round trip preserves content, labels, schedules, archived data and manual order', () => {
  const backup = createBackup(workspace)
  assert.deepEqual(serializable(parseBackup(JSON.stringify(backup))), serializable(backup))
})
test('imports as separate boards without replacing local data, tabs or selection', () => {
  const backup = createBackup(workspace)
  const imported = mergeBackup(workspace, backup)
  assert.equal(imported.boards.length, 4)
  assert.equal(imported.boards[0], workspace.boards[0])
  assert.equal(imported.openBoardIds, workspace.openBoardIds)
  assert.equal(imported.activeBoardId, workspace.activeBoardId)
  assert.notEqual(imported.boards[2].id, workspace.boards[0].id)
  assert.deepEqual(serializable(imported.boards[2].cards), serializable(workspace.boards[0].cards))
  assert.equal(imported.boards[3].archivedAt, workspace.boards[1].archivedAt)
  assert.equal(new Set(mergeBackup(imported, backup).boards.map(board => board.id)).size, 6)
  assert.equal(workspace.boards.length, 2)
})
test('rejects malformed JSON, versions, duplicate identities and orphan references atomically', () => {
  assert.throws(() => parseBackup('{'))
  for (const change of [
    (data: Record<string, unknown>) => { data.version = 2 },
    (data: Record<string, unknown>) => { data.format = 'other' },
    (data: Record<string, unknown>) => { data.exportedAt = 'invalid' },
  ]) {
    const data = serializable(createBackup(workspace))
    change(data)
    assert.throws(() => parseBackup(JSON.stringify(data)))
  }
  for (const change of [
    (data: Workspace) => { data.boards.push(data.boards[0]) },
    (data: Workspace) => { data.boards[0].cards[0].status = 'missing' },
    (data: Workspace) => { data.boards[0].cards[0].labelIds = ['missing'] },
    (data: Workspace) => { data.boards[0].cards[0].dueDate = '2026-02-30' },
    (data: Workspace) => { data.boards[0].cards.push(data.boards[0].cards[0]) },
    (data: Workspace) => { data.boards[0].cards[0].priority = 'custom' as 'urgent' },
  ]) {
    const backup = serializable(createBackup(workspace))
    change(backup.workspace)
    assert.throws(() => parseBackup(JSON.stringify(backup)))
  }
})
test('strips fields that could otherwise be mistaken for identity or ownership', () => {
  const data = serializable(createBackup(workspace))
  Object.assign(data.workspace.boards[0], { ownerId: 'someone', session: 'secret' })
  const parsed = parseBackup(JSON.stringify(data))
  assert.equal('ownerId' in parsed.workspace.boards[0], false)
  assert.equal('session' in parsed.workspace.boards[0], false)
})
test('supports empty backups and rejects oversized input', () => {
  const empty: Workspace = { boards: [], activeBoardId: '', openBoardIds: [] }
  assert.equal(parseBackup(JSON.stringify(createBackup(empty))).workspace.boards.length, 0)
  assert.throws(() => parseBackup(' '.repeat(10 * 1024 * 1024 + 1)), /10 MB/)
})
