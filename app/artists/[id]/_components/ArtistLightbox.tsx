"use client";

import { useEffect } from "react";

type Props = {
  open: boolean;
  images: string[];
  artistName: string;
  currentIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

export default function ArtistLightbox({
  open,
  images,
  artistName,
  currentIndex,
  onClose,
  onPrev,
  onNext,
}: Props) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrev();
      if (event.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, onPrev, onNext]);

  if (!open || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/88 backdrop-blur-sm">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[120] flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-[24px] text-white transition hover:bg-white/20"
        aria-label="닫기"
      >
        ✕
      </button>

      <div
        className="flex h-full w-full items-center justify-center px-4 py-14"
        onClick={onClose}
      >
        <div
          className="relative w-full max-w-[1200px] overflow-hidden rounded-[20px]"
          onClick={(e) => e.stopPropagation()}
        >
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={onPrev}
                className="absolute left-3 top-1/2 z-[150] flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-[38px] font-light text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition hover:scale-110 hover:bg-black/75 md:left-4 md:h-20 md:w-20 md:text-[44px]"
                aria-label="이전 이미지"
              >
                ‹
              </button>

              <button
                type="button"
                onClick={onNext}
                className="absolute right-3 top-1/2 z-[150] flex h-16 w-16 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-[38px] font-light text-white shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition hover:scale-110 hover:bg-black/75 md:right-4 md:h-20 md:w-20 md:text-[44px]"
                aria-label="다음 이미지"
              >
                ›
              </button>
            </>
          )}

          <div
            className="flex transition-transform duration-500 ease-out"
            style={{
              width: `${images.length * 100}%`,
              transform: `translateX(-${currentIndex * (100 / images.length)}%)`,
            }}
          >
            {images.map((imageUrl, index) => (
              <div
                key={`${imageUrl}-${index}`}
                className="flex w-full shrink-0 items-center justify-center"
                style={{ width: `${100 / images.length}%` }}
              >
                <img
                  src={imageUrl}
                  alt={`${artistName} 포트폴리오 확대 ${index + 1}`}
                  className="max-h-[82vh] w-auto max-w-full rounded-[20px] object-contain shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-white/10 px-4 py-2 text-[13px] font-semibold text-white">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
