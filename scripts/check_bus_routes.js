import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://awhyddumfhfxqkaebczk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3aHlkZHVtZmhmeHFrYWViY3prIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODIxMTYsImV4cCI6MjEwMDk1ODExNn0.DvL7DqNyaybOcul9n_YOlbfIEFq5aWrq401vKNPd6A0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkCurrentBuses() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@gestorops.com',
    password: 'Admin1234!'
  });

  if (authError) {
    console.error('Auth error:', authError.message);
    return;
  }
  console.log('Logged in as:', authData.user.email);

  const { data, error, count } = await supabase.from('bus_routes').select('*', { count: 'exact' });
  if (error) {
    console.error('Error fetching bus_routes:', error);
    return;
  }

  console.log(`Current count of bus_routes: ${data.length}`);
  console.log('Sample routes in DB:', JSON.stringify(data.slice(0, 5), null, 2));
}

checkCurrentBuses();
