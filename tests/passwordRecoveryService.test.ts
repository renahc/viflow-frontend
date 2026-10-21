import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createPasswordRecoveryService, passwordRecoveryError } from '../src/services/passwordRecoveryService.ts'

type Api = Parameters<typeof createPasswordRecoveryService>[0]
const user = { id: 'person', email: 'person@domain.com', email_confirmed_at: '2026-10-21T12:00:00Z' }
function fixture() {
  const calls: { method: string; payload?: unknown }[] = []
  const responses: Record<string, unknown> = {
    resetPasswordForEmail: { error: null },
    verifyOtp: { data: { session: { access_token: 'example' }, user }, error: null },
    getUser: { data: { user }, error: null },
    updateUser: { data: { user }, error: null },
  }
  const api = Object.fromEntries(Object.keys(responses).map(method => [method, async (payload?: unknown) => { calls.push({ method, payload }); return responses[method] }])) as unknown as Api
  return { service: createPasswordRecoveryService(api), calls, responses }
}
test('requests recovery without a password and verifies with the recovery OTP type', async () => {
  const { service, calls } = fixture()
  await service.request(' person@domain.com ')
  await service.verify(' person@domain.com ', '485932')
  assert.deepEqual(calls, [{ method: 'resetPasswordForEmail', payload: 'person@domain.com' }, { method: 'verifyOtp', payload: { email: 'person@domain.com', token: '485932', type: 'recovery' } }])
})
test('requires recovery verification even with an existing account session', async () => {
  const { service, calls } = fixture()
  await assert.rejects(service.updatePassword('NewPassword9!'), { name: 'RecoverySessionError' })
  assert.deepEqual(calls, [])
})
test('updates only after OTP and server user validation, then consumes the in-memory grant', async () => {
  const { service, calls } = fixture()
  await service.verify('person@domain.com', '485932')
  await service.updatePassword(' NewPassword9! ')
  assert.deepEqual(calls.slice(1), [{ method: 'getUser', payload: undefined }, { method: 'updateUser', payload: { password: ' NewPassword9! ' } }])
  await assert.rejects(service.updatePassword('AnotherPassword9!'), { name: 'RecoverySessionError' })
})
test('rejects failed OTP, mismatched identities and malformed verification responses', async () => {
  for (const result of [
    { data: { session: null, user }, error: null },
    { data: { session: {}, user: { ...user, email: 'other@domain.com' } }, error: null },
    { data: { session: {}, user: { ...user, email_confirmed_at: null } }, error: null },
    { data: { session: null, user: null }, error: { code: 'otp_expired' } },
  ]) {
    const { service, responses, calls } = fixture()
    responses.verifyOtp = result
    await assert.rejects(service.verify('person@domain.com', '123456'))
    await assert.rejects(service.updatePassword('NewPassword9!'))
    assert.equal(calls.some(call => call.method === 'updateUser'), false)
  }
})
test('does not update another user after a session change or a failed session check', async () => {
  for (const result of [{ data: { user: { ...user, id: 'other' } }, error: null }, { data: { user: null }, error: { code: 'session_not_found' } }]) {
    const { service, responses, calls } = fixture()
    await service.verify('person@domain.com', '485932')
    responses.getUser = result
    await assert.rejects(service.updatePassword('NewPassword9!'), { name: 'RecoverySessionError' })
    assert.equal(calls.some(call => call.method === 'updateUser'), false)
  }
})
test('new requests and explicit revocation invalidate previous verification', async () => {
  const { service } = fixture()
  await service.verify('person@domain.com', '485932')
  await service.request('person@domain.com')
  await assert.rejects(service.updatePassword('NewPassword9!'))
  await service.verify('person@domain.com', '485932')
  service.revoke()
  await assert.rejects(service.updatePassword('NewPassword9!'))
})
test('preserves verification for password-policy retry, and never reports failed updates as success', async () => {
  const { service, responses } = fixture()
  await service.verify('person@domain.com', '485932')
  responses.updateUser = { data: { user: null }, error: { code: 'weak_password' } }
  await assert.rejects(service.updatePassword('weak'), value => typeof value === 'object' && value !== null && 'code' in value && value.code === 'weak_password')
  responses.updateUser = { data: { user }, error: null }
  await service.updatePassword('NewPassword9!')
  assert.match(passwordRecoveryError({ code: 'same_password' }), /diferente/)
  assert.match(passwordRecoveryError({ code: 'session_expired' }), /otro código/)
})
