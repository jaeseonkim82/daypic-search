"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

export type ArtistDetail = {
  id: string;
  artist_id: string;
  name: string;
  service: string[];
  region: string[];
  price: string;
  portfolio: string;
  image: string;
  rating: number | null;
  style_keywords: string[];
  open_chat_url: string;
  artist_type: string;
  portfolio_images: string[];
  video_portfolio_items: VideoPortfolioItem[];
  updated_at: string | null;
  // owner 세션일 때만 (비소유자는 undefined)
  user_id?: string;
  kakao_id?: string;
  email?: string;
  phone?: string;
};

export function useArtistDetail(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.artist.detail(String(id ?? "")),
    queryFn: () =>
      apiFetch<ArtistDetail>(`/api/artists/${encodeURIComponent(String(id))}`),
    enabled: Boolean(id),
  });
}

type ArtistPatchBody = {
  phone?: string;
  price?: string;
  service?: string[];
  region?: string[];
  style_keywords?: string[];
  expected_updated_at?: string;
};

type ArtistPatchResponse = {
  ok: boolean;
  message: string;
  artist: ArtistDetail;
  current_updated_at?: string;
};

export function useUpdateArtist(id: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ArtistPatchBody) =>
      apiFetch<ArtistPatchResponse>(
        `/api/artists/${encodeURIComponent(String(id))}`,
        { method: "PATCH", body },
      ),
    onSuccess: (data) => {
      if (data.artist) {
        qc.setQueryData(
          queryKeys.artist.detail(String(id)),
          data.artist,
        );
      }
    },
  });
}

type VideoPortfolioPatchBody = {
  items: Array<{ position: number; link: string; thumb: string }>;
  style_tags: string[];
};

type VideoPortfolioPatchResponse = {
  ok: boolean;
  message: string;
  recordId: string;
};

export function useUpdateVideoPortfolio(id: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VideoPortfolioPatchBody) =>
      apiFetch<VideoPortfolioPatchResponse>(
        `/api/artists/${encodeURIComponent(String(id))}/video-portfolio`,
        { method: "PATCH", body },
      ),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.artist.detail(String(id)),
      });
    },
  });
}
