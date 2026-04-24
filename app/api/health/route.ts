import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/health
 * 배포 검증 / 모니터링용. Supabase 연결과 주요 테이블 접근을 가볍게 ping.
 * 세션 불필요. 캐시 비활성화.
 */
const PROBE_TIMEOUT_MS = 5_000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race<T>([
    p,
    new Promise<T>((_, rej) =>
      setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms),
    ),
  ]);
}

export async function GET() {
  const startedAt = Date.now();

  type CheckResult = { ok: boolean; latency_ms: number; error?: string };
  const checks: Record<string, CheckResult> = {};

  async function probe(name: string, run: () => Promise<void>) {
    const t0 = Date.now();
    try {
      await withTimeout(run(), PROBE_TIMEOUT_MS);
      checks[name] = { ok: true, latency_ms: Date.now() - t0 };
    } catch (error) {
      checks[name] = {
        ok: false,
        latency_ms: Date.now() - t0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  try {
    const supabase = getSupabaseAdmin();

    await probe("artists", async () => {
      const { error } = await supabase
        .from("artists")
        .select("id", { head: true })
        .limit(1);
      if (error) throw new Error(error.message);
    });

    await probe("closed_dates", async () => {
      const { error } = await supabase
        .from("closed_dates")
        .select("id", { head: true })
        .limit(1);
      if (error) throw new Error(error.message);
    });

    await probe("video_portfolio_items", async () => {
      const { error } = await supabase
        .from("video_portfolio_items")
        .select("artist_id", { head: true })
        .limit(1);
      if (error) throw new Error(error.message);
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
        duration_ms: Date.now() - startedAt,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      ok: allOk,
      env: process.env.NODE_ENV ?? "unknown",
      checks,
      duration_ms: Date.now() - startedAt,
    },
    {
      status: allOk ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
