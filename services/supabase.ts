
import { createClient } from '@supabase/supabase-js';

// Live Supabase Connection
// Prioritize Environment Variables for security, fall back to provided keys for prototype demo
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://jpfzafujsswrdwuenijt.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnphZnVqc3N3cmR3dWVuaWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQ0NDYsImV4cCI6MjA3OTU5MDQ0Nn0.O9qm79PrwTFsdY-a2xEy-BDqZeQRyUb4uIoSnLUEXtc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * DATABASE SETUP INSTRUCTIONS
 * 
 * 1. Go to Supabase Dashboard -> SQL Editor
 * 2. Run the Table Creation scripts (Projects, Tasks, Documents).
 * 
 * 3. ENABLE REALTIME:
 *    Run: alter publication supabase_realtime add table projects, tasks, documents;
 * 
 * 4. ROW LEVEL SECURITY (RLS) - ESSENTIAL FOR PRODUCTION:
 *    -- Enable RLS
 *    alter table projects enable row level security;
 *    alter table tasks enable row level security;
 *    alter table documents enable row level security;
 *    
 *    -- Create generic policies (Adjust for auth.uid() in real multi-user app)
 *    create policy "Enable read access for all users" on projects for select using (true);
 *    create policy "Enable insert access for all users" on projects for insert with check (true);
 *    create policy "Enable update access for all users" on projects for update using (true);
 *    create policy "Enable delete access for all users" on projects for delete using (true);
 *    
 *    -- Repeat policies for tasks and documents
 */
