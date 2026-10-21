import assert from 'node:assert/strict'
import { test } from 'node:test'
import { dueState, isDueDate, isPriority } from '../src/lib/cardSchedule.ts'
import { updateCardContent } from '../src/lib/updateCard.ts'
import type { Board } from '../src/lib/board.ts'

test('validates real calendar dates and fixed priorities', () => {
  assert.ok(isDueDate('2028-02-29'))
  for (const date of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-1-01', '0000-01-01', 'invalid']) assert.equal(isDueDate(date), false)
  assert.ok(isPriority('urgent'))
  assert.equal(isPriority('custom'), false)
})
test('classifies local dates across month boundaries and suppresses overdue on completed cards', () => {
  const now = new Date(2026, 0, 31, 23, 59)
  assert.equal(dueState('2026-01-30', false, now), 'overdue')
  assert.equal(dueState('2026-01-31', false, now), 'today')
  assert.equal(dueState('2026-02-01', false, now), 'soon')
  assert.equal(dueState('2026-02-02', false, now), 'upcoming')
  assert.equal(dueState('2026-01-30', true, now), 'completed')
})
test('saves and clears schedule, preserves metadata and rejects invalid changes atomically', () => {
  const board: Board = { columns: [{ id: 'todo', title: 'Pendiente', description: '' }], cards: [{ id: 'a', title: 'Tarjeta', description: '', status: 'todo', labelIds: [] }] }
  const content = { title: 'Tarjeta', description: '' }
  const saved = updateCardContent(board, 'a', content, { dueDate: '2026-10-22', priority: 'high' }).board
  assert.equal(saved.cards[0].dueDate, '2026-10-22')
  assert.equal(saved.cards[0].priority, 'high')
  assert.equal(saved.cards[0].labelIds, board.cards[0].labelIds)
  assert.equal(board.cards[0].dueDate, undefined)
  assert.equal(updateCardContent(saved, 'a', content, { dueDate: '2026-10-22', priority: 'high' }).board, saved)
  assert.equal(updateCardContent(saved, 'a', content, { dueDate: '2026-02-30', priority: 'high' }).board, saved)
  const cleared = updateCardContent(saved, 'a', content, { dueDate: '', priority: 'none' }).board
  assert.equal(cleared.cards[0].dueDate, undefined)
  assert.equal(cleared.cards[0].priority, 'none')
})
