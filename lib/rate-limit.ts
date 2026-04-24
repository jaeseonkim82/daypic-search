/**
 * Upstash Redis 기반 Rate Limiter.
 *
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 두 env 가 설정되면 활성화.
 * 미설정 시 모든 체크가 { success: true } no-op. 배포 후 env 만 추가하면 자동 활성.
 *
 * Upstash 대시보드 → Database → REST API Details 에서 URL/TOKEN 복사.
 * https://console.upstash.com
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = {
  limit: (key: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

const NOOP_LIMITER: Limiter = {
  limit: async () => ({
    success: true,
    limit: 0,
    remaining: 0,
    reset: 0,
  }),
};

function buildRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// 용도별 제한. sliding window 로 짧은 순간의 버스트를 억제.
function buildLimiter(
  redis: Redis | null,
  requests: number,
  window: `${number} ${"s" | "m" | "h"}`,
  prefix: string,
): Limiter {
  if (!redis) return NOOP_LIMITER;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `daypic:${prefix}`,
  });
}

const redis = buildRedis();

export const rateLimiters = {
  // anon / 인증 공통. IP 당.
  search: buildLimiter(redis, 60, "1 m", "search"),
  auth: buildLimiter(redis, 10, "1 m", "auth"),
  // 인증 필요. 작가(=kakaoId) 당.
  cloudinarySign: buildLimiter(redis, 20, "1 m", "cloudinary"),
  mutation: buildLimiter(redis, 30, "1 m", "mutation"),
};

export const rateLimitEnabled = redis !== null;

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
};

export async function checkRateLimit(
  limiter: Limiter,
  key: string,
): Promise<RateLimitResult> {
  const res = await limiter.limit(key);
  return {
    ok: res.success,
    limit: res.limit,
    remaining: res.remaining,
    resetAt: res.reset,
  };
}

/**
 * 요청에서 client IP 추출. Vercel / 표준 reverse proxy 헤더 기준.
 */
export function getClientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  return "anonymous";
}

/**
 * 429 응답 빌더. 공통 헤더(X-RateLimit-*) 포함.
 */
export function rateLimitedResponse(result: RateLimitResult): Response {
  const body = JSON.stringify({
    ok: false,
    error: "요청이 너무 잦아요. 잠시 후 다시 시도해주세요.",
  });
  const retryAfter = Math.max(
    1,
    Math.ceil((result.resetAt - Date.now()) / 1000),
  );
  return new Response(body, {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.resetAt),
      "Retry-After": String(retryAfter),
    },
  });
}
