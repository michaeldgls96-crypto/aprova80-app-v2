import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gmizpurcpsuwkwxbczip.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaXpwdXJjcHN1d2t3eGJjemlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0NTM5MDYsImV4cCI6MjEwMjAyOTkwNn0.Xa9OcJCxni5lk8eD2WuRgy1P74U1hkR-gQSmYZYwwi4'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});