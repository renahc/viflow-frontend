type SupabaseEnvironment = { VITE_SUPABASE_URL?: string; VITE_SUPABASE_PUBLISHABLE_KEY?: string }
export function readSupabaseConfig(environment: SupabaseEnvironment): { url: string; publishableKey: string } {
  const url = environment.VITE_SUPABASE_URL?.trim()
  const publishableKey = environment.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
  if (!url || !publishableKey) throw new Error('Configura VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local.')
  let parsed: URL
  try { parsed = new URL(url) } catch { throw new Error('VITE_SUPABASE_URL debe ser una URL válida de Supabase.') }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('VITE_SUPABASE_URL debe ser el origen HTTPS del proyecto de Supabase.')
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error('Usa la clave publishable de Supabase para el frontend.')
  }
  return { url: parsed.origin, publishableKey }
}
