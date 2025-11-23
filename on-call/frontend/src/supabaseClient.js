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
  console.log('VITE_SUPABASE_URL:', supabaseUrl) // Debug log

  // Fallback mock client to prevent app crash
  const mockBuilder = {
    select: () => mockBuilder,
    insert: () => mockBuilder,
    update: () => mockBuilder,
    delete: () => mockBuilder,
    eq: () => mockBuilder,
    order: () => Promise.resolve({ data: [], error: { message: 'Supabase not connected. Check environment variables.' } }),
    then: (resolve) => Promise.resolve({ data: [], error: { message: 'Supabase not connected.' } }).then(resolve)
  }

  client = {
    from: () => mockBuilder
  }
}

export const supabase = client
