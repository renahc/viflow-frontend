import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyCardFilters, matchesCardFilters } from '../src/lib/cardFilters.ts'
const card = { id:'a', title:'Diseño del menú', description:'Preparar navegación móvil', status:'todo', priority:'high' as const, dueDate:'2026-10-24', labelIds:['design'] }
const now = new Date('2026-10-24T12:00:00')
test('search matches title and description with accents, case and multiple terms', () => {
  assert.equal(matchesCardFilters(card,{...emptyCardFilters,query:'MENU movil'},now),true)
  assert.equal(matchesCardFilters(card,{...emptyCardFilters,query:'menú ausente'},now),false)
})
test('filters intersect without mutating cards or manual order', () => {
  const before=JSON.stringify(card)
  assert.equal(matchesCardFilters(card,{query:'diseño',label:'design',priority:'high',due:'today',status:'pending'},now),true)
  assert.equal(matchesCardFilters(card,{...emptyCardFilters,label:'other'},now),false)
  assert.equal(matchesCardFilters(card,{...emptyCardFilters,priority:'urgent'},now),false)
  assert.equal(JSON.stringify(card),before)
})
test('due filters respect local calendar and completed cards', () => {
  assert.equal(matchesCardFilters({...card,status:'done'},{...emptyCardFilters,due:'today'},now),false)
  assert.equal(matchesCardFilters({...card,dueDate:'2026-10-23'},{...emptyCardFilters,due:'overdue'},now),true)
  assert.equal(matchesCardFilters({...card,dueDate:undefined,priority:undefined},{...emptyCardFilters,due:'none',priority:'none'},now),true)
  assert.equal(matchesCardFilters({...card,status:'done'},{...emptyCardFilters,status:'completed',due:'dated'},now),true)
})
