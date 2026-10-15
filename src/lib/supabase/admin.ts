import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only client with the secret key. It bypasses Row Level Security, so it must
// only run inside route handlers / server code and never reach the browser.

let admin: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new Error("Supabase admin is not configured (SUPABASE_SECRET_KEY).");
  if (!admin) admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
