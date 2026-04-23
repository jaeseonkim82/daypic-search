import { NextRequest, NextResponse } from "next/server";
import { requireArtistOwner } from "@/lib/auth-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { serverError } from "@/lib/error-response";

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
      return serverError(
        "PATCH representative-image",
        error,
        "대표사진 업데이트에 실패했어."
      );
    }

    return NextResponse.json({
      ok: true,
      id: data.id,
      imageUrl: cleanedImageUrl,
    });
  } catch (error) {
    return serverError(
      "PATCH representative-image",
      error,
      "대표사진 저장 중 오류가 발생했어."
    );
  }
}
