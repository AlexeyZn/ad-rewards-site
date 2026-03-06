// Supabase configuration
const SUPABASE_URL = 'https://ngrodfzmeqmepofxpjhu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncm9kZnptZXFtZXBvZnhwamh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTc4NjYsImV4cCI6MjA4NzM3Mzg2Nn0.NcIhrBJKz34xYDxjM379Pmyb0dpvzhFiFz5zt-iEs0k';

// Initialize the Supabase client
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
