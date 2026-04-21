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

function toAttachmentArray(url: string) {
  return url ? [{ id: undefined, url, filename: undefined }] : [];
}

function normalizeArtist(row: ArtistRow) {
  const styleKeywords = row.style_keywords ?? [];
  const videoLinks = [
    row.video_link_1 ?? "",
    row.video_link_2 ?? "",
    row.video_link_3 ?? "",
    row.video_link_4 ?? "",
  ].filter(Boolean);

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

    video_link_1: row.video_link_1 ?? "",
    video_link_2: row.video_link_2 ?? "",
    video_link_3: row.video_link_3 ?? "",
    video_link_4: row.video_link_4 ?? "",

    video_links: videoLinks,

    video_thumbnail: row.video_thumbnail ?? "",
    video_thumbnail_attachments: toAttachmentArray(row.video_thumbnail ?? ""),

    video_thumb_1: row.video_thumb_1 ?? "",
    video_thumb_2: row.video_thumb_2 ?? "",
    video_thumb_3: row.video_thumb_3 ?? "",
    video_thumb_4: row.video_thumb_4 ?? "",

    video_thumb_1_attachments: toAttachmentArray(row.video_thumb_1 ?? ""),
    video_thumb_2_attachments: toAttachmentArray(row.video_thumb_2 ?? ""),
    video_thumb_3_attachments: toAttachmentArray(row.video_thumb_3 ?? ""),
    video_thumb_4_attachments: toAttachmentArray(row.video_thumb_4 ?? ""),

    video_style_tags: row.video_style_tags ?? [],
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

    return NextResponse.json(normalizeArtist(row));
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
    const updates: Partial<ArtistRow> = {};
    const has = (key: string) =>
      Object.prototype.hasOwnProperty.call(body, key);

    if (has("phone")) updates.phone = sanitizeString(body.phone);
    if (has("price")) updates.price = sanitizeString(body.price);
    if (has("service")) updates.service = sanitizeStringArray(body.service);
    if (has("region")) updates.region = sanitizeStringArray(body.region);
    if (has("style_keywords"))
      updates.style_keywords = sanitizeStringArray(body.style_keywords);

    if (has("video_link_1"))
      updates.video_link_1 = sanitizeString(body.video_link_1);
    if (has("video_link_2"))
      updates.video_link_2 = sanitizeString(body.video_link_2);
    if (has("video_link_3"))
      updates.video_link_3 = sanitizeString(body.video_link_3);
    if (has("video_link_4"))
      updates.video_link_4 = sanitizeString(body.video_link_4);

    if (has("video_style_tags"))
      updates.video_style_tags = sanitizeStringArray(body.video_style_tags);

    if (has("video_thumbnail"))
      updates.video_thumbnail = sanitizeString(body.video_thumbnail);
    if (has("video_thumb_1"))
      updates.video_thumb_1 = sanitizeString(body.video_thumb_1);
    if (has("video_thumb_2"))
      updates.video_thumb_2 = sanitizeString(body.video_thumb_2);
    if (has("video_thumb_3"))
      updates.video_thumb_3 = sanitizeString(body.video_thumb_3);
    if (has("video_thumb_4"))
      updates.video_thumb_4 = sanitizeString(body.video_thumb_4);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({
        ok: true,
        message: "변경할 항목이 없어.",
        artist: normalizeArtist(existing),
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

    return NextResponse.json({
      ok: true,
      message: "작가정보가 저장되었어.",
      artist: normalizeArtist(data as ArtistRow),
    });
  } catch (error) {
    return serverError(
      "PATCH /api/artists/[id]",
      error,
      "작가정보 저장 중 오류가 발생했어."
    );
  }
}
