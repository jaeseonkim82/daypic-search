import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

type Token = {
  userId?: string;
  artistId?: string;
  kakaoId?: string;
  email?: string;
  name?: string;
  dbError?: boolean;
};

async function findArtistByToken(token: Token) {
  const supabase = getSupabaseAdmin();

  // token.artistId가 있으면 PK로 직접 조회 (race-safe, 1 query)
  if (token.artistId) {
    const { data, error } = await supabase
      .from("artists")
      .select("id, name, email")
      .eq("id", token.artistId)
      .maybeSingle();
    if (error) {
      console.error("Supabase artist id 조회 실패:", error.message);
      return null;
    }
    if (data) return data;
  }

  // 아직 가입 직후 토큰에 artistId가 없는 경우에만 kakao_id로 폴백
  if (!token.kakaoId) return null;
  const { data, error } = await supabase
    .from("artists")
    .select("id, name, email")
    .eq("kakao_id", token.kakaoId)
    .maybeSingle();

  if (error) {
    console.error("Supabase artist kakao_id 조회 실패:", error.message);
    return null;
  }

  return data;
}

export async function GET(req: NextRequest) {
  const token = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as Token | null;

  if (!token) {
    return NextResponse.json(
      {
        ok: true,
        userId: null,
        artistId: null,
        kakaoId: null,
        email: null,
        name: null,
        isLoggedIn: false,
        isArtist: false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const artistRecord = await findArtistByToken(token);

  const artistId = artistRecord?.id ?? null;
  const artistName = artistRecord?.name ?? null;
  const artistEmail = artistRecord?.email ?? null;

  return NextResponse.json(
    {
      ok: true,
      userId: token.userId ?? null,
      artistId,
      kakaoId: token.kakaoId ?? null,
      email: artistEmail ?? token.email ?? null,
      name: artistName ?? token.name ?? null,
      isLoggedIn: true,
      isArtist: !!artistId,
      dbError: token.dbError === true,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
