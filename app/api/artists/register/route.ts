import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

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
  userId?: string;
  kakaoId?: string;
};

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function makeArtistId() {
  return `artist_${Math.random().toString(36).slice(2, 14)}`;
}

function makeRecordId() {
  return `rec${Math.random().toString(36).slice(2, 16)}`;
}

export async function POST(request: NextRequest) {
  try {
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
    const userId = body.userId?.trim() || "";
    const kakaoId = body.kakaoId?.trim() || "";

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

    if (kakaoId) {
      const { data: existing } = await supabase
        .from("artists")
        .select("id")
        .eq("kakao_id", kakaoId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { error: "이미 등록된 카카오 계정입니다." },
          { status: 409 }
        );
      }
    }

    const { data: emailDup } = await supabase
      .from("artists")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (emailDup) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다." },
        { status: 409 }
      );
    }

    const id = makeRecordId();
    const artistId = makeArtistId();

    const { data, error } = await supabase
      .from("artists")
      .insert({
        id,
        artist_id: artistId,
        user_id: userId || null,
        kakao_id: kakaoId || null,
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
      return NextResponse.json(
        { error: `작가 정보 저장 실패: ${error.message}` },
        { status: 500 }
      );
    }

    if (userId) {
      await supabase
        .from("users")
        .upsert(
          {
            id: userId,
            kakao_id: kakaoId || null,
            email: normalizedEmail,
            name: companyName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        );
    }

    return NextResponse.json({
      ok: true,
      message: "작가 정보가 등록되었습니다.",
      record: {
        id: data.id,
        fields: {
          artist_id: data.artist_id,
          업체명: data.name,
          이메일: data.email,
          연락처: data.phone,
          촬영서비스: data.service,
          촬영지역: data.region,
          촬영비용: data.price,
          성향키워드: data.style_keywords,
          포트폴리오: data.portfolio,
          openchat_url: data.open_chat_url,
          user_id: data.user_id,
          kakao_id: data.kakao_id,
        },
      },
    });
  } catch (error) {
    console.error("작가 등록 API 오류:", error);

    return NextResponse.json(
      { error: "작가 정보 등록 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
