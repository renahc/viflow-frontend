import { createBackup, maxBackupBytes } from '../lib/workspaceBackup.ts'
import { parseWorkspace } from '../lib/workspace.ts'
import type { Workspace } from '../lib/workspace.ts'
import { createCloudRequest } from './cloudWorkspaceRepository.ts'
import type { CloudRequest } from './cloudWorkspaceRepository.ts'
export type CloudDraft = { userId: string; savedAt: string; request: CloudRequest; next: Workspace }
type StorageAccess = Pick<Storage,'length'|'key'|'getItem'|'setItem'|'removeItem'>
const prefix = (userId:string) => `viflow.cloud-draft.v1:${encodeURIComponent(userId)}:`
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function validate(value: unknown, userId: string): CloudDraft {
  if (!value || typeof value !== 'object') throw new Error('invalid_draft')
  const data=value as CloudDraft
  const next=parseWorkspace(data.next)
  if (data.userId!==userId || typeof data.savedAt!=='string' || !Number.isFinite(Date.parse(data.savedAt)) || !next || !data.request || !uuid.test(data.request.operationId) || !Array.isArray(data.request.changes) || !data.request.changes.length) throw new Error('invalid_draft')
  const clean=createBackup(next).workspace
  const canonical=createCloudRequest({workspace:{boards:[],activeBoardId:'',openBoardIds:[]},revisions:{}},clean).changes
  const seen=new Set<string>()
  const changes=data.request.changes.map(change=> {
    const expected=canonical.find(item=>item.position===change.position && item.board.id===change.board?.id)
    if (!expected || seen.has(String(expected.board.id)) || !Number.isSafeInteger(change.expectedRevision) || change.expectedRevision<0 || JSON.stringify(expected.board)!==JSON.stringify(change.board)) throw new Error('invalid_draft')
    seen.add(String(expected.board.id))
    return {...expected,expectedRevision:change.expectedRevision}
  })
  return {userId,savedAt:data.savedAt,next:clean,request:{operationId:data.request.operationId,changes}}
}
export function createCloudDraftStore(storage: () => StorageAccess) {
  return {
    read(userId:string): { drafts:CloudDraft[]; error:boolean } {
      const drafts:CloudDraft[]=[]; let error=false
      try {
        const target=storage()
        for (let index=0;index<target.length;index++) {
          const key=target.key(index)
          if (!key?.startsWith(prefix(userId))) continue
          try {
            const raw=target.getItem(key)
            if (!raw || new TextEncoder().encode(raw).byteLength>maxBackupBytes*2) throw new Error('invalid_draft')
            const draft=validate(JSON.parse(raw),userId)
            if (key!==prefix(userId)+draft.request.operationId) throw new Error('invalid_draft_key')
            drafts.push(draft)
          } catch { error=true }
        }
      } catch { error=true }
      return {drafts:drafts.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)),error}
    },
    write(draft:CloudDraft): boolean {
      try {
        const clean=validate(draft,draft.userId)
        const raw=JSON.stringify(clean)
        if (new TextEncoder().encode(raw).byteLength>maxBackupBytes*2) return false
        const target=storage(); const key=prefix(draft.userId)+draft.request.operationId
        target.setItem(key,raw)
        return target.getItem(key)===raw
      } catch { return false }
    },
    remove(userId:string,operationId:string): boolean {
      try { const target=storage(); const key=prefix(userId)+operationId; target.removeItem(key); return target.getItem(key)===null } catch { return false }
    },
  }
}
