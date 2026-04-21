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
    const imageUrls = body?.imageUrls;

    if (!Array.isArray(imageUrls)) {
      return NextResponse.json(
        { error: "imageUrls는 배열이어야 해." },
        { status: 400 }
      );
    }

    const cleanedUrls = imageUrls
      .filter((url) => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);

    if (cleanedUrls.length === 0) {
      return NextResponse.json(
        { error: "저장할 이미지 URL이 없어." },
        { status: 400 }
      );
    }

    if (cleanedUrls.length > 40) {
      return NextResponse.json(
        { error: "포트폴리오 이미지는 최대 40장까지만 저장할 수 있어." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .update({
        portfolio_images: cleanedUrls,
        updated_at: new Date().toISOString(),
      })
      .eq("id", artistRow.id)
      .select()
      .single();

    if (error) {
      console.error("Supabase portfolio_images update failed:", error.message);
      return NextResponse.json(
        {
          error: "포트폴리오 이미지 업데이트에 실패했어.",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      record: { id: data.id, fields: { portfolio_images: cleanedUrls } },
      savedCount: cleanedUrls.length,
      imageUrls: cleanedUrls,
    });
  } catch (error) {
    console.error("Portfolio images update error:", error);

    return NextResponse.json(
      { error: "포트폴리오 이미지 저장 중 오류가 발생했어." },
      { status: 500 }
    );
  }
}
