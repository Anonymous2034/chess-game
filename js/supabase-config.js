// Supabase configuration — replace with your project's URL and anon key
//
// Setup instructions:
// 1. Go to https://supabase.com → New Project
// 2. In your project dashboard, go to Settings → API
// 3. Copy the "Project URL" and "anon / public" key below
// 4. Go to SQL Editor and run the schema from sql/schema.sql
// 5. Go to Authentication → Settings → enable Email provider

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

let supabase = null;

export function initSupabase() {
  try {
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
