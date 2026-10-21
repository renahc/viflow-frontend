import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createAccountSecurityService, accountSecurityError } from '../src/services/accountSecurityService.ts'

type Api = Parameters<typeof createAccountSecurityService>[0]
function fixture(id = 'a', error: unknown = null) {
  const calls: unknown[] = []
  const auth = {
    getUser: async () => ({ data: { user: { id, email: 'person@example.com', email_confirmed_at: 'date' } }, error: null }),
    signInWithPassword: async (payload: unknown) => { calls.push(payload); return { data: { user: { id }, session: {} }, error: null } },
    updateUser: async (payload: unknown) => { calls.push(payload); return { data: { user: { id } }, error } },
  } as unknown as Api
  return { calls, service: createAccountSecurityService(auth) }
}
test('sends current password with the new one without trimming credentials', async () => {
  const { service, calls } = fixture()
  await service.changePassword('a', ' current password ', ' new password ')
  assert.deepEqual(calls, [{ email: 'person@example.com', password: ' current password ' }, { password: ' new password ', current_password: ' current password ' }])
})
test('rejects a changed account and invalid fields before modifying credentials', async () => {
  const { service, calls } = fixture('b')
  await assert.rejects(service.changePassword('a', 'old', 'new password'))
  await assert.rejects(service.changePassword('b', '', 'new password'))
  await assert.rejects(service.changePassword('b', 'old', 'short'))
  assert.deepEqual(calls, [])
})
test('requires a verified current session and successful update', async () => {
  const error = { code: 'current_password_invalid' }
  await assert.rejects(fixture('a', error).service.changePassword('a', 'wrong', 'new password'), value => value === error)
  const api = { getUser: async () => ({ data: { user: null }, error: new Error('offline') }), updateUser: async () => { throw new Error('must not update') } } as unknown as Api
  await assert.rejects(createAccountSecurityService(api).changePassword('a', 'old', 'new password'), /offline/)
  assert.match(accountSecurityError(error), /actual no es correcta/)
  assert.match(accountSecurityError({ code: 'same_password' }), /diferente/)
  assert.doesNotMatch(accountSecurityError(new Error('provider secret')), /provider secret/)
})

test('a wrong current password never updates account credentials', async () => {
  let updated = false
  const error = { code: 'invalid_credentials' }
  const api = {
    getUser: async () => ({ data: { user: { id: 'a', email: 'person@example.com', email_confirmed_at: 'date' } }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error }),
    updateUser: async () => { updated = true; return {} },
  } as unknown as Api
  await assert.rejects(createAccountSecurityService(api).changePassword('a', 'wrong', 'new password'), value => value === error)
  assert.equal(updated, false)
})
