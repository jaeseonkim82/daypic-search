import * as Sentry from "@sentry/nextjs";
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
