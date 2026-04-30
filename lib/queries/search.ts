"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useSuspenseInfiniteQuery } from "@suspensive/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { VideoPortfolioItem } from "./artist";

export const SEARCH_PAGE_SIZE = 8;

export type SearchArtist = {
  id: string;
  name: string;
  service: string[];
  region: string[];
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number;
  style_keywords?: string[];
  openchat_url?: string;
  portfolio_images?: string[];
  artist_type?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

export type SearchResponse = {
  ok: boolean;
  artists: SearchArtist[];
  total: number;
  hasMore: boolean;
  source: string;
};

export type SearchParams = {
  date: string;
  region?: string;
  price?: string;
  services?: string[];
  seed?: string;
};

export function useSearchArtists(
  params: SearchParams | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = Boolean(options.enabled ?? (params && params.date));
  return useInfiniteQuery({
    queryKey: queryKeys.search(params ?? { date: "" }),
    queryFn: ({ pageParam = 0 }) =>
      apiFetch<SearchResponse>("/api/search", {
        query: {
          date: params?.date,
          region: params?.region,
          price: params?.price,
          service: params?.services,
          seed: params?.seed,
          limit: SEARCH_PAGE_SIZE,
          offset: pageParam as number,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * SEARCH_PAGE_SIZE : undefined,
    enabled,
    staleTime: 60_000,
  });
}

// Suspense 버전 — enabled 없음. 조건부 렌더링으로 제어.
export function useSearchArtistsSuspense(params: SearchParams) {
  return useSuspenseInfiniteQuery({
    queryKey: queryKeys.search(params),
    queryFn: ({ pageParam = 0 }) =>
      apiFetch<SearchResponse>("/api/search", {
        query: {
          date: params.date,
          region: params.region,
          price: params.price,
          service: params.services,
          seed: params.seed,
          limit: SEARCH_PAGE_SIZE,
          offset: pageParam as number,
        },
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.length * SEARCH_PAGE_SIZE : undefined,
    staleTime: 60_000,
  });
}
