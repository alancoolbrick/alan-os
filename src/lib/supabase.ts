import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://etpadjoejybmgezkfhdz.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV0cGFkam9lanlibWdlemtmaGR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzgwNjksImV4cCI6MjA4OTAxNDA2OX0.BzzV8e6Nu2G5RdwdV55ziDsU1Pv7bbS560rZ0Oy1ArI';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
