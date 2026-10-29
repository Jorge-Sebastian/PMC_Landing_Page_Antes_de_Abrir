import { createClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import type { FamilySnapshot } from './model';

// Supabase MUST trust Clerk as a Third-Party Auth provider. The user-supplied
// token is verified by Supabase before PostgreSQL sees any family operation.
export function makeFamilyApi(getToken: () => Promise<string | null>) {
  const client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    accessToken: getToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const operation = async (p_action: string, p_payload: Record<string, unknown> = {}): Promise<unknown> => {
    const { data, error } = await client.rpc('smartguard_family', { p_action, p_payload });
    if (error) {
      if (error.code === 'PGRST202' || error.code === '42883') {
        throw new Error('SmartGuard Family todavía no está activado en el backend.');
      }
      if (error.code === '42501' || error.code === '28000') {
        throw new Error('Tu sesión no tiene autorización para esta familia.');
      }
      throw new Error(error.message || 'No se pudo completar la operación.');
    }
    return data;
  };
  return {
    operation,
    snapshot: async () => (await operation('snapshot')) as FamilySnapshot,
  };
}

export type FamilyApi = ReturnType<typeof makeFamilyApi>;
