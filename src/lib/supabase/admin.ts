import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseConfig } from "@/lib/env";
import { supabaseServiceRoleKey } from "@/lib/env.server";
import type { Database } from "./database.types";

/**
 * Service role: bypassa RLS. Use só onde não há sessão de usuário
 * (webhooks, scripts de ingestão, jobs). Nunca a partir de código de cliente.
 */
export function createAdminSupabase() {
  const { url } = requireSupabaseConfig();
  return createClient<Database>(url, supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
