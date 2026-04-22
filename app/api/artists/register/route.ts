import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthSession } from "@/lib/auth-helpers";
import { serverError } from "@/lib/error-response";
import { makeRecordId, makeArtistCode } from "@/lib/ids";

type RegisterArtistRequest = {
  companyName?: string;
  email?: string;
  phone?: string;
  services?: string[];
  regions?: string[];
  price?: string;
  styleKeywords?: string[];
  portfolioUrl?: string;
  openchatUrl?: string;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}


export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession(request);
    if (!session.kakaoId) {
      return NextResponse.json(
        { error: "로그인이 필요해요." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as RegisterArtistRequest;

    const companyName = body.companyName?.trim() || "";
    const email = body.email?.trim() || "";
    const phone = body.phone?.trim() || "";
    const services = Array.isArray(body.services) ? body.services : [];
    const regions = Array.isArray(body.regions) ? body.regions : [];
    const price = body.price?.trim() || "";
    const styleKeywords = Array.isArray(body.styleKeywords)
      ? body.styleKeywords
      : [];
    const portfolioUrl = body.portfolioUrl?.trim() || "";
    const openchatUrl = body.openchatUrl?.trim() || "";

    // 식별자는 body가 아닌 세션에서만 (계정 사칭 방지)
    const kakaoId = session.kakaoId;
    const userId = session.userId || `user_${kakaoId}`;

    if (!companyName) {
      return NextResponse.json(
        { error: "업체명을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "이메일을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!phone) {
      return NextResponse.json(
        { error: "연락처를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (services.length === 0) {
      return NextResponse.json(
        { error: "촬영서비스를 1개 이상 선택해 주세요." },
        { status: 400 }
      );
    }

    if (regions.length === 0) {
      return NextResponse.json(
        { error: "촬영지역을 1개 이상 선택해 주세요." },
        { status: 400 }
      );
    }

    if (!price) {
      return NextResponse.json(
        { error: "촬영비용을 선택해 주세요." },
        { status: 400 }
      );
    }

    if (styleKeywords.length === 0) {
      return NextResponse.json(
        { error: "성향키워드를 1개 이상 선택해 주세요." },
        { status: 400 }
      );
    }

    if (!portfolioUrl || !isValidUrl(portfolioUrl)) {
      return NextResponse.json(
        { error: "올바른 포트폴리오 URL을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!openchatUrl || !isValidUrl(openchatUrl)) {
      return NextResponse.json(
        { error: "올바른 오픈채팅 링크를 입력해 주세요." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const normalizedEmail = email.toLowerCase();

    const id = makeRecordId();
    const artistCode = makeArtistCode();

    // users는 항상 세션 사용자 기준으로 먼저 보장 (FK 대비)
    const { error: userError } = await supabase
      .from("users")
      .upsert(
        {
          id: userId,
          kakao_id: kakaoId,
          email: normalizedEmail,
          name: companyName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (userError) {
      console.error("Supabase user upsert 오류:", userError);
      return NextResponse.json(
        { error: "사용자 정보 저장 실패" },
        { status: 500 }
      );
    }

    const { data, error } = await supabase
      .from("artists")
      .insert({
        id,
        artist_id: artistCode,
        user_id: userId,
        kakao_id: kakaoId,
        name: companyName,
        email: normalizedEmail,
        phone,
        service: services,
        region: regions,
        price,
        style_keywords: styleKeywords,
        portfolio: portfolioUrl,
        open_chat_url: openchatUrl,
        rating: 4.8,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase 작가 등록 오류:", error);
      // UNIQUE 위반(kakao_id/email/artist_id)은 409로 안내
      if (error.code === "23505") {
        const detail = error.message.toLowerCase();
        if (detail.includes("kakao_id")) {
          return NextResponse.json(
            { error: "이미 등록된 카카오 계정입니다." },
            { status: 409 }
          );
        }
        if (detail.includes("email")) {
          return NextResponse.json(
            { error: "이미 등록된 이메일입니다." },
            { status: 409 }
          );
        }
        return NextResponse.json(
          { error: "중복된 작가 정보가 있어요." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            process.env.NODE_ENV === "production"
              ? "작가 정보 저장에 실패했어요."
              : `작가 정보 저장 실패: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "작가 정보가 등록되었습니다.",
      artist: {
        id: data.id,
        artist_id: data.artist_id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        service: data.service,
        region: data.region,
        price: data.price,
        style_keywords: data.style_keywords,
        portfolio: data.portfolio,
        open_chat_url: data.open_chat_url,
        user_id: data.user_id,
        kakao_id: data.kakao_id,
      },
    });
  } catch (error) {
    return serverError(
      "POST /api/artists/register",
      error,
      "작가 정보 등록 중 서버 오류가 발생했습니다."
    );
  }
}
