import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { AuthSession } from "@/lib/auth-helpers";

type RequestContext = {
  endpoint: string;
  method: string;
  params?: Record<string, unknown>;
};

export function setSentryUser(session: AuthSession) {
  Sentry.setUser({
    id: session.kakaoId,
    username: session.name,
    email: session.email,
    data: { artistId: session.artistId },
  });
}

export function setSentryRequestContext(ctx: RequestContext) {
  Sentry.setTag("endpoint", ctx.endpoint);
  Sentry.setTag("http.method", ctx.method);
  if (ctx.params) {
    Sentry.setContext("request_params", ctx.params);
  }
}

export function captureApiError(
  error: unknown,
  endpoint: string,
  extra?: Record<string, unknown>
) {
  Sentry.captureException(error, {
    tags: { endpoint },
    extra,
  });
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function captureAndRespond(
  error: unknown,
  endpoint: string,
  userMessage: string,
  extra?: Record<string, unknown> & { session?: AuthSession | null }
): NextResponse {
  const { session, ...rest } = extra ?? {};

  Sentry.captureException(error, {
    tags: { endpoint },
    extra: {
      ...rest,
      response_message: userMessage,
      http_status: 500,
    },
    user: session?.kakaoId
      ? {
          id: session.kakaoId,
          username: session.name,
          email: session.email,
          data: { artistId: session.artistId },
        }
      : undefined,
  });

  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[${endpoint}]`, detail);

  const body: Record<string, unknown> = { ok: false, error: userMessage };
  if (!IS_PRODUCTION) body.detail = detail;

  return NextResponse.json(body, { status: 500 });
}

export async function withSentryContext<T>(
  request: NextRequest,
  endpoint: string,
  session: AuthSession | null,
  params: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    scope.setTag("endpoint", endpoint);
    scope.setTag("http.method", request.method);
    scope.setContext("request_params", params);

    if (session?.kakaoId) {
      scope.setUser({
        id: session.kakaoId,
        username: session.name,
        email: session.email,
        data: { artistId: session.artistId },
      });
    }

    return fn();
  });
}
