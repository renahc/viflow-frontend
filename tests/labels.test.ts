import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCardLabel, deleteBoardLabel, toggleCardLabel, isLabel, labelColors } from '../src/lib/labels.ts'
import { moveCardInBoard } from '../src/lib/moveCard.ts'
import type { Board } from '../src/lib/board.ts'
import type { LabelColor } from '../src/lib/labels.ts'

const board: Board = {
  columns: [{ id: 'todo', title: 'Por hacer', description: '' }, { id: 'done', title: 'Hecho', description: '' }],
  cards: ['a', 'b'].map(id => ({ id, title: id, description: '', status: 'todo' })),
}

test('creates and assigns a trimmed label without changing other cards or the original board', () => {
  const result = createCardLabel(board, 'a', ' Diseño ', 'purple')
  assert.equal(result.error, undefined)
  assert.equal(result.board.labels?.[0].name, 'Diseño')
  assert.deepEqual(result.board.cards[0].labelIds, [result.board.labels?.[0].id])
  assert.equal(result.board.cards[1], board.cards[1])
  assert.equal(board.labels, undefined)
})

test('shares labels across cards and removes only the selected assignment', () => {
  const created = createCardLabel(board, 'a', 'Diseño', 'rose').board
  const id = created.labels![0].id
  const assigned = toggleCardLabel(created, 'b', id)
  const removed = toggleCardLabel(assigned, 'a', id)
  assert.deepEqual(removed.cards[0].labelIds, [])
  assert.deepEqual(removed.cards[1].labelIds, [id])
  assert.equal(removed.labels?.length, 1)
  assert.equal(toggleCardLabel(board, 'a', 'missing'), board)
})

test('rejects duplicate names, empty names, unknown colors and missing cards', () => {
  const created = createCardLabel(board, 'a', 'Diseño', 'purple').board
  assert.ok(createCardLabel(created, 'b', ' diseño ', 'blue').error)
  assert.ok(createCardLabel(board, 'a', ' ', 'blue').error)
  assert.ok(createCardLabel(board, 'a', 'a'.repeat(33), 'blue').error)
  assert.ok(createCardLabel(board, 'a', 'Diseño', '#ff0000' as LabelColor).error)
  assert.ok(createCardLabel(board, 'missing', 'Diseño', 'purple').error)
  for (const color of labelColors) assert.equal(isLabel({id:'tag',name:'Diseño',color:color.id}), true)
})

test('keeps labels when moving cards and serializing the board', () => {
  const created = createCardLabel(board, 'a', 'Diseño', 'purple').board
  const moved = moveCardInBoard(created, 'a', 'done')
  const restored = JSON.parse(JSON.stringify(moved)) as Board
  assert.deepEqual(restored.labels, created.labels)
  assert.deepEqual(restored.cards.find(card => card.id === 'a')?.labelIds, created.cards[0].labelIds)
})


test('deleting a label removes it from all cards and preserves other labels', () => {
  const first = createCardLabel(board, 'a', 'Diseño', 'purple').board
  const removedId = first.labels![0].id
  const shared = toggleCardLabel(first, 'b', removedId)
  const second = createCardLabel(shared, 'a', 'Urgente', 'rose').board
  const keptId = second.labels![1].id
  const deleted = deleteBoardLabel(second, removedId)
  assert.deepEqual(deleted.labels?.map(label => label.id), [keptId])
  assert.deepEqual(deleted.cards[0].labelIds, [keptId])
  assert.deepEqual(deleted.cards[1].labelIds, [])
  assert.equal(second.labels?.length, 2)
  assert.equal(deleteBoardLabel(board, 'missing'), board)
  assert.deepEqual(JSON.parse(JSON.stringify(deleted)), deleted)
})
