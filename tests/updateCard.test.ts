import assert from 'node:assert/strict'
import { test } from 'node:test'
import { updateCardContent } from '../src/lib/updateCard.ts'
import type { Board } from '../src/lib/board.ts'

const board: Board = {
  columns: [{ id: 'todo', title: 'Por hacer', description: '', color: 'rose' }],
  labels: [{ id: 'design', name: 'Diseño', color: 'purple' }],
  cards: [
    { id: 'a', title: 'Original', description: 'Contexto', status: 'todo', labelIds: ['design'] },
    { id: 'b', title: 'Otra tarjeta', description: '', status: 'todo' },
  ],
}

test('edits title and description while preserving identity, state, labels and order', () => {
  const result = updateCardContent(board, 'a', { title: ' Nuevo título ', description: ' Primera línea\nSegunda línea ' })
  assert.equal(result.error, undefined)
  assert.deepEqual(result.board.cards[0], { ...board.cards[0], title: 'Nuevo título', description: 'Primera línea\nSegunda línea' })
  assert.equal(result.board.cards[1], board.cards[1])
  assert.equal(result.board.columns, board.columns)
  assert.equal(result.board.labels, board.labels)
  assert.equal(board.cards[0].title, 'Original')
  assert.deepEqual(JSON.parse(JSON.stringify(result.board)), result.board)
})

test('allows removing the description and ignores unchanged content', () => {
  assert.equal(updateCardContent(board, 'a', { title: ' Original ', description: 'Contexto' }).board, board)
  assert.equal(updateCardContent(board, 'a', { title: 'Original', description: '' }).board.cards[0].description, '')
})

test('rejects empty titles, oversized content, and missing cards without modifying data', () => {
  for (const [id, title, description] of [
    ['a', ' ', 'Contexto'], ['a', 'a'.repeat(161), ''],
    ['a', 'Original', 'a'.repeat(1001)], ['missing', 'Título', ''],
  ]) {
    const result = updateCardContent(board, id, { title, description })
    assert.ok(result.error)
    assert.equal(result.board, board)
  }
})
