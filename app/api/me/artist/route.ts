import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { getSupabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/error-response";

type RawToken = {
  artistId?: unknown;
  kakaoId?: unknown;
  dbError?: unknown;
};

function pickString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

const ARTIST_FIELDS =
  "id, name, email, phone, price, service, region, style_keywords, updated_at";

async function findArtistForToken(token: RawToken) {
  const supabase = getSupabaseAdmin();

  // 로그인 시점에 기록된 artistId가 있으면 PK 직접 조회
  const artistId = pickString(token.artistId);
  if (artistId) {
    const { data } = await supabase
      .from("artists")
      .select(ARTIST_FIELDS)
      .eq("id", artistId)
      .maybeSingle();
    if (data) return data;
  }

  // 로그인 후 작가 등록한 경우 토큰 갱신 전까지 artistId가 없음 → kakaoId 폴백
  const kakaoId = pickString(token.kakaoId);
  if (!kakaoId) return null;

  const { data } = await supabase
    .from("artists")
    .select(ARTIST_FIELDS)
    .eq("kakao_id", kakaoId)
    .maybeSingle();
  return data ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const token = (await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })) as RawToken | null;

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "로그인이 필요해." },
        { status: 401 }
      );
    }

    const artist = await findArtistForToken(token);

    if (!artist) {
      return NextResponse.json(
        { ok: false, error: "작가 계정이 아니야." },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        dbError: token.dbError === true,
        artist: {
          id: artist.id,
          name: artist.name ?? "",
          email: artist.email ?? "",
          phone: artist.phone ?? "",
          price: artist.price ?? "",
          service: artist.service ?? [],
          region: artist.region ?? [],
          style_keywords: artist.style_keywords ?? [],
          updated_at: artist.updated_at ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return serverError(
      "GET /api/me/artist",
      error,
      "작가 정보를 불러오는 중 오류가 발생했어."
    );
  }
}
