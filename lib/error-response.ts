import { NextResponse } from "next/server";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

type JsonBody = Record<string, unknown>;

/**
 * 서버 내부 에러를 안전하게 응답으로 변환.
 * - 프로덕션: DB/라이브러리 상세 메시지 숨기고 고정 문구만.
 * - 개발: 원본 에러 메시지를 detail로 노출.
 *
 * console.error로 원본은 항상 로그.
 */
export function serverError(
  context: string,
  error: unknown,
  userMessage: string,
  status = 500,
  extra: JsonBody = {}
): NextResponse {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[${context}]`, detail);

  const body: JsonBody = { ok: false, error: userMessage, ...extra };
  if (!IS_PRODUCTION) body.detail = detail;

  return NextResponse.json(body, { status });
}
