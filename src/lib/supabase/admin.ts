import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { supabaseServiceRoleKey } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Service role: bypassa RLS. Use só onde não há sessão de usuário
 * (scripts de ingestão, jobs). Nunca a partir de código de cliente.
 */
export function createAdminSupabase() {
  return createClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    supabaseServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
