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
};

async function findArtistByKakaoId(kakaoId: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("artists")
    .select("id, artist_id, name, email")
    .eq("kakao_id", kakaoId)
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
        artistCode: null,
        kakaoId: null,
        email: null,
        name: null,
        isLoggedIn: false,
        isArtist: false,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const artistRecord = token.kakaoId
    ? await findArtistByKakaoId(String(token.kakaoId))
    : null;

  const artistId = artistRecord?.id ?? null;
  const artistCode = artistRecord?.artist_id ?? null;
  const artistName = artistRecord?.name ?? null;
  const artistEmail = artistRecord?.email ?? null;

  return NextResponse.json(
    {
      ok: true,
      userId: token.userId ?? null,
      artistId,
      artistCode,
      kakaoId: token.kakaoId ?? null,
      email: artistEmail ?? token.email ?? null,
      name: artistName ?? token.name ?? null,
      isLoggedIn: true,
      isArtist: !!artistId,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
