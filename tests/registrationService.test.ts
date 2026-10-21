import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createRegistrationService, registrationError } from '../src/services/registrationService.ts'
import { parsePendingRegistration } from '../src/lib/pendingRegistration.ts'

type Api = Parameters<typeof createRegistrationService>[0]
function fixture(result: unknown) {
  const calls: { method: string; payload: unknown }[] = []
  const auth = Object.fromEntries(['signUp', 'verifyOtp', 'resend'].map(method => [method, async (payload: unknown) => { calls.push({ method, payload }); return result }])) as unknown as Api
  return { service: createRegistrationService(auth), calls }
}
test('registers with the supplied password without treating an unverified user as a session', async () => {
  const { service, calls } = fixture({ data: { session: null, user: { id: 'id', identities: [] } }, error: null })
  assert.deepEqual(await service.register(' person@domain.com ', ' ExamplePassword9! ', ' Rena '), { confirmed: false })
  assert.deepEqual(calls, [{ method: 'signUp', payload: { email: 'person@domain.com', password: ' ExamplePassword9! ', options: { data: { display_name: 'Rena' } } } }])
})
test('verifies the actual supplied code and requires a confirmed user plus session', async () => {
  const { service, calls } = fixture({ data: { session: { access_token: 'example' }, user: { email_confirmed_at: '2026-10-21T12:00:00Z' } }, error: null })
  await service.verify(' person@domain.com ', '483921')
  assert.deepEqual(calls, [{ method: 'verifyOtp', payload: { email: 'person@domain.com', token: '483921', type: 'email' } }])
  for (const data of [{ session: null, user: { email_confirmed_at: 'date' } }, { session: {}, user: {} }]) {
    await assert.rejects(fixture({ data, error: null }).service.verify('person@domain.com', '123456'))
  }
})
test('resends the signup confirmation without sending a password or creating another account', async () => {
  const { service, calls } = fixture({ error: null })
  await service.resend(' person@domain.com ')
  assert.deepEqual(calls, [{ method: 'resend', payload: { type: 'signup', email: 'person@domain.com' } }])
})
test('propagates service errors; no hard-coded demonstration code can bypass an error', async () => {
  const error = { code: 'otp_expired', message: 'Provider detail that should not be displayed' }
  const { service } = fixture({ data: { session: null, user: null }, error })
  await assert.rejects(service.verify('person@domain.com', '123456'), value => value === error)
  await assert.rejects(service.register('person@domain.com', 'ExamplePassword9!', 'Rena'), value => value === error)
  await assert.rejects(service.resend('person@domain.com'), value => value === error)
  assert.match(registrationError(error), /no es válido o venció/)
  assert.match(registrationError({ status: 429 }), /límite/)
  assert.match(registrationError({ code: 'weak_password' }), /contraseña/)
  assert.doesNotMatch(registrationError(new Error('secret provider message')), /secret provider/)
})
test('resumes only email and bounded resend time; credentials are never restored', () => {
  const now = 1000
  assert.deepEqual(parsePendingRegistration(JSON.stringify({ email: 'person@domain.com', resendAt: now + 120000, password: 'ignored', code: 'ignored' }), now), { email: 'person@domain.com', resendAt: now + 60000 })
  for (const value of [null, '{', '{}', '{"email":"invalid"}']) assert.equal(parsePendingRegistration(value, now), null)
  assert.deepEqual(parsePendingRegistration('{"email":"person@domain.com","resendAt":0}', now), { email: 'person@domain.com', resendAt: 0 })
})

test('rejects invalid display names before submitting signup', async () => {
  const { service, calls } = fixture({})
  for (const name of ['   ', 'x'.repeat(61)]) await assert.rejects(service.register('person@domain.com', 'ExamplePassword9!', name))
  assert.deepEqual(calls, [])
})
