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

    const updates = {
      video_link_1: sanitizeString(body.video_link_1),
      video_link_2: sanitizeString(body.video_link_2),
      video_link_3: sanitizeString(body.video_link_3),
      video_link_4: sanitizeString(body.video_link_4),
      video_thumb_1: sanitizeString(body.video_thumb_1),
      video_thumb_2: sanitizeString(body.video_thumb_2),
      video_thumb_3: sanitizeString(body.video_thumb_3),
      video_thumb_4: sanitizeString(body.video_thumb_4),
      video_style_tags: sanitizeStringArray(body.video_style_tags),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .update(updates)
      .eq("id", artistRow.id)
      .select()
      .single();

    if (error) {
      return serverError(
        "PATCH video-portfolio",
        error,
        "영상 포트폴리오 저장에 실패했어."
      );
    }

    // Phase 4.2 Contract: 관계 테이블에도 명시적 upsert (트리거 경로와 병행).
    // 추후 트리거 제거 + artists.video_* 컬럼 DROP 시 이 경로만 남음.
    const slotInputs: Array<{ position: number; link: string; thumb: string }> = [
      { position: 1, link: updates.video_link_1, thumb: updates.video_thumb_1 },
      { position: 2, link: updates.video_link_2, thumb: updates.video_thumb_2 },
      { position: 3, link: updates.video_link_3, thumb: updates.video_thumb_3 },
      { position: 4, link: updates.video_link_4, thumb: updates.video_thumb_4 },
    ];

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
        console.warn(
          "video_portfolio_items delete 실패(무시):",
          delErr.message
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
        style_tags: updates.video_style_tags,
      }));

    if (rowsToUpsert.length > 0) {
      const { error: upErr } = await supabase
        .from("video_portfolio_items")
        .upsert(rowsToUpsert, { onConflict: "artist_id,position" });
      if (upErr) {
        console.warn(
          "video_portfolio_items upsert 실패(무시):",
          upErr.message
        );
      }
    }

    return NextResponse.json({
      ok: true,
      success: true,
      message: "영상 포트폴리오가 저장되었어.",
      recordId: data.id,
    });
  } catch (error) {
    return serverError(
      "PATCH video-portfolio",
      error,
      "영상 포트폴리오 저장 중 오류가 발생했어."
    );
  }
}
