import assert from 'node:assert/strict'
import { test } from 'node:test'
import { upcomingCards } from '../src/lib/upcoming.ts'
import { createBoard } from '../src/lib/workspace.ts'
const now = new Date(2026,9,24,23,30) // Saturday, local calendar.
const card=(id:string,dueDate?:string,status='todo')=>({id,title:id,description:'',status,dueDate})
test('groups all visible boards into overdue, today and the remainder of the calendar week',()=> {
  const a={...createBoard('A'),cards:[card('later','2026-10-25'),card('today','2026-10-24'),card('old','2026-10-22'),card('next-week','2026-10-26')]}
  const b={...createBoard('B'),cards:[card('other','2026-10-23')]}
  const before=JSON.stringify([a,b])
  const rows=upcomingCards([a,b],now)
  assert.deepEqual(rows.map(row=>[row.card.id,row.group]),[['old','overdue'],['other','overdue'],['today','today'],['later','week']])
  assert.equal(rows[1].board.id,b.id)
  assert.equal(JSON.stringify([a,b]),before)
})
test('omits completed, undated and archived work without affecting stored data',()=> {
  const board={...createBoard('A'),cards:[card('done','2026-10-20','done'),card('undated'),{...card('archived','2026-10-21'),archivedAt:'2026-10-22'}]}
  assert.deepEqual(upcomingCards([board],now),[])
  assert.deepEqual(upcomingCards([{...board,archivedAt:'2026-10-23',cards:[card('hidden','2026-10-24')]}],now),[])
})
test('week ends on Sunday and rolls through month/year boundaries in local time',()=> {
  const board={...createBoard('A'),cards:[card('sunday','2027-01-03'),card('monday','2027-01-04')]}
  assert.deepEqual(upcomingCards([board],new Date(2026,11,31,12)).map(row=>row.card.id),['sunday'])
  assert.deepEqual(upcomingCards([board],new Date(2027,0,3,23,59)).map(row=>row.group),['today'])
  assert.deepEqual(upcomingCards([board],new Date(2027,0,4,0,1)).map(row=>row.group),['overdue','today'])
})
