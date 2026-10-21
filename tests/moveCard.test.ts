import assert from 'node:assert/strict'
import { test } from 'node:test'
import { moveCardInBoard } from '../src/lib/moveCard.ts'
import type { Board } from '../src/lib/board.ts'

const board: Board = {
  columns: ['todo', 'done', 'empty'].map(id => ({ id, title: id, description: '' })),
  cards: [['a', 'todo'], ['x', 'done'], ['b', 'todo'], ['y', 'done'], ['c', 'todo']]
    .map(([id, status]) => ({ id, title: id, description: '', status })),
}
const order = (board: Board, status = 'todo') => board.cards.filter(card => card.status === status).map(card => card.id)

test('moves a card to the top, middle, and end of its column', () => {
  assert.deepEqual(order(moveCardInBoard(board, 'c', 'todo', 'a')), ['c', 'a', 'b'])
  assert.deepEqual(order(moveCardInBoard(board, 'a', 'todo', 'c')), ['b', 'a', 'c'])
  assert.deepEqual(order(moveCardInBoard(board, 'a', 'todo', null)), ['b', 'c', 'a'])
})

test('inserts in another column, appends, and supports an empty column', () => {
  assert.deepEqual(order(moveCardInBoard(board, 'b', 'done', 'y'), 'done'), ['x', 'b', 'y'])
  assert.deepEqual(order(moveCardInBoard(board, 'b', 'done'), 'done'), ['x', 'y', 'b'])
  assert.deepEqual(order(moveCardInBoard(board, 'a', 'empty', null), 'empty'), ['a'])
})

test('preserves the original data and the order of other columns', () => {
  const moved = moveCardInBoard(board, 'c', 'todo', 'a')
  assert.deepEqual(order(moved, 'done'), ['x', 'y'])
  assert.deepEqual(order(board), ['a', 'b', 'c'])
  assert.equal(moved.cards.length, board.cards.length)
  assert.deepEqual(order(JSON.parse(JSON.stringify(moved))), ['c', 'a', 'b'])
})

test('ignores self drops, invalid destinations, and unchanged positions', () => {
  assert.equal(moveCardInBoard(board, 'a', 'todo', 'a'), board)
  assert.equal(moveCardInBoard(board, 'a', 'todo'), board)
  assert.equal(moveCardInBoard(board, 'c', 'todo', null), board)
  assert.equal(moveCardInBoard(board, 'missing', 'todo', 'b'), board)
  assert.equal(moveCardInBoard(board, 'a', 'missing', null), board)
  assert.equal(moveCardInBoard(board, 'a', 'todo', 'x'), board)
})
