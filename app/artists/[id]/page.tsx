"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ArtistDetail = {
  id: string;
  name: string;
  email: string;
  service: string[] | string;
  region: string[] | string;
  price: string;
  portfolio?: string;
  image?: string;
  rating?: number | null;
  keywords?: string[];
  성향키워드?: string[] | string;
  openchat_url?: string;
  portfolio_images?: string[] | string;
  artist_type?: string;
  video_link_1?: string;
  video_link_2?: string;
  video_link_3?: string;
  video_link_4?: string;
  video_links?: string[];
  video_thumbnail?: string;
};

function normalizeArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();

        if (
          item &&
          typeof item === "object" &&
          "url" in item &&
          typeof (item as { url?: unknown }).url === "string"
        ) {
          return (item as { url: string }).url.trim();
        }

        if (
          item &&
          typeof item === "object" &&
          "secure_url" in item &&
          typeof (item as { secure_url?: unknown }).secure_url === "string"
        ) {
          return (item as { secure_url: string }).secure_url.trim();
        }

        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function joinLabel(value: string[] | string | undefined) {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}

function normalizeExternalUrl(url: string) {
  const value = (url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function getVideoLinks(artist: ArtistDetail | null): string[] {
  if (!artist) return [];

  const direct = normalizeArray(artist.video_links);
  if (direct.length > 0) return direct;

  return [
    artist.video_link_1,
    artist.video_link_2,
    artist.video_link_3,
    artist.video_link_4,
  ]
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function isVideoArtist(artist: ArtistDetail | null) {
  if (!artist) return false;

  const serviceText = joinLabel(artist.service);
  const artistType = String(artist.artist_type || "");

  return (
    serviceText.includes("영상촬영") ||
    artistType.includes("영상") ||
    getVideoLinks(artist).length > 0
  );
}

export default function ArtistDetailPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = String(params?.id || "");

  const [artist, setArtist] = useState<ArtistDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function fetchArtist() {
      try {
        setLoading(true);

        const response = await fetch(`/api/artists/${encodeURIComponent(artistId)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`작가 상세 조회 실패: ${response.status}`);
        }

        const data = await response.json();

        if (!mounted) return;

        setArtist({
          ...data,
          id: String(data.id ?? artistId),
          service: normalizeArray(data.service),
          region: normalizeArray(data.region),
          keywords:
            normalizeArray(data.keywords).length > 0
              ? normalizeArray(data.keywords)
              : normalizeArray(data["성향키워드"]),
          성향키워드:
            normalizeArray(data.keywords).length > 0
              ? normalizeArray(data.keywords)
              : normalizeArray(data["성향키워드"]),
          portfolio_images: data.portfolio_images || "",
          video_links: getVideoLinks(data),
          video_thumbnail: data.video_thumbnail || "",
        });
      } catch (error) {
        console.error(error);
        if (mounted) setArtist(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    if (artistId) {
      fetchArtist();
    }

    return () => {
      mounted = false;
    };
  }, [artistId]);

  const videoArtist = useMemo(() => isVideoArtist(artist), [artist]);
  const videoLinks = useMemo(() => getVideoLinks(artist), [artist]);
  const portfolioImages = useMemo(() => {
    if (!artist?.portfolio_images) return [];
    return normalizeArray(artist.portfolio_images);
  }, [artist]);

  const heroImage = useMemo(() => {
    if (!artist) return "";
    if (videoArtist) return artist.video_thumbnail || artist.image || "";
    return artist.image || "";
  }, [artist, videoArtist]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f8f5fb] flex items-center justify-center text-[#272246]">
        로딩 중...
      </main>
    );
  }

  if (!artist) {
    return (
      <main className="min-h-screen bg-[#f8f5fb] flex flex-col items-center justify-center text-[#272246]">
        <p>작가 정보를 불러오지 못했어.</p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-4 rounded-[14px] bg-[#6d46f6] px-5 py-3 text-white"
        >
          검색페이지로 이동
        </button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8f5fb] px-5 py-8 text-[#25213d] md:px-8">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            홈으로
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-[14px] border border-[#e6ddf2] bg-white px-5 py-3 text-[14px] font-semibold text-[#5f587a]"
          >
            뒤로가기
          </button>
        </div>

        <section className="overflow-hidden rounded-[32px] border border-[#ece4f4] bg-white shadow-[0_18px_44px_rgba(80,60,120,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="min-h-[420px] bg-[#f2ebfb]">
              {!heroImage || imageError ? (
                <div className="flex min-h-[420px] items-center justify-center text-[24px] font-bold text-[#6f6886]">
                  {videoArtist ? "대표 썸네일 준비중" : "대표 이미지 준비중"}
                </div>
              ) : (
                <img
                  src={heroImage}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                  onError={() => setImageError(true)}
                />
              )}
            </div>

            <div className="p-6 md:p-8">
              <p className="inline-flex rounded-full bg-[#f3ecff] px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
                DAYPIC ARTIST
              </p>

              <h1 className="mt-4 text-[34px] font-black tracking-[-0.05em] text-[#272246]">
                {artist.name || "업체명 준비중"}
              </h1>

              <div className="mt-6 grid gap-3">
                <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                  <p className="text-[12px] font-semibold text-[#8f84a8]">촬영 서비스</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                    {joinLabel(artist.service)}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                  <p className="text-[12px] font-semibold text-[#8f84a8]">촬영 지역</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                    {joinLabel(artist.region)}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                  <p className="text-[12px] font-semibold text-[#8f84a8]">예산</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                    {artist.price}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                  <p className="text-[12px] font-semibold text-[#8f84a8]">평점</p>
                  <p className="mt-1 text-[16px] font-semibold text-[#312b4b]">
                    ★ {(artist.rating ?? 4.8).toFixed(1)}
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <p className="text-[13px] font-semibold text-[#8f84a8]">작가 키워드</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {normalizeArray(artist.keywords).map((keyword) => (
                    <span
                      key={keyword}
                      className="inline-flex items-center rounded-full bg-[#f2ebff] px-3 py-1.5 text-[12px] font-medium text-[#6d46f6]"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#f3effb] text-[14px] font-semibold text-[#5b47c8]"
                >
                  다른 작가 더 보기
                </button>

                {videoArtist ? (
                  videoLinks.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          normalizeExternalUrl(videoLinks[0]),
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                      className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                    >
                      영상 포트폴리오 보기
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#ece8f6] text-[14px] font-semibold text-[#9a93b1]"
                    >
                      영상 준비중
                    </button>
                  )
                ) : artist.portfolio ? (
                  <a
                    href={normalizeExternalUrl(artist.portfolio)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                  >
                    포트폴리오 더보기
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex h-12 items-center justify-center rounded-[16px] bg-[#ece8f6] text-[14px] font-semibold text-[#9a93b1]"
                  >
                    포트폴리오 준비중
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
          {videoArtist ? (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
                    영상 포트폴리오
                  </h2>
                  <p className="mt-1 text-[13px] text-[#7d7396]">
                    실제 촬영 영상을 확인해보세요
                  </p>
                </div>

                <div className="rounded-full bg-[#f3ecff] px-4 py-2 text-[12px] font-semibold text-[#6d46f6]">
                  총 {videoLinks.length}개
                </div>
              </div>

              {videoLinks.length > 0 ? (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  {videoLinks.map((videoUrl, index) => (
                    <div
                      key={`${videoUrl}-${index}`}
                      className="group relative overflow-hidden rounded-[22px] border border-[#ebe4f4] bg-white transition-all duration-200 hover:shadow-lg"
                    >
                      <div className="relative aspect-[16/10] bg-[#f5f3fb]">
                        {artist.video_thumbnail ? (
                          <img
                            src={artist.video_thumbnail}
                            alt={`샘플 영상 ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[32px]">
                            🎬
                          </div>
                        )}

                        <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/30" />

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              normalizeExternalUrl(videoUrl),
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                        >
                          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[20px] shadow-lg">
                            ▶
                          </div>
                        </button>
                      </div>

                      <div className="p-4">
                        <p className="text-[16px] font-bold text-[#2f2a49]">
                          샘플 영상 {index + 1}
                        </p>

                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              normalizeExternalUrl(videoUrl),
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                          className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-[12px] bg-[#6d46f6] text-[14px] font-semibold text-white"
                        >
                          영상 보기
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#ddd2ef] bg-[#faf7ff] px-6 py-14 text-center text-[14px] text-[#837b9c]">
                  아직 등록된 영상 포트폴리오가 없어요.
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-[28px] font-black tracking-[-0.04em] text-[#272246]">
                    포트폴리오
                  </h2>
                  <p className="mt-1 text-[13px] text-[#7d7396]">
                    작가의 분위기와 촬영 스타일을 확인해보세요
                  </p>
                </div>
                <div className="rounded-full bg-[#f3ecff] px-4 py-2 text-[12px] font-semibold text-[#6d46f6]">
                  총 {portfolioImages.length}장
                </div>
              </div>

              {portfolioImages.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                  {portfolioImages.map((imageUrl, index) => (
                    <div
                      key={`${imageUrl}-${index}`}
                      className="overflow-hidden rounded-[20px] border border-[#ebe4f4] bg-[#faf7ff]"
                    >
                      <img
                        src={imageUrl}
                        alt={`${artist.name} 포트폴리오 ${index + 1}`}
                        className="h-44 w-full object-cover md:h-56"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-[#ddd2ef] bg-[#faf7ff] px-6 py-14 text-center text-[14px] text-[#837b9c]">
                  아직 등록된 포트폴리오 사진이 없어요.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}