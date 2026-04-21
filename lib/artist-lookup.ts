import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";

const ID_SAFE = /^[a-zA-Z0-9_-]+$/;
const RECORD_ID = /^rec[a-zA-Z0-9]+$/;
const ARTIST_CODE = /^artist_[a-zA-Z0-9_-]+$/;
const ARTIST_REC_HYBRID = /^artist_rec/;
const USER_ID = /^user_[a-zA-Z0-9_-]+$/;
const KAKAO_ID = /^\d+$/;

type LookupColumn = "id" | "artist_id" | "user_id" | "kakao_id";

function detectColumn(id: string): LookupColumn | null {
  if (!id || !ID_SAFE.test(id)) return null;
  if (RECORD_ID.test(id)) return "id";
  // 'artist_rec...' 혼종 포맷은 legacy 잔재로 간주하고 거부
  if (ARTIST_REC_HYBRID.test(id)) return null;
  if (ARTIST_CODE.test(id)) return "artist_id";
  if (USER_ID.test(id)) return "user_id";
  if (KAKAO_ID.test(id)) return "kakao_id";
  return null;
}

export async function findArtistRow(
  id: string
): Promise<ArtistRow | null> {
  const column = detectColumn(id);
  if (!column) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("artists")
    .select("*")
    .eq(column, id)
    .maybeSingle();

  if (error) throw new Error(`작가 조회 실패: ${error.message}`);
  return (data as ArtistRow | null) ?? null;
}
