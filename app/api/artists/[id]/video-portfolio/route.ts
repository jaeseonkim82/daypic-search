import { NextRequest, NextResponse } from "next/server";
import { requireArtistOwner } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

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
      console.error("video-portfolio update failed:", error.message);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "영상 포트폴리오가 저장되었어.",
      recordId: data.id,
    });
  } catch (error) {
    console.error("video-portfolio PATCH error:", error);

    return NextResponse.json(
      { success: false, error: "서버 오류 발생" },
      { status: 500 }
    );
  }
}
