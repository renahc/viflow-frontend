import assert from 'node:assert/strict'
import { test } from 'node:test'
import { accountAvatarPath, avatarBucket, createAccountAvatarService, validateAvatar } from '../src/services/accountAvatarService.ts'

type Client = Parameters<typeof createAccountAvatarService>[0]
const oldPath = 'user-a/12345678-abcd.png'
const photo = new File([new Uint8Array([137, 80, 78, 71])], 'personal-name.png', { type: 'image/png' })
function fixture(options: { uploadError?: unknown; updateError?: unknown; removeError?: unknown; switched?: boolean; userId?: string } = {}) {
  const calls: { method: string; value: unknown }[] = []
  const user = { id: options.userId ?? 'user-a', email_confirmed_at: 'date', user_metadata: { avatar_path: oldPath, display_name: 'Rena' } }
  let reads = 0
  const client = {
    auth: {
      getUser: async () => { reads++; return { data: { user: options.switched && reads > 1 ? { ...user, id: 'user-b' } : user }, error: null } },
      updateUser: async (value: unknown) => { calls.push({ method: 'update', value }); return { data: { user }, error: options.updateError ?? null } },
    },
    storage: { from: (bucket: string) => {
      assert.equal(bucket, avatarBucket)
      return {
        upload: async (path: string, file: File, settings: unknown) => { calls.push({ method: 'upload', value: { path, file, settings } }); return { error: options.uploadError ?? null } },
        remove: async (paths: string[]) => { calls.push({ method: 'remove', value: paths }); return { error: options.removeError ?? null } },
        download: async (path: string) => { calls.push({ method: 'download', value: path }); return { data: photo, error: null } },
      }
    } },
  } as unknown as Client
  return { calls, service: createAccountAvatarService(client) }
}

test('accepts supported images up to 1 MB and rejects empty, oversized or unsupported files', () => {
  validateAvatar(photo)
  for (const type of ['image/png', 'image/jpeg', 'image/webp']) validateAvatar({ type, size: 1048576 })
  for (const file of [{ type: 'image/svg+xml', size: 4 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 1048577 }]) assert.throws(() => validateAvatar(file))
})

test('only resolves avatar paths belonging to the account, never arbitrary URLs or traversal', () => {
  assert.equal(accountAvatarPath('user-a', { avatar_path: oldPath }), oldPath)
  for (const path of ['user-b/123.png', 'https://example.com/avatar.png', 'user-a/../123.png', 'user-a/123.svg', 'user-a/folder/123.png']) {
    assert.equal(accountAvatarPath('user-a', { avatar_path: path }), '')
  }
})

test('uploads with a unique account path, saves metadata, then cleans up the previous photo', async () => {
  const { service, calls } = fixture()
  assert.deepEqual(await service.save('user-a', ' Rena ', photo), { cleanupPending: false })
  assert.deepEqual(calls.map(call => call.method), ['upload', 'update', 'remove'])
  const upload = calls[0].value as { path: string; file: File; settings: unknown }
  assert.match(upload.path, /^user-a\/[a-f0-9-]+\.png$/)
  assert.doesNotMatch(upload.path, /personal-name/)
  assert.equal(upload.file, photo)
  assert.deepEqual(upload.settings, { contentType: 'image/png', upsert: false })
  assert.deepEqual(calls[1].value, { data: { display_name: 'Rena', avatar_path: upload.path } })
  assert.deepEqual(calls[2].value, [oldPath])
})

test('removing a photo clears metadata before deleting; name-only edits preserve the photo', async () => {
  const removal = fixture()
  await removal.service.save('user-a', 'Rena', null)
  assert.deepEqual(removal.calls, [{ method: 'update', value: { data: { display_name: 'Rena', avatar_path: null } } }, { method: 'remove', value: [oldPath] }])
  const nameOnly = fixture()
  await nameOnly.service.save('user-a', 'Nuevo nombre', undefined)
  assert.deepEqual(nameOnly.calls, [{ method: 'update', value: { data: { display_name: 'Nuevo nombre' } } }])
})

test('failed uploads never update metadata and failed metadata saves only clean up the new file', async () => {
  const upload = fixture({ uploadError: new Error('upload') })
  await assert.rejects(upload.service.save('user-a', 'Rena', photo))
  assert.deepEqual(upload.calls.map(call => call.method), ['upload'])
  const update = fixture({ updateError: new Error('metadata') })
  await assert.rejects(update.service.save('user-a', 'Rena', photo))
  assert.deepEqual(update.calls.map(call => call.method), ['upload', 'update', 'remove'])
  assert.notDeepEqual(update.calls[2].value, [oldPath])
})

test('detects session changes before modifying profile metadata', async () => {
  const mismatch = fixture({ userId: 'user-b' })
  await assert.rejects(mismatch.service.save('user-a', 'Rena', photo))
  assert.deepEqual(mismatch.calls, [])
  const switched = fixture({ switched: true })
  await assert.rejects(switched.service.save('user-a', 'Rena', photo))
  assert.deepEqual(switched.calls.map(call => call.method), ['upload', 'remove'])
})

test('reports cleanup failure after a successful save without pretending the save failed', async () => {
  const { service } = fixture({ removeError: new Error('offline') })
  assert.deepEqual(await service.save('user-a', 'Rena', null), { cleanupPending: true })
})

test('private download rejects another account path before any storage request', async () => {
  const { service, calls } = fixture()
  await assert.rejects(service.load('user-b', oldPath))
  assert.deepEqual(calls, [])
  assert.equal(await service.load('user-a', oldPath), photo)
})
