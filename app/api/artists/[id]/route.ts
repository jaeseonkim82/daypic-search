import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, ArtistRow } from "@/lib/supabase";
import { findArtistRow } from "@/lib/artist-lookup";
import { requireArtistOwner } from "@/lib/auth-helpers";
import { serverError } from "@/lib/error-response";

function sanitizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

type VideoItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

async function fetchVideoPortfolioItems(artistId: string): Promise<VideoItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("video_portfolio_items")
    .select("position, link, thumb, style_tags")
    .eq("artist_id", artistId)
    .order("position", { ascending: true });

  if (error) {
    console.warn("video_portfolio_items 조회 실패:", error.message);
    return [];
  }

  return (data ?? []).map((item) => ({
    position: item.position,
    link: item.link,
    thumb: item.thumb ?? "",
    style_tags: item.style_tags ?? [],
  }));
}

function normalizeArtist(row: ArtistRow, items: VideoItem[] = []) {
  const styleKeywords = row.style_keywords ?? [];

  return {
    id: row.id,
    artist_id: row.artist_id ?? "",
    user_id: row.user_id ?? "",
    kakao_id: row.kakao_id ?? "",

    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? "",

    service: row.service ?? [],
    region: row.region ?? [],

    price: row.price ?? "",

    style_keywords: styleKeywords,
    // @deprecated 하위 호환용 별칭. 클라이언트 전환 후 제거 예정.
    keywords: styleKeywords,
    // @deprecated Airtable 시절 한국어 키 호환. 클라이언트 전환 후 제거.
    성향키워드: styleKeywords,

    portfolio: row.portfolio ?? "",
    open_chat_url: row.open_chat_url ?? "",
    artist_type: row.artist_type ?? "",

    portfolio_images: row.portfolio_images ?? [],

    image: row.image ?? "",
    rating: typeof row.rating === "number" ? row.rating : null,

    video_portfolio_items: items,

    // 낙관적 락(선택) 사용을 위한 버전 토큰
    updated_at: row.updated_at ?? null,
  };
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const row = await findArtistRow(id);

    if (!row) {
      return NextResponse.json(
        { error: "작가를 찾을 수 없어." },
        { status: 404 }
      );
    }

    const videoItems = await fetchVideoPortfolioItems(row.id);
    return NextResponse.json(normalizeArtist(row, videoItems));
  } catch (error) {
    return serverError(
      "GET /api/artists/[id]",
      error,
      "작가 정보를 불러오는 중 오류가 발생했어."
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const auth = await requireArtistOwner(req, id);
    if (!auth.ok) return auth.response;

    const existing = auth.artist;
    const body = await req.json();
    const has = (key: string) =>
      Object.prototype.hasOwnProperty.call(body, key);

    // 낙관적 락(opt-in): 클라이언트가 expected_updated_at을 보내면,
    // 서버 최신값과 비교해 불일치 시 409 반환. 없으면 기존 동작.
    if (has("expected_updated_at")) {
      const expected = String(body.expected_updated_at ?? "");
      const current = (existing.updated_at ?? "").toString();
      if (expected && current && expected !== current) {
        return NextResponse.json(
          {
            ok: false,
            error: "다른 기기에서 먼저 저장되어, 새로고침 후 다시 시도해줘.",
            current_updated_at: current,
          },
          { status: 409 }
        );
      }
    }

    const updates: Partial<ArtistRow> = {};

    // Phase 4.2 Contract: video_* 컬럼은 007에서 DROP 됐으므로
    // 이 generic PATCH의 허용 목록에서 제외. 영상은 /video-portfolio 전용 라우트로.
    const STRING_FIELDS = ["phone", "price"] as const;
    const ARRAY_FIELDS = ["service", "region", "style_keywords"] as const;

    for (const field of STRING_FIELDS) {
      if (has(field)) {
        (updates as Record<string, unknown>)[field] = sanitizeString(
          body[field]
        );
      }
    }
    for (const field of ARRAY_FIELDS) {
      if (has(field)) {
        (updates as Record<string, unknown>)[field] = sanitizeStringArray(
          body[field]
        );
      }
    }

    if (Object.keys(updates).length === 0) {
      const items = await fetchVideoPortfolioItems(existing.id);
      return NextResponse.json({
        ok: true,
        message: "변경할 항목이 없어.",
        artist: normalizeArtist(existing, items),
      });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return serverError(
        "PATCH /api/artists/[id]",
        error,
        "작가정보 저장에 실패했어요."
      );
    }

    const items = await fetchVideoPortfolioItems(existing.id);
    return NextResponse.json({
      ok: true,
      message: "작가정보가 저장되었어.",
      artist: normalizeArtist(data as ArtistRow, items),
    });
  } catch (error) {
    return serverError(
      "PATCH /api/artists/[id]",
      error,
      "작가정보 저장 중 오류가 발생했어."
    );
  }
}
