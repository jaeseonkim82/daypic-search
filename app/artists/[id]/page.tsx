"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useArtistDetail } from "@/lib/queries/artist";
import { normalizeArray } from "@/lib/normalize";
import {
  type ArtistDetail,
  type SavedArtist,
  RECENT_STORAGE_KEY,
  FAVORITE_STORAGE_KEY,
  FALLBACK_IMAGE,
  parseStorage,
  writeStorage,
  buildSavedArtist,
  getVideoItems,
  getVideoLinks,
  isVideoArtist,
  normalizeExternalUrl,
} from "./_lib/utils";
import ArtistSidebar from "./_components/ArtistSidebar";
import ArtistHero from "./_components/ArtistHero";
import ArtistPortfolio from "./_components/ArtistPortfolio";
import ArtistLightbox from "./_components/ArtistLightbox";

export default function ArtistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = String(params?.id || "");

  const {
    data: rawArtist,
    isLoading: loading,
  } = useArtistDetail(artistId || null);

  const artist = useMemo<ArtistDetail | null>(() => {
    if (!rawArtist) return null;
    return {
      ...rawArtist,
      id: String(rawArtist.id ?? artistId),
      service: normalizeArray(rawArtist.service),
      region: normalizeArray(rawArtist.region),
      style_keywords: normalizeArray(rawArtist.style_keywords),
      portfolio_images: rawArtist.portfolio_images || "",
      video_portfolio_items: Array.isArray(rawArtist.video_portfolio_items)
        ? rawArtist.video_portfolio_items
        : [],
      open_chat_url: rawArtist.open_chat_url || "",
      portfolio:
        typeof rawArtist.portfolio === "string" ? rawArtist.portfolio : "",
    } as ArtistDetail;
  }, [rawArtist, artistId]);

  const [imageError, setImageError] = useState(false);
  const [recentArtists, setRecentArtists] = useState<SavedArtist[]>([]);
  const [favoriteArtists, setFavoriteArtists] = useState<SavedArtist[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setRecentArtists(parseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []));
    setFavoriteArtists(parseStorage<SavedArtist[]>(FAVORITE_STORAGE_KEY, []));
  }, []);

  useEffect(() => {
    if (!artist || typeof window === "undefined") return;

    const saved = buildSavedArtist(artist);
    const currentRecent = parseStorage<SavedArtist[]>(RECENT_STORAGE_KEY, []);
    const nextRecent = [
      saved,
      ...currentRecent.filter((item) => item.id !== saved.id),
    ].slice(0, 10);

    setRecentArtists(nextRecent);
    writeStorage(RECENT_STORAGE_KEY, nextRecent);
  }, [artist]);

  const videoArtist = useMemo(() => isVideoArtist(artist), [artist]);
  const videoLinks = useMemo(() => getVideoLinks(artist), [artist]);

  const videoThumbs = useMemo(() => {
    return getVideoItems(artist).map((item) => (item.thumb || "").trim());
  }, [artist]);

  const portfolioImages = useMemo(() => {
    if (!artist?.portfolio_images) return [];
    return normalizeArray(artist.portfolio_images);
  }, [artist]);

  const heroImage = useMemo(() => {
    if (!artist) return "";
    if (videoArtist) {
      const firstThumb =
        getVideoItems(artist).find((item) => item.thumb)?.thumb || "";
      if (firstThumb) return firstThumb;
    }
    if (artist.image) return artist.image;
    const portfolioFallback = normalizeArray(artist.portfolio_images)[0] || "";
    if (portfolioFallback) return portfolioFallback;
    return FALLBACK_IMAGE;
  }, [artist, videoArtist]);

  const isFavorite = useMemo(() => {
    if (!artist) return false;
    return favoriteArtists.some((item) => item.id === String(artist.id));
  }, [artist, favoriteArtists]);

  function toggleFavorite() {
    if (!artist || typeof window === "undefined") return;
    const saved = buildSavedArtist(artist);
    const exists = favoriteArtists.some((item) => item.id === saved.id);

    if (exists) {
      const nextFavorites = favoriteArtists.filter((item) => item.id !== saved.id);
      setFavoriteArtists(nextFavorites);
      writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
      return;
    }

    const nextFavorites = [saved, ...favoriteArtists].slice(0, 30);
    setFavoriteArtists(nextFavorites);
    writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function removeFavorite(artistIdToRemove: string) {
    const nextFavorites = favoriteArtists.filter(
      (item) => item.id !== artistIdToRemove
    );
    setFavoriteArtists(nextFavorites);
    writeStorage(FAVORITE_STORAGE_KEY, nextFavorites);
  }

  function openLightbox(index: number) {
    setLightboxIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function goPrevImage() {
    setLightboxIndex((prev) =>
      prev === 0 ? portfolioImages.length - 1 : prev - 1
    );
  }

  function goNextImage() {
    setLightboxIndex((prev) =>
      prev === portfolioImages.length - 1 ? 0 : prev + 1
    );
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8f5fb] text-[#272246]">
        로딩 중...
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8f5fb] text-[#272246]">
        <p>작가 정보를 불러오지 못했어.</p>
        <Link
          href="/"
          className="mt-4 rounded-[14px] bg-[#6d46f6] px-5 py-3 text-white"
        >
          검색페이지로 이동
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5fb] px-5 py-8 pb-24 text-[#25213d] md:px-8 md:pb-8">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            홈으로
          </Link>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            뒤로가기
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          <ArtistSidebar
            recentArtists={recentArtists}
            favoriteArtists={favoriteArtists}
            onRemoveFavorite={removeFavorite}
          />

          <div>
            <ArtistHero
              artist={artist}
              heroImage={heroImage}
              imageError={imageError}
              onImageError={() => setImageError(true)}
              isFavorite={isFavorite}
              onToggleFavorite={toggleFavorite}
              videoArtist={videoArtist}
              videoLinks={videoLinks}
            />

            <ArtistPortfolio
              artistName={artist.name}
              portfolioImages={portfolioImages}
              videoArtist={videoArtist}
              videoLinks={videoLinks}
              videoThumbs={videoThumbs}
              onOpenLightbox={openLightbox}
            />
          </div>
        </div>
      </div>

      {artist.open_chat_url && artist.open_chat_url.trim() !== "" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e9dff7] bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(60,50,100,0.10)] backdrop-blur md:hidden">
          <a
            href={normalizeExternalUrl(artist.open_chat_url)}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-[16px] bg-[#6d46f6] text-[15px] font-bold text-white"
          >
            카카오톡으로 문의하기
          </a>
        </div>
      )}

      <ArtistLightbox
        open={lightboxOpen}
        images={portfolioImages}
        artistName={artist.name}
        currentIndex={lightboxIndex}
        onClose={closeLightbox}
        onPrev={goPrevImage}
        onNext={goNextImage}
      />
    </main>
  );
}
