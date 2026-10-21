import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountDisplayName, createAccountProfileService, validateDisplayName } from '../src/services/accountProfileService.ts'

test('display names support accents, spaces and existing accounts without a name', () => {
  assert.equal(validateDisplayName('  René Herrera  '), 'René Herrera')
  for (const value of ['', '   ', 'x'.repeat(61)]) assert.throws(() => validateDisplayName(value))
  for (const metadata of [undefined, {}, { display_name: 4 }, { display_name: '  ' }]) assert.equal(accountDisplayName(metadata), '')
  assert.equal(accountDisplayName({ display_name: ' Rena ' }), 'Rena')
})
test('updates only the account display name and validates before calling Supabase', async () => {
  const calls: unknown[] = []
  const service = createAccountProfileService({ updateUser: async payload => {
    calls.push(payload)
    return { data: { user: { user_metadata: { display_name: 'Rena' } } }, error: null }
  } } as unknown as Parameters<typeof createAccountProfileService>[0])
  assert.equal(await service.saveName(' Rena '), 'Rena')
  await assert.rejects(service.saveName('   '))
  assert.deepEqual(calls, [{ data: { display_name: 'Rena' } }])
})
test('failed profile updates do not report success', async () => {
  const error = { code: 'session_not_found' }
  const service = createAccountProfileService({ updateUser: async () => ({ data: { user: null }, error }) } as unknown as Parameters<typeof createAccountProfileService>[0])
  await assert.rejects(service.saveName('Rena'), value => value === error)
})
