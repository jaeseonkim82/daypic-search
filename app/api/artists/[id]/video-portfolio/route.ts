import { NextRequest, NextResponse } from "next/server";
import { requireArtistOwner } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: artistId } = await context.params;

    if (!artistId) {
      return NextResponse.json(
        { ok: false, error: "작가 ID가 없습니다." },
        { status: 400 }
      );
    }

    const auth = await requireArtistOwner(req, artistId);
    if (!auth.ok) return auth.response;
    const artistRow = auth.artist;

    const body = await req.json();

    // Phase 4.2 Contract: items 배열만 수용. 레거시 video_link_N / video_thumb_N 제거.
    if (!Array.isArray(body.items)) {
      return NextResponse.json(
        { ok: false, error: "items 배열이 필요해." },
        { status: 400 },
      );
    }

    const slotInputs: Array<{ position: number; link: string; thumb: string }> =
      (body.items as Array<Record<string, unknown>>)
        .map((raw) => ({
          position: Number(raw.position ?? 0),
          link: sanitizeString(raw.link),
          thumb: sanitizeString(raw.thumb),
        }))
        .filter((s) => s.position >= 1 && s.position <= 10);

    if (slotInputs.length === 0) {
      return NextResponse.json(
        { ok: false, error: "유효한 position(1~10)이 있는 item이 필요해." },
        { status: 400 },
      );
    }

    const styleTags = sanitizeStringArray(body.style_tags);

    const supabase = getSupabaseAdmin();

    const positionsToDelete = slotInputs
      .filter((s) => !s.link)
      .map((s) => s.position);

    if (positionsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from("video_portfolio_items")
        .delete()
        .eq("artist_id", artistRow.id)
        .in("position", positionsToDelete);
      if (delErr) {
        return serverError(
          "PATCH video-portfolio (delete)",
          delErr,
          "영상 포트폴리오 저장에 실패했어."
        );
      }
    }

    const rowsToUpsert = slotInputs
      .filter((s) => !!s.link)
      .map((s) => ({
        artist_id: artistRow.id,
        position: s.position,
        link: s.link,
        thumb: s.thumb || null,
        style_tags: styleTags,
      }));

    if (rowsToUpsert.length > 0) {
      const { error: upErr } = await supabase
        .from("video_portfolio_items")
        .upsert(rowsToUpsert, { onConflict: "artist_id,position" });
      if (upErr) {
        return serverError(
          "PATCH video-portfolio (upsert)",
          upErr,
          "영상 포트폴리오 저장에 실패했어."
        );
      }
    }

    // artists.updated_at만 bump (낙관적 락 버전 토큰용). video 컬럼은 손대지 않음.
    const { error: touchErr } = await supabase
      .from("artists")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", artistRow.id);
    if (touchErr) {
      console.warn("artists.updated_at bump 실패(무시):", touchErr.message);
    }

    return NextResponse.json({
      ok: true,
      message: "영상 포트폴리오가 저장되었어.",
      recordId: artistRow.id,
    });
  } catch (error) {
    return serverError(
      "PATCH video-portfolio",
      error,
      "영상 포트폴리오 저장 중 오류가 발생했어."
    );
  }
}
