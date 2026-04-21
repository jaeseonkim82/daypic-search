import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthSession } from "@/lib/auth-helpers";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session.kakaoId) {
      return NextResponse.json(
        { error: "로그인이 필요해요." },
        { status: 401 }
      );
    }

    const emailParam = request.nextUrl.searchParams.get("email");
    if (!emailParam) {
      return NextResponse.json(
        { error: "email 파라미터가 필요해요." },
        { status: 400 }
      );
    }

    const email = emailParam.trim().toLowerCase();

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("artists")
      .select("id, email, name")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase by-email 조회 실패:", error.message);
      return NextResponse.json(
        { error: "작가 이메일 조회에 실패했어요.", detail: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "해당 이메일의 작가를 찾지 못했어요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      artist: {
        id: data.id,
        email: data.email ?? "",
        name: data.name ?? "",
      },
    });
  } catch (error) {
    console.error("Artist by-email error:", error);

    return NextResponse.json(
      { error: "작가 이메일 조회 중 오류가 발생했어요." },
      { status: 500 }
    );
  }
}
