import { NextRequest, NextResponse } from "next/server";

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";

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
export async function POST(request: NextRequest) {
  try {
    if (!AIRTABLE_TOKEN || !AIRTABLE_BASE_ID) {
      return NextResponse.json(
        { error: "Airtable 환경변수가 설정되지 않았습니다." },
        { status: 500 }
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

    const airtableUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
      ARTISTS_TABLE
    )}`;

    const airtableResponse = await fetch(airtableUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
  업체명: companyName,
  이메일: email,
  연락처: phone,
  촬영서비스: services,
  촬영지역: regions,
  촬영비용: price,
  성향키워드: styleKeywords,
  포트폴리오: portfolioUrl,
  openchat_url: openchatUrl,
  검색노출: true,
  user_id: userId || undefined,
  kakao_id: kakaoId || undefined,
},
          },
        ],
      }),
    });

    const airtableResult = await airtableResponse.json();

    if (!airtableResponse.ok) {
      console.error("Airtable 등록 오류:", airtableResult);

      return NextResponse.json(
        {
          error:
            airtableResult?.error?.message ||
            "Airtable에 작가 정보를 저장하지 못했습니다.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "작가 정보가 등록되었습니다.",
      record: airtableResult?.records?.[0] || null,
    });
  } catch (error) {
    console.error("작가 등록 API 오류:", error);

    return NextResponse.json(
      { error: "작가 정보 등록 중 서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}