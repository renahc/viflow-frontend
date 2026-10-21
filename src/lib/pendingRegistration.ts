export const pendingRegistrationKey = 'viflow.auth.registration.v1'
export type PendingRegistration = { email: string; resendAt: number }
export function parsePendingRegistration(value: string | null, now = Date.now()): PendingRegistration | null {
  try {
    const parsed: unknown = JSON.parse(value ?? 'null')
    if (!parsed || typeof parsed !== 'object') return null
    const data = parsed as Record<string, unknown>
    if (typeof data.email !== 'string' || data.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return null
    const resendAt = typeof data.resendAt === 'number' && Number.isFinite(data.resendAt) ? Math.min(Math.max(data.resendAt, 0), now + 60_000) : 0
    return { email: data.email, resendAt }
  } catch { return null }
}
