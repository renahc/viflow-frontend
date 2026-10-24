import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createCloudDraftStore } from '../src/storage/cloudDrafts.ts'
import { createCloudRequest } from '../src/storage/cloudWorkspaceRepository.ts'
import { createBoard } from '../src/lib/workspace.ts'
function memory() {
  const values=new Map<string,string>()
  return {values,storage:{get length(){return values.size},key:(index:number)=>[...values.keys()][index]??null,getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value)},removeItem:(key:string)=>{values.delete(key)}}}
}
function draft(userId='a') {
  const board={...createBoard('Mi proyecto'),cards:[{id:'task',title:'Cambio pendiente',description:'Detalle',status:'todo',checklist:[{id:'step',title:'Paso',completed:true}]}]}
  const next={boards:[board],activeBoardId:board.id,openBoardIds:[board.id]}
  const request=createCloudRequest({workspace:{boards:[],activeBoardId:'',openBoardIds:[]},revisions:{}},next)
  return {userId,savedAt:new Date().toISOString(),next,request}
}
test('draft survives a store recreation with the exact operation, revision and content for safe replay',()=> {
  const {storage}=memory(); const pending=draft()
  pending.request.changes[0].expectedRevision=7
  assert.equal(createCloudDraftStore(()=>storage).write(pending),true)
  const restored=createCloudDraftStore(()=>storage).read('a')
  assert.equal(restored.error,false); assert.equal(restored.drafts.length,1)
  assert.equal(restored.drafts[0].request.operationId,pending.request.operationId)
  assert.equal(restored.drafts[0].request.changes[0].expectedRevision,7)
  assert.deepEqual(JSON.parse(JSON.stringify(restored.drafts[0].request)),JSON.parse(JSON.stringify(pending.request)))
  assert.deepEqual(restored.drafts[0].next.boards[0].cards[0].checklist,pending.next.boards[0].cards[0].checklist)
})
test('accounts and concurrent tabs keep separate drafts; acknowledgement removes only its operation',()=> {
  const {storage,values}=memory(); const store=createCloudDraftStore(()=>storage)
  const first=draft(),second=draft(),other=draft('b')
  for (const value of [first,second,other]) assert.equal(store.write(value),true)
  assert.equal(store.read('a').drafts.length,2); assert.equal(store.read('b').drafts.length,1); assert.deepEqual(store.read('guest').drafts,[])
  assert.equal(store.remove('a',first.request.operationId),true)
  assert.equal(values.size,2); assert.equal(store.read('a').drafts[0].request.operationId,second.request.operationId)
  store.remove('a',other.request.operationId)
  assert.equal(store.read('b').drafts.length,1)
})
test('invalid or tampered drafts remain untouched and never become cloud requests',()=> {
  const {storage,values}=memory(); const store=createCloudDraftStore(()=>storage); const value=draft()
  assert.equal(store.write(value),true)
  const key=[...values.keys()][0]
  for (const mutate of [
    (value:ReturnType<typeof draft>)=>{value.userId='other'},
    (value:ReturnType<typeof draft>)=>{value.request.changes[0].expectedRevision=-1},
    (value:ReturnType<typeof draft>)=>{value.request.changes[0].board.owner_id='attacker'},
    (value:ReturnType<typeof draft>)=>{value.request.changes[0].board.title='Different payload'},
    (value:ReturnType<typeof draft>)=>{value.request.operationId=crypto.randomUUID()},
  ]) {
    const changed=structuredClone(value); mutate(changed); const raw=JSON.stringify(changed); values.set(key,raw)
    assert.deepEqual(store.read('a'),{drafts:[],error:true}); assert.equal(values.get(key),raw)
  }
  values.set(key,'{broken'); assert.equal(store.read('a').error,true); assert.equal(values.get(key),'{broken')
})
test('storage quota, disabled storage and failed removal never claim persistence or erase drafts',()=> {
  const {storage}=memory(); const pending=draft()
  const store=createCloudDraftStore(()=>storage); store.write(pending)
  const quota=createCloudDraftStore(()=>({...storage,setItem:()=>{throw new Error('quota')},removeItem:()=>{throw new Error('disabled')}}))
  assert.equal(quota.write(draft()),false); assert.equal(quota.remove('a',pending.request.operationId),false)
  assert.equal(store.read('a').drafts.length,1)
  const blocked=createCloudDraftStore(()=>{throw new Error('blocked')})
  assert.equal(blocked.write(pending),false); assert.deepEqual(blocked.read('a'),{drafts:[],error:true})
})
test('drafts persist only known workspace fields, not session or ownership metadata',()=> {
  const {storage,values}=memory(); const pending=draft()
  Object.assign(pending.next.boards[0],{owner_id:'private-owner',access_token:'do-not-store'})
  assert.equal(createCloudDraftStore(()=>storage).write(pending),true)
  assert.doesNotMatch([...values.values()].join(''),/private-owner|do-not-store|access_token|owner_id/)
})
