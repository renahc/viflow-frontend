import assert from 'node:assert/strict'
import { test } from 'node:test'
import { duplicateBoard, duplicateCard } from '../src/lib/duplicate.ts'
import { createBoard, parseWorkspace } from '../src/lib/workspace.ts'
const source = {...createBoard('Original'),labels:[{id:'label',name:'Diseño',color:'purple' as const}],cards:[
  {id:'a',title:'Diseñar',description:'Detalle',status:'done',priority:'high' as const,dueDate:'2026-11-01',labelIds:['label'],checklist:[{id:'step',title:'Boceto',completed:true}],comments:[{id:'c',author:'Yo',body:'Comentario',createdAt:'2026-10-24'}],activity:[{id:'event',actor:'Yo',kind:'created' as const,message:'creó',createdAt:'2026-10-24'}]},
  {id:'b',title:'Archivada',description:'',status:'todo',archivedAt:'2026-10-24'}
]}
test('duplicates a card independently, resets steps and excludes old identity/history', () => {
  const before=JSON.stringify(source)
  const copy=duplicateCard(source.cards[0],{title:' Nueva ',keepDates:true,keepLabels:true})
  assert.notEqual(copy.id,source.cards[0].id)
  assert.equal(copy.title,'Nueva'); assert.equal(copy.status,'done'); assert.equal(copy.priority,'high')
  assert.equal(copy.dueDate,'2026-11-01'); assert.deepEqual(copy.labelIds,['label'])
  assert.equal(copy.checklist?.[0].completed,false); assert.notEqual(copy.checklist?.[0].id,'step')
  assert.equal(copy.comments,undefined); assert.equal(copy.activity,undefined); assert.equal(copy.archivedAt,undefined)
  copy.checklist![0].title='Otra cosa'; copy.labelIds!.push('another')
  assert.equal(JSON.stringify(source),before)
  const clean=duplicateCard(source.cards[0],{title:'Otra',keepDates:false,keepLabels:false})
  assert.equal(clean.dueDate,undefined); assert.deepEqual(clean.labelIds,[])
})
test('duplicates a board with valid relationships, separate labels and no archived cards', () => {
  const before=JSON.stringify(source)
  const copy=duplicateBoard(source,{title:'Copia',keepDates:true,keepLabels:true})
  assert.notEqual(copy.id,source.id); assert.equal(copy.cards.length,1)
  assert.equal(copy.cards[0].status,'done'); assert.notEqual(copy.labels?.[0].id,'label')
  assert.equal(copy.cards[0].labelIds?.[0],copy.labels?.[0].id)
  assert.ok(parseWorkspace({boards:[source,copy],activeBoardId:copy.id,openBoardIds:[copy.id]}))
  copy.columns[0].title='Modificada'; copy.labels![0].name='Otra'
  assert.equal(JSON.stringify(source),before)
  const clean=duplicateBoard(source,{title:'Sin etiquetas',keepDates:false,keepLabels:false})
  assert.deepEqual(clean.labels,[]); assert.deepEqual(clean.cards[0].labelIds,[]); assert.equal(clean.cards[0].dueDate,undefined)
})
