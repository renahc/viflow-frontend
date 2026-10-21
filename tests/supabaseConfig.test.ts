import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readSupabaseConfig } from '../src/services/supabaseConfig.ts'

const valid = { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example' }
test('accepts public configuration and normalizes whitespace and the origin', () => {
  assert.deepEqual(readSupabaseConfig({ ...valid, VITE_SUPABASE_URL: ` ${valid.VITE_SUPABASE_URL}/ ` }), { url: valid.VITE_SUPABASE_URL, publishableKey: valid.VITE_SUPABASE_PUBLISHABLE_KEY })
})
test('rejects missing variables, secret keys and malformed project origins', () => {
  assert.throws(() => readSupabaseConfig({}))
  for (const key of ['sb_secret_example', 'service_role', 'invalid']) assert.throws(() => readSupabaseConfig({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: key }))
  for (const url of ['invalid', 'http://example.supabase.co', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com?key=test', 'https://example.com/#token']) {
    assert.throws(() => readSupabaseConfig({ ...valid, VITE_SUPABASE_URL: url }))
  }
})
