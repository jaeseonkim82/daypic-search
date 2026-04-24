"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type MeResponse = {
  ok: boolean;
  userId: string | null;
  artistId: string | null;
  kakaoId: string | null;
  email: string | null;
  name: string | null;
  isLoggedIn: boolean;
  isArtist: boolean;
  dbError?: boolean;
};

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me(),
    queryFn: () => apiFetch<MeResponse>("/api/me"),
    staleTime: 60_000,
  });
}
