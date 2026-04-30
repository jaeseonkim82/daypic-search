"use client";

import Link from "next/link";
import { joinLabel } from "@/lib/normalize";
import { FALLBACK_IMAGE, type SavedArtist } from "../_lib/utils";

type Props = {
  recentArtists: SavedArtist[];
  favoriteArtists: SavedArtist[];
  onRemoveFavorite: (artistId: string) => void;
};

export default function ArtistSidebar({
  recentArtists,
  favoriteArtists,
  onRemoveFavorite,
}: Props) {
  return (
    <aside className="hidden lg:sticky lg:top-[104px] lg:block lg:self-start">
      <div className="space-y-4">
        <div className="rounded-[24px] border border-[#e8e0f3] bg-[#f7f3fb] p-4 shadow-[0_10px_26px_rgba(80,60,120,0.05)]">
          <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1e9ff] px-3 py-2">
            <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
              최근본작가
            </h3>
            <span className="text-[#6d46f6]">≡</span>
          </div>

          <div className="space-y-3">
            {recentArtists.length > 0 ? (
              recentArtists.map((recent) => (
                <Link
                  key={recent.id}
                  href={`/artists/${String(recent.id)}`}
                  className="flex w-full items-center gap-3 rounded-[16px] border border-[#ebe3f4] bg-white px-3 py-3 text-left"
                >
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f1ebf8]">
                    <img
                      src={recent.image || FALLBACK_IMAGE}
                      alt={recent.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-[#393453]">
                      {recent.name}
                    </p>
                    <p className="truncate text-[11px] text-[#7b7396]">
                      {joinLabel(recent.region)}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#ddd1ee] bg-white px-4 py-5 text-[12px] text-[#847b9d]">
                아직 최근 본 작가가 없어.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[24px] border border-[#e8e0f3] bg-[#f7f3fb] p-4 shadow-[0_10px_26px_rgba(80,60,120,0.05)]">
          <div className="mb-3 flex items-center justify-between rounded-[16px] bg-[#f1e9ff] px-3 py-2">
            <h3 className="text-[18px] font-bold tracking-[-0.03em] text-[#2b2745]">
              찜한 작가
            </h3>
            <span className="text-[#ff5c9a]">❤</span>
          </div>

          <div className="space-y-3">
            {favoriteArtists.length > 0 ? (
              favoriteArtists.map((favorite) => (
                <div
                  key={favorite.id}
                  className="flex items-center gap-3 rounded-[16px] border border-[#ebe3f4] bg-white px-3 py-3"
                >
                  <Link
                    href={`/artists/${String(favorite.id)}`}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="h-11 w-11 overflow-hidden rounded-full bg-[#f1ebf8]">
                      <img
                        src={favorite.image || FALLBACK_IMAGE}
                        alt={favorite.name}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-[#393453]">
                        {favorite.name}
                      </p>
                      <p className="truncate text-[11px] text-[#7b7396]">
                        {joinLabel(favorite.service)}
                      </p>
                    </div>
                  </Link>

                  <button
                    type="button"
                    onClick={() => onRemoveFavorite(favorite.id)}
                    className="text-[#ff5c9a]"
                    aria-label="찜 해제"
                  >
                    ❤
                  </button>
                </div>
              ))
            ) : (
              <div className="rounded-[16px] border border-dashed border-[#ddd1ee] bg-white px-4 py-5 text-[12px] text-[#847b9d]">
                아직 찜한 작가가 없어.
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
