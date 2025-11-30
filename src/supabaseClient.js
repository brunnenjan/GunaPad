import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://fulshptohzpuakqlzshb.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1bHNocHRvaHpwdWFrcWx6c2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjMwMDQsImV4cCI6MjA3OTc5OTAwNH0.DoiwJtr_My5N-VFadVN4O16K7-d-6oj9zo-SLVzdygw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);