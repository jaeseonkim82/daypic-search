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
        { success: false, error: "작가 ID가 없습니다." },
        { status: 400 }
      );
    }

    const auth = await requireArtistOwner(req, artistId);
    if (!auth.ok) return auth.response;
    const artistRow = auth.artist;

    const body = await req.json();

    const slotInputs: Array<{ position: number; link: string; thumb: string }> = [
      { position: 1, link: sanitizeString(body.video_link_1), thumb: sanitizeString(body.video_thumb_1) },
      { position: 2, link: sanitizeString(body.video_link_2), thumb: sanitizeString(body.video_thumb_2) },
      { position: 3, link: sanitizeString(body.video_link_3), thumb: sanitizeString(body.video_thumb_3) },
      { position: 4, link: sanitizeString(body.video_link_4), thumb: sanitizeString(body.video_thumb_4) },
    ];
    const styleTags = sanitizeStringArray(body.video_style_tags);

    const supabase = getSupabaseAdmin();

    // Phase 4.2 Contract: 관계 테이블(video_portfolio_items)에 직접 쓰기.
    // artists.video_link_N / video_thumb_N / video_style_tags / video_thumbnail
    // 컬럼은 007 마이그레이션으로 DROP 예정이므로 여기서도 쓰지 않음.
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
      success: true,
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
