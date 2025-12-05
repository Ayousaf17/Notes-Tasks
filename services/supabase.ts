
import { createClient } from '@supabase/supabase-js';

// Helper to get local storage safely
const getLocal = (key: string) => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
    }
    return null;
};

// SAFE ENVIRONMENT ACCESS
const getEnv = (key: string) => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore error
  }
  return undefined;
};

// PRIORITY: Local Storage (User Settings) -> Env Vars -> Fallback Demo
// NOTE: To connect your own database, go to Settings -> Data in the app and paste your credentials.
const SUPABASE_URL = getLocal('aasani_supabase_url') || getEnv('SUPABASE_URL') || 'https://jpfzafujsswrdwuenijt.supabase.co';
const SUPABASE_ANON_KEY = getLocal('aasani_supabase_key') || getEnv('SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnphZnVqc3N3cmR3dWVuaWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQ0NDYsImV4cCI6MjA3OTU5MDQ0Nn0.O9qm79PrwTFsdY-a2xEy-BDqZeQRyUb4uIoSnLUEXtc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * DATABASE SETUP INSTRUCTIONS
 * 
 * 1. Go to Supabase Dashboard -> SQL Editor
 * 2. Run the following SQL commands to create the schema:
 * 
 * -- 1. PROJECTS
 * create table if not exists projects (
 *   id text primary key,
 *   title text not null,
 *   icon text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 2. TASKS
 * create table if not exists tasks (
 *   id text primary key,
 *   project_id text references projects(id) on delete cascade,
 *   title text not null,
 *   description text,
 *   status text default 'To Do',
 *   priority text default 'Medium',
 *   assignee text,
 *   due_date timestamp with time zone,
 *   reminder_time timestamp with time zone,
 *   dependencies text[],
 *   linked_document_id text,
 *   agent_status text,
 *   agent_result jsonb,
 *   external_type text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 3. DOCUMENTS
 * create table if not exists documents (
 *   id text primary key,
 *   project_id text references projects(id) on delete cascade,
 *   title text not null,
 *   content text,
 *   tags text[],
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 4. CLIENTS
 * create table if not exists clients (
 *   id text primary key,
 *   name text not null,
 *   company text,
 *   email text,
 *   status text default 'Lead',
 *   value numeric default 0,
 *   last_contact timestamp with time zone,
 *   tags text[],
 *   activities jsonb,
 *   google_drive_folder text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 5. ENABLE REALTIME
 * alter publication supabase_realtime add table projects, tasks, documents, clients;
 */
