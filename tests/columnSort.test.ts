import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sortColumnCards } from '../src/lib/columnSort.ts'
import type { Card } from '../src/lib/board.ts'

test('sorts by priority, preserves ties and does not overwrite manual order', () => {
  const cards: Card[] = [
    { id: 'a', title: 'A', description: '', status: 'todo' },
    { id: 'b', title: 'B', description: '', status: 'todo', priority: 'high' },
    { id: 'c', title: 'C', description: '', status: 'todo', priority: 'urgent' },
    { id: 'd', title: 'D', description: '', status: 'todo', priority: 'high' },
    { id: 'e', title: 'E', description: '', status: 'todo', priority: 'low' },
    { id: 'f', title: 'F', description: '', status: 'todo', priority: 'medium' },
    { id: 'g', title: 'G', description: '', status: 'todo', priority: 'none' },
  ]
  assert.deepEqual(sortColumnCards(cards, 'priority').map(card => card.id), ['c', 'b', 'd', 'f', 'e', 'a', 'g'])
  assert.equal(sortColumnCards(cards, 'manual'), cards)
  assert.deepEqual(cards.map(card => card.id), ['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  assert.deepEqual(sortColumnCards([], 'priority'), [])
})
