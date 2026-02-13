
// Configuração do Supabase
const SUPABASE_URL = 'https://eoxqfpncfeyochdlavgt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVveHFmcG5jZmV5b2NoZGxhdmd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MTQ5OTMsImV4cCI6MjA4NjQ5MDk5M30.ftkjzzxW8IGQwOjGEKtGDXnLLeGuDOCeYQSzgKO_z3I';

// Inicializa o cliente globalmente
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
console.log('✅ Supabase Client Initialized');
