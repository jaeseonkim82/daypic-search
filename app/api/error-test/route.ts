import { NextRequest, NextResponse } from "next/server";
import { captureApiError } from "@/lib/sentry-utils";
import { serverError } from "@/lib/error-response";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") ?? "exception";

  try {
    if (type === "exception") {
      throw new Error("🔥 의도적 에러 테스트 — Sentry 수신 확인용");
    }

    if (type === "supabase") {
      throw new Error("작가 조회 실패: connection timeout (모의 Supabase 에러)");
    }

    if (type === "auth") {
      throw new Error("JWTDecodeError: invalid signature (모의 Auth 에러)");
    }

    return NextResponse.json({ ok: true, message: "에러 없음 — type 파라미터를 확인해." });
  } catch (error) {
    captureApiError(error, "GET /api/error-test", { type });
    return serverError("GET /api/error-test", error, "에러 테스트 완료 — Sentry 대시보드를 확인해.");
  }
}
