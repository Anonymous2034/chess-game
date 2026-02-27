// Supabase configuration — lazy-loaded to avoid blocking app startup

const SUPABASE_URL = 'https://nazutkzaudvnypmdqkqo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5henV0a3phdWR2bnlwbWRxa3FvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2OTc2NzMsImV4cCI6MjA4NzI3MzY3M30.vtP8FP55swSDzOPiCMcIn0F7Pc7I4gdpnx4jXSGiBkg';

let supabase = null;

export async function initSupabase() {
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return true;
  } catch (err) {
    console.warn('Supabase init failed:', err.message);
    return false;
  }
}

export function getSupabase() {
  return supabase;
}

export function isSupabaseConfigured() {
  return !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');
}
