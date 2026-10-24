import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBoard, workspaceStorageKey } from '../src/lib/workspace.ts'
import { prepareLocalBoardImport, readLocalImportBoards, localImportCounts } from '../src/lib/localBoardImport.ts'
import { createLocalBoardImportService, localBoardImportError } from '../src/services/localBoardImportService.ts'

test('reads only saved local boards, never manufactures default examples or writes storage', () => {
  assert.deepEqual(readLocalImportBoards({ getItem:()=>null }),[])
  const board=createBoard('Local')
  const serialized=JSON.stringify({boards:[board],activeBoardId:board.id,openBoardIds:[board.id]})
  assert.deepEqual(readLocalImportBoards({getItem:key=>key===workspaceStorageKey?serialized:null}),[board])
  assert.throws(()=>readLocalImportBoards({getItem:()=>'{bad json'}))
  const legacy=readLocalImportBoards({getItem:key=>key==='viflow.board.v2'?JSON.stringify(board):null})
  assert.equal(legacy.length,1)
})
test('selection preparation validates limits, keeps history/archives and strips identity injection', () => {
  const board={...createBoard('Local'),archivedAt:'2020-01-01',owner_id:'attacker',cards:[{id:'a',title:'Tarjeta',description:'',status:'todo',comments:[{id:'c',author:'Invitado',createdAt:'2020-01-01',body:'Texto',author_id:'attacker'}]}]}
  const before=JSON.stringify(board)
  const result=prepareLocalBoardImport([board])
  assert.equal(JSON.stringify(board),before)
  assert.doesNotMatch(JSON.stringify(result),/attacker|owner_id|author_id/)
  assert.equal(result[0].cards[0].comments?.[0].author,'Invitado')
  assert.equal(localImportCounts(result).comments,1)
  assert.equal(localImportCounts(result).archived,1)
  assert.throws(()=>prepareLocalBoardImport([]))
  assert.throws(()=>prepareLocalBoardImport([{...board,title:'a'.repeat(161)}]))
})
test('an uncertain import reuses its persisted operation ID across service instances', async () => {
  const user='user-a'
  const board=createBoard('Local')
  const remote={...board,id:crypto.randomUUID(),labels:[],cards:[],_columnTitles:{}}
  const output={boards:[remote],revisions:{[remote.id]:1},importedBoardIds:[remote.id]}
  const values=new Map<string,string>()
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}
  const requests: unknown[]=[]
  let fail=true
  const client={auth:{getUser:async()=>({data:{user:{id:user,email_confirmed_at:'date'}},error:null})},rpc:async (_name:string,payload:unknown)=>{
    requests.push(payload)
    return fail?{data:null,error:{code:'network'}}:{data:output,error:null}
  }} as unknown as Parameters<typeof createLocalBoardImportService>[0]
  await assert.rejects(createLocalBoardImportService(client,user,storage).copy([board]))
  assert.equal(values.size,1)
  assert.doesNotMatch([...values.entries()].flat().join(' '),/Local|columns|comments/)
  fail=false
  const result=await createLocalBoardImportService(client,user,storage).copy([board])
  assert.deepEqual(requests[0],requests[1])
  assert.deepEqual(result.importedBoardIds,[remote.id])
  assert.equal(values.size,0)
})
test('refuses transmission when retry storage or the expected account is unavailable', async () => {
  let sent=false
  const client={auth:{getUser:async()=>({data:{user:{id:'other',email_confirmed_at:'date'}},error:null})},rpc:async()=>{sent=true;return {}}} as unknown as Parameters<typeof createLocalBoardImportService>[0]
  const unavailable={getItem:()=>null,setItem:()=>{throw new Error('blocked')},removeItem:()=>{}}
  await assert.rejects(createLocalBoardImportService(client,'a',unavailable).copy([createBoard('Local')]))
  const values=new Map<string,string>()
  const available={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:()=>{}}
  await assert.rejects(createLocalBoardImportService(client,'a',available).copy([createBoard('Local')]))
  assert.equal(sent,false)
  assert.doesNotMatch(localBoardImportError(new Error('server secret')),/server secret/)
  assert.match(localBoardImportError({code:'PGRST202'}),/202610240001/)
})
