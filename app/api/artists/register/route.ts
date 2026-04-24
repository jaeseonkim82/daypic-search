import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAuthSession } from "@/lib/auth-helpers";
import { serverError } from "@/lib/error-response";
import { makeRecordId, makeArtistCode } from "@/lib/ids";
import {
  checkRateLimit,
  rateLimitedResponse,
  rateLimiters,
} from "@/lib/rate-limit";

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
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
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

    const rl = await checkRateLimit(
      rateLimiters.mutation,
      `kakao:${session.kakaoId}`,
    );
    if (!rl.ok) return rateLimitedResponse(rl);

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

    // 008 마이그레이션: users upsert + artists insert 를 단일 트랜잭션으로 묶는 RPC.
    // 중간 실패 시 users 만 남는 half-registered 상태 방지.
    const { data, error } = await supabase.rpc("register_artist", {
      p_id: id,
      p_artist_id: artistCode,
      p_user_id: userId,
      p_kakao_id: kakaoId,
      p_email: normalizedEmail,
      p_name: companyName,
      p_phone: phone,
      p_service: services,
      p_region: regions,
      p_price: price,
      p_style_keywords: styleKeywords,
      p_portfolio: portfolioUrl,
      p_open_chat_url: openchatUrl,
    });

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
