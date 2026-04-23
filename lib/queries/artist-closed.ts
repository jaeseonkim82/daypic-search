"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type ClosedRecord = {
  id: string;
  date: string;
  artist_id: string;
};

type ArtistClosedResponse = {
  ok: boolean;
  dates: string[];
  records: ClosedRecord[];
};

export function useArtistClosed(enabled = true) {
  return useQuery({
    queryKey: queryKeys.artistClosed(),
    queryFn: () => apiFetch<ArtistClosedResponse>("/api/artist-closed"),
    enabled,
  });
}

type AddClosedResponse = {
  ok: boolean;
  duplicated: boolean;
  message: string;
  date: string;
  record?: ClosedRecord;
};

export function useAddClosedDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      apiFetch<AddClosedResponse>("/api/artist-closed", {
        method: "POST",
        body: { date },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.artistClosed() });
    },
  });
}

type DeleteClosedResponse = {
  ok: boolean;
  message: string;
  date: string;
  already_deleted: boolean;
};

export function useDeleteClosedDate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      apiFetch<DeleteClosedResponse>("/api/artist-closed", {
        method: "DELETE",
        query: { date },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.artistClosed() });
    },
  });
}
