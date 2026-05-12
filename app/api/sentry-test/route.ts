import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  Sentry.captureMessage("✅ Sentry 연결 테스트 — daypic-search", "info");
  return NextResponse.json({ ok: true, message: "Sentry에 테스트 이벤트를 보냈어." });
}
