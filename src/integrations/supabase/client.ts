// Cliente de Supabase. Lee la URL y la clave pública desde variables de
// entorno (VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY, ver
// docs/DEPLOY.md). Si no están configuradas, usa los valores del proyecto
// administrado por Enter como respaldo, para que producción no se rompa
// mientras se termina la migración a un proyecto de Supabase propio.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const FALLBACK_SUPABASE_URL = "https://spb-t4nvy77a53g97ctj.supabase.opentrust.net";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiIsInJlZiI6InNwYi10NG52eTc3YTUzZzk3Y3RqIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3OTAzNDg3MzUsImV4cCI6MjEwNTkyNDczNX0.gLTHURgV8DlgqFxrv5G2b2qZsjmN6ecdIf8z4PQ_2aY";

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
