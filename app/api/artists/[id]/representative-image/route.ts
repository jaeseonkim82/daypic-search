import { NextRequest, NextResponse } from "next/server";
import { requireArtistOwner } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "작가 식별값이 없어." },
        { status: 400 }
      );
    }

    const auth = await requireArtistOwner(request, id);
    if (!auth.ok) return auth.response;
    const artistRow = auth.artist;

    const body = await request.json();
    const imageUrl = body?.imageUrl;

    if (typeof imageUrl !== "string" || !imageUrl.trim()) {
      return NextResponse.json(
        { error: "imageUrl이 필요해." },
        { status: 400 }
      );
    }

    const cleanedImageUrl = imageUrl.trim();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .update({
        image: cleanedImageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artistRow.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase 대표사진 update failed:", error.message);
      return NextResponse.json(
        { error: "대표사진 업데이트에 실패했어.", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record: { id: data.id, fields: { 대표사진: [{ url: cleanedImageUrl }] } },
      imageUrl: cleanedImageUrl,
    });
  } catch (error) {
    console.error("Representative image update error:", error);

    return NextResponse.json(
      { error: "대표사진 저장 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}
