import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const a = '00000000-0000-0000-0000-000000000001'
const b = '00000000-0000-0000-0000-000000000002'
const unverified = '00000000-0000-0000-0000-000000000003'
const boardA = '10000000-0000-0000-0000-000000000001'
const boardB = '10000000-0000-0000-0000-000000000002'
const boardC = '10000000-0000-0000-0000-000000000003'
const columnA = '20000000-0000-0000-0000-000000000001'
const columnB = '20000000-0000-0000-0000-000000000002'
const columnC = '20000000-0000-0000-0000-000000000003'

test('cloud schema enforces PostgreSQL permissions, ownership and integrity', async t => {
  const db = new PGlite()
  try {
    // Minimal Supabase Auth surface. No real account, password or network access.
    await db.exec(`
      create role anon; create role authenticated;
      create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon, authenticated;
      grant execute on function auth.uid() to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
    `)
    await db.exec(await readFile(new URL('../supabase/migrations/202610220002_private_boards.sql', import.meta.url), 'utf8'))
    const checks = await db.exec(await readFile(new URL('../supabase/checks/private_boards.sql', import.meta.url), 'utf8'))
    assert.equal(checks[0].rows.length, 7)
    assert.ok(checks[0].rows.every(row => row.rowsecurity === true))
    assert.equal(checks[1].rows.length, 7)
    assert.ok(Object.values(checks[2].rows[0]).every(value => value === false))
    await db.exec(`
      insert into auth.users values ('${a}', now(), '{"display_name":"Rena"}'), ('${b}', now(), '{"display_name":"Otra cuenta"}'), ('${unverified}', null, '{"email_verified":true}');
      insert into public.boards(id, owner_id, title) values ('${boardA}', '${a}', 'A'), ('${boardB}', '${b}', 'B'), ('${boardC}', '${a}', 'C');
      insert into public.board_columns(id, board_id, title) values ('${columnA}', '${boardA}', 'A'), ('${columnB}', '${boardB}', 'B'), ('${columnC}', '${boardC}', 'C');
    `)
    async function asUser(id: string, work: () => Promise<void>, role = 'authenticated') {
      await db.exec('begin')
      try {
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [id])
        await db.exec(`set local role ${role}`)
        await work()
      } finally { await db.exec('rollback') }
    }
    async function denied(sql: string, code: string) {
      await db.exec('savepoint rejected_operation')
      try { await assert.rejects(db.query(sql), (error: unknown) => (error as { code?: string }).code === code) }
      finally { await db.exec('rollback to savepoint rejected_operation; release savepoint rejected_operation') }
    }
    await t.test('a verified owner can create, edit, archive and restore with server IDs and revisions', async () => {
      await asUser(a, async () => {
        const result = await db.query<{ id: string; owner_id: string; revision: number }>("insert into public.boards(title) values ('Nuevo tablero') returning *")
        const board = result.rows[0]
        assert.equal(board.owner_id, a)
        assert.match(board.id, /^[a-f0-9-]{36}$/)
        await db.query('update public.boards set archived_at = now() where id = $1', [board.id])
        const updated = await db.query<{ revision: number; archived_at: string | null }>('update public.boards set archived_at = null where id = $1 returning revision, archived_at', [board.id])
        assert.equal(Number(updated.rows[0].revision), Number(board.revision) + 2)
        assert.equal(updated.rows[0].archived_at, null)
        await denied(`update public.boards set owner_id = '${b}' where id = '${boardA}'`, '42501')
        await denied(`insert into public.boards(owner_id, title) values ('${b}', 'Spoof')`, '42501')
        await denied(`update public.boards set revision = 1 where id = '${boardA}'`, '42501')
        await denied(`delete from public.boards where id = '${boardA}'`, '42501')
      })
    })
    await t.test('another account cannot read, edit or attach children to an unauthorized board', async () => {
      await asUser(b, async () => {
        const rows = await db.query<{ id: string }>('select id from public.boards')
        assert.deepEqual(rows.rows.map(row => row.id), [boardB])
        assert.equal((await db.query(`select * from public.board_columns where board_id = '${boardA}'`)).rows.length, 0)
        assert.equal((await db.query(`update public.boards set title = 'Attack' where id = '${boardA}' returning id`)).rows.length, 0)
        await denied(`insert into public.board_columns(board_id, title) values ('${boardA}', 'Attack')`, '42501')
        await denied(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Attack')`, '42501')
      })
    })
    await t.test('all child tables hide private content after switching to another account', async () => {
      await asUser(b, async () => {
        const card = (await db.query<{ id: string }>(`insert into public.cards(board_id, column_id, title) values ('${boardB}', '${columnB}', 'Private') returning id`)).rows[0].id
        const label = (await db.query<{ id: string }>(`insert into public.board_labels(board_id, name, color) values ('${boardB}', 'Private', 'teal') returning id`)).rows[0].id
        await db.query(`insert into public.card_labels values ('${boardB}', '${card}', '${label}')`)
        await db.query(`insert into public.card_comments(board_id, card_id, body) values ('${boardB}', '${card}', 'Private comment')`)
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [a])
        for (const table of ['board_columns', 'cards', 'board_labels', 'card_labels', 'card_comments', 'card_activity']) {
          assert.equal((await db.query(`select * from public.${table} where board_id = '${boardB}'`)).rows.length, 0, table)
        }
        assert.equal((await db.query(`update public.cards set title = 'Attack' where id = '${card}' returning id`)).rows.length, 0)
        await denied(`insert into public.card_comments(board_id, card_id, body) values ('${boardB}', '${card}', 'Attack')`, '42501')
        assert.equal((await db.query(`delete from public.card_labels where board_id = '${boardB}' returning card_id`)).rows.length, 0)
      })
    })
    await t.test('revision filters reject stale writes and archiving preserves children', async () => {
      await asUser(a, async () => {
        const initial = Number((await db.query<{ revision: number }>(`select revision from public.boards where id = '${boardA}'`)).rows[0].revision)
        await db.query(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Keep me')`)
        assert.equal((await db.query(`update public.boards set title = 'Stale' where id = '${boardA}' and revision = $1 returning id`, [initial])).rows.length, 0)
        await db.query(`update public.boards set archived_at = now() where id = '${boardA}'`)
        assert.equal((await db.query(`select * from public.cards where board_id = '${boardA}'`)).rows.length, 1)
        await denied(`delete from public.cards where board_id = '${boardA}'`, '42501')
        await denied(`delete from public.board_columns where board_id = '${boardA}'`, '42501')
      })
    })
    await t.test('anonymous and unverified users get no board access, regardless of editable metadata', async () => {
      await asUser('', async () => { await denied('select * from public.boards', '42501'); await denied("insert into public.boards(title) values ('Guest')", '42501') }, 'anon')
      await asUser(unverified, async () => {
        assert.equal((await db.query('select * from public.boards')).rows.length, 0)
        await denied("insert into public.boards(title) values ('Unverified')", '42501')
      })
    })
    await t.test('composite foreign keys reject cross-board relationships, even for the same owner', async () => {
      await asUser(a, async () => {
        await denied(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnC}', 'Wrong column')`, '23503')
        const card = (await db.query<{ id: string }>(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Card') returning id`)).rows[0].id
        const label = (await db.query<{ id: string }>(`insert into public.board_labels(board_id, name, color) values ('${boardC}', 'Other board', 'purple') returning id`)).rows[0].id
        await denied(`insert into public.card_labels values ('${boardA}', '${card}', '${label}')`, '23503')
        await denied(`insert into public.card_comments(board_id, card_id, body) values ('${boardC}', '${card}', 'Wrong board')`, '23503')
      })
    })
    await t.test('comments and activity get server identity, snapshots and timestamps; audit records are immutable', async () => {
      await asUser(a, async () => {
        const before = Number((await db.query<{ revision: number }>(`select revision from public.boards where id = '${boardA}'`)).rows[0].revision)
        const card = (await db.query<{ id: string; revision: number }>(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Card') returning id, revision`)).rows[0]
        const comment = (await db.query<{ author_id: string; author_name: string; created_at: string; source: string }>(`insert into public.card_comments(board_id, card_id, body) values ('${boardA}', '${card.id}', 'Comentario') returning *`)).rows[0]
        assert.equal(comment.author_id, a); assert.equal(comment.author_name, 'Rena'); assert.equal(comment.source, 'account'); assert.ok(comment.created_at)
        await denied(`insert into public.card_comments(board_id, card_id, body, author_name) values ('${boardA}', '${card.id}', 'Spoof', 'Otra persona')`, '42501')
        await denied(`insert into public.card_activity(board_id, card_id, actor_name, kind) values ('${boardA}', '${card.id}', 'Fake', 'created')`, '42501')
        await denied('delete from public.card_activity', '42501')
        await denied('update public.card_comments set body = \'Changed history\'', '42501')
        await db.query(`update public.cards set priority = 'urgent', archived_at = now() where id = '${card.id}'`)
        const entries = await db.query<{ actor_id: string; actor_name: string; kind: string; details: { priority?: string } }>(`select * from public.card_activity where card_id = '${card.id}' order by created_at, id`)
        assert.equal(entries.rows.length, 2)
        assert.ok(entries.rows.every(row => row.actor_id === a && row.actor_name === 'Rena'))
        assert.equal(entries.rows.find(row => row.kind === 'archived')?.details.priority, 'urgent')
        assert.equal(Number((await db.query<{ revision: number }>(`select revision from public.cards where id = '${card.id}'`)).rows[0].revision), Number(card.revision) + 1)
        assert.ok(Number((await db.query<{ revision: number }>(`select revision from public.boards where id = '${boardA}'`)).rows[0].revision) > before)
      })
    })
    await t.test('deleting labels preserves their name in server-generated history without duplicate events', async () => {
      await asUser(a, async () => {
        const card = (await db.query<{ id: string }>(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Card') returning id`)).rows[0].id
        const label = (await db.query<{ id: string }>(`insert into public.board_labels(board_id, name, color) values ('${boardA}', 'Diseño', 'purple') returning id`)).rows[0].id
        await db.query(`insert into public.card_labels values ('${boardA}', '${card}', '${label}')`)
        await db.query(`delete from public.board_labels where id = '${label}'`)
        const events = await db.query<{ kind: string; details: { label_name: string } }>(`select kind, details from public.card_activity where card_id = '${card}' and kind in ('label-added', 'label-removed')`)
        assert.equal(events.rows.length, 2)
        assert.equal(events.rows.filter(row => row.kind === 'label-removed').length, 1)
        assert.ok(events.rows.every(row => row.details.label_name === 'Diseño'))
        assert.equal((await db.query(`select * from public.card_labels where card_id = '${card}'`)).rows.length, 0)
      })
    })
    await t.test('fixed palette, priorities, label uniqueness and card-label uniqueness are enforced', async () => {
      await asUser(a, async () => {
        await denied(`insert into public.board_labels(board_id, name, color) values ('${boardA}', 'Bad', 'neon')`, '23514')
        await denied(`insert into public.cards(board_id, column_id, title, priority) values ('${boardA}', '${columnA}', 'Bad', 'unknown')`, '23514')
        await denied(`insert into public.cards(board_id, column_id, title, due_date) values ('${boardA}', '${columnA}', 'Bad', '2026-02-30')`, '22008')
        const card = (await db.query<{ id: string }>(`insert into public.cards(board_id, column_id, title) values ('${boardA}', '${columnA}', 'Card') returning id`)).rows[0].id
        const label = (await db.query<{ id: string }>(`insert into public.board_labels(board_id, name, color) values ('${boardA}', 'Diseño', 'purple') returning id`)).rows[0].id
        await denied(`insert into public.board_labels(board_id, name, color) values ('${boardA}', ' diseño ', 'rose')`, '23505')
        await db.query(`insert into public.card_labels values ('${boardA}', '${card}', '${label}')`)
        await denied(`insert into public.card_labels values ('${boardA}', '${card}', '${label}')`, '23505')
      })
    })
  } finally { await db.close() }
})
