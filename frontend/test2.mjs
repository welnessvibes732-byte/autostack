import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries(envFile.split('\n').map(line => line.split('=')));
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL.trim(), env.NEXT_PUBLIC_SUPABASE_ANON_KEY.trim());

async function run() {
  const start = Date.now();
  console.log("Fetching properties...");
  const { data, error } = await supabase.from('properties').select('*');
  console.log(`Took ${Date.now() - start}ms`);
  if (error) {
    console.error("Supabase error:", JSON.stringify(error, null, 2));
  } else {
    console.log("Success:", data.length);
  }
}
run();
