import { duplicateBoard } from '../src/lib/duplicate.ts'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'
import { decodeCloudSnapshot, createCloudRequest } from '../src/storage/cloudWorkspaceRepository.ts'
import { prepareLocalBoardImport } from '../src/lib/localBoardImport.ts'
import { createBoard } from '../src/lib/workspace.ts'
import { createBackup } from '../src/lib/workspaceBackup.ts'

test('local board import preserves history, remaps identities and is atomic/idempotent', async () => {
  const db = new PGlite()
  const user = '00000000-0000-0000-0000-000000000001'
  const other = '00000000-0000-0000-0000-000000000002'
  const timestamp = '2020-02-03T12:00:00.000Z'
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}');
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`)
    for (const name of ['202610220002_private_boards.sql','202610220003_cloud_workspace.sql','202610240001_import_local_boards.sql','202610240002_card_checklists.sql']) await db.exec(await readFile(new URL(`../supabase/migrations/${name}`,import.meta.url),'utf8'))
    await db.exec(`insert into auth.users values ('${user}',now(),'{"display_name":"Cuenta actual"}'),('${other}',now(),'{}')`)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]); await db.exec('set role authenticated')
    const local = [{id:'default',title:'Trabajo local',archivedAt:timestamp,columns:[{id:'todo',title:'Por hacer',description:''},{id:'done',title:'Hecho',description:''}],labels:[{id:'label-local',name:'Diseño',color:'purple'}],cards:[{
      checklist:[{id:'step-one',title:'Boceto',completed:true},{id:'step-two',title:'Revisión',completed:false}],id:'card-local',title:'Tarjeta antigua',description:'Contexto',status:'done',priority:'urgent',dueDate:'2026-10-24',archivedAt:timestamp,labelIds:['label-local'],
      comments:[{id:'old-comment',author:'Nombre antiguo',body:'Comentario original',createdAt:timestamp,author_id:user}],
      activity:[{id:'old-event',kind:'moved',actor:'Autor antiguo',message:'movió la tarjeta a «Hecho».',createdAt:timestamp,actor_id:user}],
    }]}]
    const copy = async (boards: unknown, operationId: string) => (await db.query<{value:unknown}>('select public.viflow_import_local_boards($1::jsonb,$2::uuid) as value',[JSON.stringify(boards),operationId])).rows[0].value as {importedBoardIds:string[]}
    const load = async () => decodeCloudSnapshot((await db.query<{value:unknown}>('select public.viflow_load_workspace() as value')).rows[0].value)
    const operation = crypto.randomUUID()
    const result = await copy(local,operation)
    const snapshot = decodeCloudSnapshot(result)
    assert.equal(result.importedBoardIds.length,1)
    const imported = snapshot.workspace.boards[0]
    assert.notEqual(imported.id,'default'); assert.equal(Date.parse(imported.archivedAt!),Date.parse(timestamp))
    assert.deepEqual(imported.cards[0].checklist,local[0].cards[0].checklist)
    assert.equal(imported.cards[0].priority,'urgent'); assert.equal(imported.cards[0].status,'done')
    assert.equal(imported.cards[0].comments?.[0].author,'Nombre antiguo')
    assert.equal(imported.cards[0].comments?.[0].source,'local_import')
    assert.equal(Date.parse(imported.cards[0].comments![0].createdAt),Date.parse(timestamp))
    assert.notEqual(imported.cards[0].comments?.[0].id,'old-comment')
    assert.equal(imported.cards[0].activity?.length,1)
    assert.equal(imported.cards[0].activity?.[0].message,'movió la tarjeta a «Hecho».')
    assert.equal(imported.cards[0].activity?.[0].source,'local_import')
    const author = (await db.query<{author_id:unknown;source:string}>('select author_id,source from public.card_comments')).rows[0]
    assert.equal(author.author_id,null)
    assert.equal((await db.query<{actor_id:unknown}>('select actor_id from public.card_activity')).rows[0].actor_id,null)
    const dbIds = await db.query<{id:string}>('select id from public.cards union all select id from public.board_columns union all select id from public.board_labels')
    assert.ok(dbIds.rows.every(row=>/^[a-f0-9-]{36}$/.test(row.id)))
    assert.deepEqual((await copy(local,operation)).importedBoardIds,result.importedBoardIds)
    assert.equal((await load()).workspace.boards.length,1)
    await assert.rejects(copy([{...local[0],title:'Different payload'}],operation),(error:unknown)=>(error as {code:string}).code==='22023')
    assert.equal((await load()).workspace.boards[0].title,'Trabajo local')
    const edited = {...imported,cards:imported.cards.map(card=>({...card,checklist:card.checklist?.map(item=>({...item,completed:true})),title:'Editada',comments:[...(card.comments??[]),{id:'new-comment',author:'Fake',body:'Comentario desde cuenta',createdAt:timestamp}]}))}
    const request = createCloudRequest(snapshot,{boards:[edited],activeBoardId:'',openBoardIds:[]})
    await db.query('select public.viflow_save_workspace($1::jsonb,$2::uuid)',[JSON.stringify(request.changes),request.operationId])
    const updated = (await load()).workspace.boards[0].cards[0]
    assert.ok(updated.checklist?.every(item=>item.completed))
    assert.deepEqual(createBackup((await load()).workspace).workspace.boards[0].cards[0].checklist,updated.checklist)
    assert.equal(updated.comments?.find(c=>c.body==='Comentario desde cuenta')?.author,'Cuenta actual')
    assert.equal(updated.comments?.find(c=>c.body==='Comentario original')?.author,'Nombre antiguo')
    assert.equal(updated.activity?.find(c=>c.kind==='title-edited')?.source,'account')
    assert.equal(createBackup((await load()).workspace).workspace.boards[0].cards[0].comments?.find(c=>c.body==='Comentario original')?.source,'local_import')
    const badChecklist = structuredClone(local)
    badChecklist[0].cards[0].checklist[0].title = ''
    await assert.rejects(copy(badChecklist,crypto.randomUUID()),(error:unknown)=>(error as {code:string}).code==='22023')
    assert.equal((await load()).workspace.boards.length,1)
    const bad=[{...local[0],cards:[{...local[0].cards[0],activity:[{...local[0].cards[0].activity[0],kind:'invalid'}]}]}]
    await assert.rejects(copy(bad,crypto.randomUUID()))
    assert.equal((await load()).workspace.boards.length,1)
    const second=await copy(local,crypto.randomUUID())
    assert.notEqual(second.importedBoardIds[0],imported.id)
    assert.equal((await load()).workspace.boards.length,2)
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other])
    assert.equal((await load()).workspace.boards.length,0)
    const own=await copy(local,operation)
    assert.notEqual(own.importedBoardIds[0],imported.id)
    assert.equal((await load()).workspace.boards.length,1)
    // Exercise the actual client payload for a normal board that has never
    // created labels, rather than hand-writing labels: [] in every fixture.
    const noLabels = { ...createBoard('Sin etiquetas'), cards: [
      {id:'first', title:'Primera', description:'', status:'todo'},
      {id:'second', title:'Segunda', description:'', status:'todo'},
    ] }
    assert.equal(noLabels.labels, undefined)
    await assert.rejects(copy([noLabels], crypto.randomUUID()), (error: unknown) => (error as {code:string}).code === '22023')
    const noLabelsResult = await copy(prepareLocalBoardImport([noLabels]), crypto.randomUUID())
    const copiedWithoutLabels = (await load()).workspace.boards.find(board => board.id === noLabelsResult.importedBoardIds[0])!
    assert.equal(copiedWithoutLabels.cards.length, 2)
    assert.deepEqual(copiedWithoutLabels.labels, [])
    assert.equal(noLabels.labels, undefined)
    const beforeCopy = await load()
    const duplicated = duplicateBoard(copiedWithoutLabels, {title:'Tablero duplicado',keepDates:false,keepLabels:true})
    const duplicateRequest = createCloudRequest(beforeCopy,{...beforeCopy.workspace,boards:[...beforeCopy.workspace.boards,duplicated]})
    await db.query('select public.viflow_save_workspace($1::jsonb,$2::uuid)',[JSON.stringify(duplicateRequest.changes),duplicateRequest.operationId])
    const afterCopy = await load()
    assert.equal(afterCopy.workspace.boards.length,beforeCopy.workspace.boards.length+1)
    assert.equal(afterCopy.workspace.boards.find(board=>board.id===duplicated.id)?.cards.length,2)
    assert.deepEqual(afterCopy.workspace.boards.find(board=>board.id===copiedWithoutLabels.id),copiedWithoutLabels)
    await db.exec('reset role; set role anon')
    await assert.rejects(copy(local,crypto.randomUUID()),(error:unknown)=>(error as {code:string}).code==='42501')
  } finally { await db.close() }
})
