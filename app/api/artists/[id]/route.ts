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
    console.warn(
      "video_portfolio_items 조회 실패 (fallback to legacy columns):",
      error.message
    );
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
  const byPosition = new Map(items.map((item) => [item.position, item]));

  // Phase 4.2: 관계 테이블이 source of truth. artists.video_* 는 fallback.
  const link1 = byPosition.get(1)?.link ?? row.video_link_1 ?? "";
  const link2 = byPosition.get(2)?.link ?? row.video_link_2 ?? "";
  const link3 = byPosition.get(3)?.link ?? row.video_link_3 ?? "";
  const link4 = byPosition.get(4)?.link ?? row.video_link_4 ?? "";
  const thumb1 = byPosition.get(1)?.thumb ?? row.video_thumb_1 ?? "";
  const thumb2 = byPosition.get(2)?.thumb ?? row.video_thumb_2 ?? "";
  const thumb3 = byPosition.get(3)?.thumb ?? row.video_thumb_3 ?? "";
  const thumb4 = byPosition.get(4)?.thumb ?? row.video_thumb_4 ?? "";

  // style_tags: items 중 아무 position의 style_tags (전부 동일한 전역 태그 구조)
  // 없으면 artists.video_style_tags 폴백
  const videoStyleTags =
    items.find((item) => item.style_tags.length > 0)?.style_tags ??
    row.video_style_tags ??
    [];

  const videoLinks = [link1, link2, link3, link4].filter(Boolean);

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

    video_link_1: link1,
    video_link_2: link2,
    video_link_3: link3,
    video_link_4: link4,

    video_links: videoLinks,

    video_thumbnail: row.video_thumbnail ?? thumb1,
    video_thumb_1: thumb1,
    video_thumb_2: thumb2,
    video_thumb_3: thumb3,
    video_thumb_4: thumb4,

    video_style_tags: videoStyleTags,

    // Phase 4.2 신규: 관계 테이블 원형
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

    const STRING_FIELDS = [
      "phone",
      "price",
      "video_link_1",
      "video_link_2",
      "video_link_3",
      "video_link_4",
      "video_thumbnail",
      "video_thumb_1",
      "video_thumb_2",
      "video_thumb_3",
      "video_thumb_4",
    ] as const;
    const ARRAY_FIELDS = [
      "service",
      "region",
      "style_keywords",
      "video_style_tags",
    ] as const;

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
