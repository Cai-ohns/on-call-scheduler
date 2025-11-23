import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

let client

try {
  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('Invalid Supabase URL')
  }
  client = createClient(supabaseUrl, supabaseAnonKey)
} catch (error) {
  console.error('Supabase initialization failed:', error)
  // Fallback mock client to prevent app crash
  client = {
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
      insert: () => Promise.resolve({ data: [], error: null }),
      update: () => Promise.resolve({ data: [], error: null }),
      delete: () => Promise.resolve({ data: [], error: null }),
    })
  }
}

export const supabase = client
