"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { VideoPortfolioItem } from "./artist";

export type SearchArtist = {
  id: string;
  artist_id: string;
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
  source: string;
};

export type SearchParams = {
  date: string;
  region?: string;
  price?: string;
  services?: string[];
};

export function useSearchArtists(
  params: SearchParams | null,
  options: { enabled?: boolean } = {},
) {
  const enabled = Boolean(options.enabled ?? (params && params.date));
  return useQuery({
    queryKey: queryKeys.search(params ?? { date: "" }),
    queryFn: () =>
      apiFetch<SearchResponse>("/api/search", {
        query: {
          date: params?.date,
          region: params?.region,
          price: params?.price,
          service: params?.services,
        },
      }),
    enabled,
    staleTime: 60_000,
  });
}
