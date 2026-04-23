import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type SupabaseAdminClient = SupabaseClient<Database>;

let cachedAdminClient: SupabaseAdminClient | null = null;

export function getSupabaseAdmin(): SupabaseAdminClient {
  if (cachedAdminClient) return cachedAdminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Supabase 어드민 환경변수가 설정되지 않았어 (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_SECRET_KEY)"
    );
  }

  cachedAdminClient = createClient<Database>(url, secretKey, {
    auth: { persistSession: false },
  });

  return cachedAdminClient;
}

// supabase gen types 가 만든 Database 타입에서 직접 파생
export type ArtistRow = Database["public"]["Tables"]["artists"]["Row"];
export type ArtistInsert = Database["public"]["Tables"]["artists"]["Insert"];
export type ArtistUpdate = Database["public"]["Tables"]["artists"]["Update"];

export type UserRow = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];

export type ClosedDateRow =
  Database["public"]["Tables"]["closed_dates"]["Row"];

export type VideoPortfolioItemRow =
  Database["public"]["Tables"]["video_portfolio_items"]["Row"];
