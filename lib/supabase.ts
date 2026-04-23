import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
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

  cachedAdminClient = createClient(url, secretKey, {
    auth: { persistSession: false },
  });

  return cachedAdminClient;
}

export type ArtistRow = {
  id: string;
  artist_id: string | null;
  user_id: string | null;
  kakao_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  service: string[] | null;
  region: string[] | null;
  price: string | null;
  artist_type: string | null;
  portfolio: string | null;
  image: string | null;
  portfolio_images: string[] | null;
  rating: number | null;
  style_keywords: string[] | null;
  open_chat_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserRow = {
  id: string;
  kakao_id: string | null;
  email: string | null;
  name: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ClosedDateRow = {
  id: string;
  artist_id: string;
  closed_date: string;
};

export type VideoPortfolioItemRow = {
  artist_id: string;
  position: number;
  link: string;
  thumb: string | null;
  style_tags: string[] | null;
  created_at?: string;
  updated_at?: string;
};
