
import { createClient } from '@supabase/supabase-js';

// Live Supabase Connection
const SUPABASE_URL = 'https://jpfzafujsswrdwuenijt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpwZnphZnVqc3N3cmR3dWVuaWp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTQ0NDYsImV4cCI6MjA3OTU5MDQ0Nn0.O9qm79PrwTFsdY-a2xEy-BDqZeQRyUb4uIoSnLUEXtc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * DATABASE SETUP INSTRUCTIONS
 * 
 * To make the app work, go to your Supabase Dashboard -> SQL Editor 
 * and run this script to create the required tables:
 * 
 * -- 1. Projects Table
 * create table projects (
 *   id uuid default gen_random_uuid() primary key,
 *   title text not null,
 *   icon text,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 2. Tasks Table
 * create table tasks (
 *   id uuid default gen_random_uuid() primary key,
 *   project_id uuid references projects(id) on delete cascade,
 *   title text not null,
 *   description text,
 *   status text default 'To Do',
 *   priority text default 'Medium',
 *   assignee text,
 *   due_date timestamp with time zone,
 *   created_at timestamp with time zone default timezone('utc'::text, now()) not null,
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 3. Documents Table
 * create table documents (
 *   id uuid default gen_random_uuid() primary key,
 *   project_id uuid references projects(id) on delete cascade,
 *   title text not null,
 *   content text,
 *   tags text[],
 *   updated_at timestamp with time zone default timezone('utc'::text, now()) not null
 * );
 * 
 * -- 4. Enable Realtime (Optional but recommended)
 * alter publication supabase_realtime add table projects, tasks, documents;
 */
