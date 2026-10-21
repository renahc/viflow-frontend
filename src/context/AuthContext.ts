import { createContext } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
export type AuthState = { client: SupabaseClient | null; session: Session | null; loading: boolean; configurationError: boolean; sessionError: boolean }
export const AuthContext = createContext<AuthState | undefined>(undefined)
