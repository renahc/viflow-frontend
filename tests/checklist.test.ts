import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isChecklist } from '../src/lib/checklist.ts'
import { createBoard, parseWorkspace } from '../src/lib/workspace.ts'
import { createBackup, parseBackup } from '../src/lib/workspaceBackup.ts'
import { createCloudRequest } from '../src/storage/cloudWorkspaceRepository.ts'
const items = [{ id:'one', title:'Primer paso', completed:false }, { id:'two', title:'Segundo paso', completed:true }]
test('checklist rejects invalid items, duplicates and unbounded content', () => {
  assert.equal(isChecklist(items),true)
  for (const value of [null,{},[...items,items[0]],[{...items[0],title:''}],[{...items[0],title:'a'.repeat(201)}],[{...items[0],completed:'yes'}],Array(101).fill(items[0])]) assert.equal(isChecklist(value),false)
})
test('checklists survive local validation, backups and cloud request changes', () => {
  const board = {...createBoard('Proyecto'),cards:[{id:'card',title:'Tarea',description:'',status:'todo',checklist:items}]}
  const workspace = { boards:[board],activeBoardId:board.id,openBoardIds:[board.id] }
  assert.ok(parseWorkspace(workspace))
  const restored = parseBackup(JSON.stringify(createBackup(workspace)))
  assert.deepEqual(restored.workspace.boards[0].cards[0].checklist,items)
  const snapshot={workspace,revisions:{[board.id]:1}}
  assert.equal(createCloudRequest(snapshot,workspace).changes.length,0)
  const next=structuredClone(workspace); next.boards[0].cards[0].checklist[0].completed=true
  assert.equal(createCloudRequest(snapshot,next).changes.length,1)
  next.boards[0].cards[0].checklist=[]
  assert.equal(createCloudRequest(snapshot,next).changes.length,1)
})

test('cloud refuses to send checklist content to a server without its migration', async () => {
  const { createCloudWorkspaceRepository, cloudWorkspaceError } = await import('../src/storage/cloudWorkspaceRepository.ts')
  const calls: string[]=[]
  const client={rpc:async(name:string)=>{calls.push(name);return {data:null,error:{code:'PGRST202'}}}} as unknown as Parameters<typeof createCloudWorkspaceRepository>[0]
  await assert.rejects(createCloudWorkspaceRepository(client).save({operationId:crypto.randomUUID(),changes:[{board:{cards:[{checklist:items}]},expectedRevision:1,position:0}]}), /checklist_migration_required/)
  assert.deepEqual(calls,['viflow_checklist_version'])
  assert.match(cloudWorkspaceError(new Error('checklist_migration_required')).message,/202610240002/)
})
