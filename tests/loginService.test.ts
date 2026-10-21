import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createLoginService, isUnconfirmedEmail, loginError } from '../src/services/loginService.ts'

type Api = Parameters<typeof createLoginService>[0]
function fixture(result: unknown) {
  const calls: unknown[] = []
  const auth = { signInWithPassword: async (payload: unknown) => { calls.push(payload); return result } } as unknown as Api
  return { calls, service: createLoginService(auth) }
}
test('logs in with the supplied credentials, trimming email but preserving password exactly', async () => {
  const { calls, service } = fixture({ data: { session: { access_token: 'example' }, user: { email_confirmed_at: '2026-10-21T12:00:00Z' } }, error: null })
  await service.login(' person@domain.com ', ' Exact password9! ')
  assert.deepEqual(calls, [{ email: 'person@domain.com', password: ' Exact password9! ' }])
})
test('does not report success for malformed responses or unconfirmed users', async () => {
  for (const data of [{ session: null, user: { email_confirmed_at: 'date' } }, { session: {}, user: {} }]) {
    await assert.rejects(fixture({ data, error: null }).service.login('person@domain.com', 'password'))
  }
})
test('propagates login failures and keeps credential error messages generic', async () => {
  const error = { code: 'invalid_credentials', message: 'Internal details' }
  await assert.rejects(fixture({ data: { session: null, user: null }, error }).service.login('person@domain.com', 'password'), value => value === error)
  assert.equal(loginError(error), loginError({ code: 'user_not_found' }))
  assert.match(loginError(error), /correo o la contraseña/)
  assert.doesNotMatch(loginError(error), /Internal/)
})
test('offers verification only for an explicit unconfirmed-email response and handles network/rate limits', () => {
  assert.equal(isUnconfirmedEmail({ code: 'email_not_confirmed' }), true)
  assert.equal(isUnconfirmedEmail({ code: 'invalid_credentials' }), false)
  assert.equal(isUnconfirmedEmail(null), false)
  assert.match(loginError({ code: 'email_not_confirmed' }), /verificado/)
  assert.match(loginError({ status: 429 }), /límite/)
  assert.match(loginError(new TypeError('Failed to fetch')), /conexión/)
})
