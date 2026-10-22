import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cloudWorkspaceError, createCloudRequest, createCloudWorkspaceRepository, decodeCloudSnapshot } from '../src/storage/cloudWorkspaceRepository.ts'
import { createBoard } from '../src/lib/workspace.ts'

test('navigation-only changes do not write cloud content or upload audit identity', () => {
  const board = { ...createBoard('Cuenta'), cards:[{id:'a',status:'todo',title:'Tarjeta',description:'',activity:[{id:'event',actor:'Rena',kind:'created' as const,message:'created',createdAt:'2026-10-21'}]}] }
  const baseline = {workspace:{boards:[board],activeBoardId:'',openBoardIds:[]},revisions:{[board.id]:5}}
  assert.equal(createCloudRequest(baseline,{...baseline.workspace,activeBoardId:board.id,openBoardIds:[board.id]}).changes.length,0)
  const next = {...board,title:'Nuevo nombre'}
  const change = createCloudRequest(baseline,{...baseline.workspace,boards:[next]}).changes[0]
  assert.equal(change.expectedRevision,5)
  assert.doesNotMatch(JSON.stringify(change),/actor|createdAt|activity|owner_id/)
})
test('rejects malformed server snapshots rather than replacing the account with empty data', () => {
  for (const value of [null,{}, {boards:[],revisions:null}, {boards:[{id:'x'}],revisions:{x:1}}]) assert.throws(()=>decodeCloudSnapshot(value))
  assert.deepEqual(decodeCloudSnapshot({boards:[],revisions:{}}).workspace.boards,[])
})
test('retries reuse the exact operation identifier, and service failures remain actionable', async () => {
  const requests: unknown[] = []
  const api = {rpc:async (_method: string,payload:unknown)=>{requests.push(payload);return {data:{boards:[],revisions:{}},error:null}}} as unknown as Parameters<typeof createCloudWorkspaceRepository>[0]
  const repository = createCloudWorkspaceRepository(api)
  const request={changes:[],operationId:crypto.randomUUID()}
  await repository.save(request); await repository.save(request)
  assert.deepEqual(requests[0],requests[1])
  assert.equal(cloudWorkspaceError({code:'40001'}).conflict,true)
  assert.match(cloudWorkspaceError({code:'PGRST202'}).message,/migración/)
  assert.doesNotMatch(cloudWorkspaceError({message:'private server secret'}).message,/private server secret/)
})
