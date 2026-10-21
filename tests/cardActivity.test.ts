import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addCardComment, appendCardActivity, isCardActivity, isCardComment } from '../src/lib/cardActivity.ts'
import { updateCardContent } from '../src/lib/updateCard.ts'
import { moveCardInBoard } from '../src/lib/moveCard.ts'
import type { Board } from '../src/lib/board.ts'

const board: Board = {
  columns: [{ id: 'todo', title: 'Por hacer', description: '' }, { id: 'done', title: 'Hecho', description: '' }],
  cards: [{ id: 'a', title: 'Tarjeta', description: '', status: 'todo' }, { id: 'b', title: 'Otra', description: '', status: 'todo' }],
}

test('publishes a trimmed multiline comment with author, timestamp and unique identity', () => {
  const result = addCardComment(board, 'a', ' Primera línea\nSegunda línea ', 'Renato')
  const comment = result.board.cards[0].comments![0]
  assert.equal(result.error, undefined)
  assert.equal(comment.body, 'Primera línea\nSegunda línea')
  assert.equal(comment.author, 'Renato')
  assert.ok(isCardComment(comment))
  assert.equal(result.board.cards[1], board.cards[1])
  assert.equal(board.cards[0].comments, undefined)
  const next = addCardComment(result.board, 'a', 'Otro comentario', 'Otra persona').board
  assert.equal(next.cards[0].comments?.length, 2)
  assert.notEqual(next.cards[0].comments?.[0].id, comment.id)
  assert.equal(next.cards[0].comments?.[1].author, 'Renato')
})

test('rejects empty, oversized, or orphan comments', () => {
  for (const [id, body] of [['a', '  '], ['a', 'a'.repeat(2001)], ['missing', 'Comentario']]) {
    const result = addCardComment(board, id, body, 'Renato')
    assert.ok(result.error)
    assert.equal(result.board, board)
  }
})

test('keeps historical names and labels as snapshots even when the card is edited or moved', () => {
  const commented = addCardComment(board, 'a', 'Comentario', 'Renato').board
  const audited = appendCardActivity(commented, 'a', 'label-added', 'agregó la etiqueta «Diseño».', 'Renato')
  const edited = updateCardContent(audited, 'a', { title: 'Nuevo título', description: 'Nueva descripción' }).board
  const moved = moveCardInBoard(edited, 'a', 'done')
  const card = moved.cards.find(card => card.id === 'a')!
  assert.deepEqual(card.comments, commented.cards[0].comments)
  assert.equal(card.activity?.[0].message, 'agregó la etiqueta «Diseño».')
  assert.equal(card.activity?.[0].actor, 'Renato')
  const restored = JSON.parse(JSON.stringify(card))
  assert.ok(isCardActivity(restored.activity[0]))
  assert.ok(isCardComment(restored.comments[0]))
  assert.equal(appendCardActivity(board, 'missing', 'created', 'creó la tarjeta.', 'Renato'), board)
})

test('validates persisted comment and activity data', () => {
  const commented = addCardComment(board, 'a', 'Comentario', '').board.cards[0].comments![0]
  assert.equal(commented.author, 'Tú')
  assert.equal(isCardComment({ ...commented, createdAt: 'invalid' }), false)
  assert.equal(isCardComment({ ...commented, body: '' }), false)
  const entry = appendCardActivity(board, 'a', 'created', 'creó la tarjeta.', '').cards[0].activity![0]
  assert.equal(entry.actor, 'Tú')
  assert.equal(isCardActivity({ ...entry, kind: 'unknown' }), false)
  assert.equal(isCardActivity({ ...entry, actor: '' }), false)
})
