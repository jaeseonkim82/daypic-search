/**
 * TanStack Query 키 팩토리. 일관된 키 구조로 invalidation / 타입 안전성 확보.
 * 컨벤션: [resource, scope?, params?]
 */

export const queryKeys = {
  me: () => ["me"] as const,

  artist: {
    all: () => ["artist"] as const,
    detail: (id: string) => ["artist", "detail", id] as const,
    byEmail: (email: string) => ["artist", "by-email", email] as const,
  },

  search: (params: {
    date: string;
    region?: string;
    price?: string;
    services?: string[];
    seed?: string;
  }) => ["search", params] as const,

  artistClosed: () => ["artist-closed"] as const,

  health: () => ["health"] as const,
};
