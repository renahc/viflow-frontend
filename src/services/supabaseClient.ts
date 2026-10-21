import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readSupabaseConfig } from './supabaseConfig'

let client: SupabaseClient | undefined

// Initialize only when account features request it, so guest mode needs no setup.
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    const { url, publishableKey } = readSupabaseConfig(import.meta.env)
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The planned OTP flow verifies codes explicitly, without URL grants.
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
    })
  }
  return client
}
