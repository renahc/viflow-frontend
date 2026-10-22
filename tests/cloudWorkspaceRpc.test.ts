import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { createBoard } from '../src/lib/workspace.ts'
import { createCloudRequest, decodeCloudSnapshot } from '../src/storage/cloudWorkspaceRepository.ts'

test('cloud RPC saves atomically with revision checks, retries and account isolation', async () => {
  const db = new PGlite()
  const user = '00000000-0000-0000-0000-000000000001'
  const other = '00000000-0000-0000-0000-000000000002'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`)
    for (const filename of ['202610220002_private_boards.sql','202610220003_cloud_workspace.sql']) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${filename}`,import.meta.url),'utf8'))
    }
    await db.exec(`insert into auth.users values ('${user}',now(),'{"display_name":"Rena"}'), ('${other}',now(),'{}')`)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
    await db.exec('set role authenticated')
    async function load() { return decodeCloudSnapshot((await db.query<{ value: unknown }>('select public.viflow_load_workspace() as value')).rows[0].value) }
    async function save(request: ReturnType<typeof createCloudRequest>) {
      return decodeCloudSnapshot((await db.query<{ value: unknown }>('select public.viflow_save_workspace($1::jsonb,$2::uuid) as value',[JSON.stringify(request.changes),request.operationId])).rows[0].value)
    }
    const initial = await load()
    assert.equal(initial.workspace.boards.length,0)
    const board = createBoard('Mi tablero en la nube')
    const created = createCloudRequest(initial,{ boards:[board],activeBoardId:board.id,openBoardIds:[board.id] })
    let snapshot = await save(created)
    assert.equal(snapshot.workspace.boards.length,1)
    assert.deepEqual(snapshot.workspace.boards[0].columns.map(column=>column.id),['todo','in-progress','done'])
    const replay = await save(created)
    assert.deepEqual(replay.revisions,snapshot.revisions)
    assert.equal(replay.workspace.boards.length,1)
    const current = snapshot.workspace.boards[0]
    const cardId = crypto.randomUUID()
    const edited = { ...current, cards:[{ id:cardId,title:'Tarjeta',description:'Contexto',status:'todo',labelIds:['label-a'],comments:[{id:'comment-a',body:'Comentario',author:'Falso',createdAt:'2000-01-01'}] }], labels:[{id:'label-a',name:'Diseño',color:'purple' as const}] }
    const request = createCloudRequest(snapshot,{boards:[edited],activeBoardId:board.id,openBoardIds:[board.id]})
    snapshot = await save(request)
    const card = snapshot.workspace.boards[0].cards[0]
    assert.equal(card.comments?.[0].author,'Rena')
    assert.notEqual(card.comments?.[0].createdAt,'2000-01-01')
    assert.ok(card.activity?.some(entry=>entry.kind==='created'))
    assert.ok(card.activity?.some(entry=>entry.kind==='label-added'))
    assert.equal((await save(request)).workspace.boards[0].cards[0].comments?.length,1)
    const stale = createCloudRequest(replay,{boards:[{...edited,title:'Stale'}],activeBoardId:board.id,openBoardIds:[board.id]})
    await assert.rejects(save(stale),(error:unknown)=>(error as {code:string}).code==='40001')
    assert.equal((await load()).workspace.boards[0].title,'Mi tablero en la nube')
    const moved = {...snapshot.workspace.boards[0],columns:snapshot.workspace.boards[0].columns.filter(col=>col.id!=='todo'),cards:[{...card,status:'done',archivedAt:new Date().toISOString()}]}
    snapshot = await save(createCloudRequest(snapshot,{boards:[moved],activeBoardId:board.id,openBoardIds:[board.id]}))
    assert.equal(snapshot.workspace.boards[0].columns.length,2)
    assert.equal(snapshot.workspace.boards[0].cards[0].status,'done')
    assert.ok(snapshot.workspace.boards[0].cards[0].archivedAt)
    const beforeFailure = snapshot
    const invalid = {...moved,cards:[{...card,status:'missing'}]}
    await assert.rejects(save(createCloudRequest(snapshot,{boards:[{...invalid,title:'Must roll back'}],activeBoardId:board.id,openBoardIds:[board.id]})))
    assert.deepEqual((await load()).revisions,beforeFailure.revisions)
    assert.equal((await load()).workspace.boards[0].title,'Mi tablero en la nube')
    const direct = await db.query<{allowed:boolean}>("select has_any_column_privilege('authenticated','public.cards','insert') as allowed")
    assert.equal(direct.rows[0].allowed,false)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other])
    assert.equal((await load()).workspace.boards.length,0)
    await assert.rejects(save(createCloudRequest({workspace:{boards:[],activeBoardId:'',openBoardIds:[]},revisions:{}},{boards:[board],activeBoardId:board.id,openBoardIds:[board.id]})),(error:unknown)=>(error as {code:string}).code==='42501')
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user])
    assert.equal((await load()).workspace.boards.length,1)
  } finally { await db.close() }
})
