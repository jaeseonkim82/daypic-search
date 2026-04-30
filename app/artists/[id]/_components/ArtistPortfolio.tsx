"use client";

import { normalizeExternalUrl } from "../_lib/utils";

type Props = {
  artistName: string;
  portfolioImages: string[];
  videoArtist: boolean;
  videoLinks: string[];
  videoThumbs: string[];
  onOpenLightbox: (index: number) => void;
};

export default function ArtistPortfolio({
  artistName,
  portfolioImages,
  videoArtist,
  videoLinks,
  videoThumbs,
  onOpenLightbox,
}: Props) {
  return (
    <>
      <section className="mt-6 rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
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
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                onClick={() => onOpenLightbox(index)}
                className="group overflow-hidden rounded-[20px] border border-[#ebe4f4] bg-[#faf7ff]"
              >
                <img
                  src={imageUrl}
                  alt={`${artistName} 포트폴리오 ${index + 1}`}
                  className="h-44 w-full object-cover transition duration-300 group-hover:scale-[1.04] md:h-56"
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-[20px] border border-dashed border-[#ddd2ef] bg-[#faf7ff] px-6 py-14 text-center text-[14px] text-[#837b9c]">
            아직 등록된 포트폴리오 사진이 없어요.
          </div>
        )}
      </section>

      {videoArtist && (
        <section className="mt-6 rounded-[32px] border border-[#ece4f4] bg-white p-5 shadow-[0_16px_40px_rgba(80,60,120,0.06)] md:p-6">
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
                    {videoThumbs[index] ? (
                      <img
                        src={videoThumbs[index]}
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
        </section>
      )}
    </>
  );
}
