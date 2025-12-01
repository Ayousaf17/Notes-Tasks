
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
 * 2. Run the following SQL commands to create the schema:
 * 
 * -- 1. PROJECTS Table
 * create table projects (
 *   id text primary key,
 *   title text not null,
 *   icon text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 2. TASKS Table
 * create table tasks (
 *   id text primary key,
 *   project_id text references projects(id) on delete cascade,
 *   title text not null,
 *   description text,
 *   status text default 'To Do',
 *   priority text default 'Medium',
 *   assignee text,
 *   due_date timestamp with time zone,
 *   reminder_time timestamp with time zone, -- NEW COLUMN
 *   dependencies text[],
 *   linked_document_id text,
 *   agent_status text,
 *   agent_result jsonb,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 3. DOCUMENTS Table
 * create table documents (
 *   id text primary key,
 *   project_id text references projects(id) on delete cascade,
 *   title text not null,
 *   content text,
 *   tags text[],
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 4. ENABLE REALTIME
 * alter publication supabase_realtime add table projects, tasks, documents;
 * 
 * -- 5. ROW LEVEL SECURITY (RLS) - OPTIONAL FOR DEMO, ESSENTIAL FOR PROD
 * alter table projects enable row level security;
 * alter table tasks enable row level security;
 * alter table documents enable row level security;
 * 
 * create policy "Public Access" on projects for select using (true);
 * create policy "Public Insert" on projects for insert with check (true);
 * create policy "Public Update" on projects for update using (true);
 * create policy "Public Delete" on projects for delete using (true);
 * -- (Repeat similar policies for tasks and documents for open access in prototype)
 */