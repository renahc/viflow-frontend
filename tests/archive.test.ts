import assert from 'node:assert/strict'
import { test } from 'node:test'
import { removeColumnKeepingCards, setCardArchived } from '../src/lib/archive.ts'
import type { Board } from '../src/lib/board.ts'
const board: Board = { columns: [{ id: 'todo', title: 'Por hacer', description: '' }], cards: [
  { id: 'a', title: 'A', description: 'Contexto', status: 'todo', priority: 'urgent', dueDate: '2026-10-23', comments: [{ id: 'c', body: 'Comentario', author: 'Rena', createdAt: '2026-10-21T12:00:00Z' }] },
  { id: 'b', title: 'B', description: '', status: 'todo' },
] }
test('archives and restores without changing order, comments, priority or deadline', () => {
  const archived = setCardArchived(board, 'a', true)
  assert.ok(archived.cards[0].archivedAt)
  assert.equal(board.cards[0].archivedAt, undefined)
  assert.equal(archived.cards[1], board.cards[1])
  assert.equal(setCardArchived(archived, 'a', true), archived)
  const persisted = JSON.parse(JSON.stringify(archived)) as Board
  const restored = setCardArchived(persisted, 'a', false)
  assert.deepEqual(JSON.parse(JSON.stringify(restored)), board)
  assert.equal(setCardArchived(board, 'missing', true), board)
})
test('deleting the last column archives cards into a recoverable destination', () => {
  const result = removeColumnKeepingCards(board, 'todo')
  assert.equal(result.columns.length, 1)
  assert.equal(result.columns[0].title, 'Recuperadas')
  assert.equal(result.cards.length, 2)
  assert.ok(result.cards.every(card => card.archivedAt && card.status === result.columns[0].id))
  assert.equal(setCardArchived(result, 'a', false).cards[0].archivedAt, undefined)
  assert.equal(board.columns[0].id, 'todo')
})
test('uses an existing column and preserves previously archived timestamps', () => {
  const archived = setCardArchived(board, 'a', true)
  const result = removeColumnKeepingCards({ ...archived, columns: [...archived.columns, { id: 'done', title: 'Hecho', description: '' }] }, 'todo')
  assert.equal(result.cards[0].archivedAt, archived.cards[0].archivedAt)
  assert.ok(result.cards.every(card => card.status === 'done'))
  assert.equal(removeColumnKeepingCards(board, 'missing'), board)
})
