import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";

const ID_SAFE = /^[a-zA-Z0-9_-]+$/;
const RECORD_ID = /^rec[a-zA-Z0-9_-]+$/;
const ARTIST_REC_HYBRID = /^artist_rec/;
const USER_ID = /^user_[a-zA-Z0-9_-]+$/;
const KAKAO_ID = /^\d+$/;

type LookupColumn = "id" | "user_id" | "kakao_id";

function detectColumn(id: string): LookupColumn | null {
  if (!id || !ID_SAFE.test(id)) return null;
  if (RECORD_ID.test(id)) return "id";
  // Phase B: artist_xxx 레거시 코드 포맷은 더 이상 lookup 안 함. 404 로 유도.
  if (ARTIST_REC_HYBRID.test(id)) return null;
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
