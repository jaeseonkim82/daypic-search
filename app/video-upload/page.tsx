"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

type MeResponse = {
  ok?: boolean;
  isLoggedIn: boolean;
  isArtist?: boolean;
  artistId?: string | null;
  artistCode?: string | null;
  kakaoId?: string | null;
  email?: string | null;
  name?: string | null;
};

type VideoPortfolioItem = {
  position: number;
  link: string;
  thumb: string;
  style_tags: string[];
};

type ArtistDetailResponse = {
  id: string;
  email?: string;
  name?: string;
  video_portfolio_items?: VideoPortfolioItem[];
};

type VideoPortfolioSaveResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
};

type CloudinarySignResponse = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
  error?: string;
};

const MAX_THUMBNAIL_SIZE = 10 * 1024 * 1024;

function normalizeTagArray(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function findItem(
  items: VideoPortfolioItem[] | undefined,
  position: number,
): VideoPortfolioItem | undefined {
  return items?.find((item) => item.position === position);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function ThumbnailUploader({
  title,
  existingUrl,
  previewUrl,
  selectedFileName,
  inputRef,
  onChange,
  disabled,
}: {
  title: string;
  existingUrl: string;
  previewUrl: string;
  selectedFileName: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-[#ebe4f5] bg-[#faf7ff] p-5">
      <div className="mb-3 text-[15px] font-bold text-[#4a3c7d]">{title}</div>

      {existingUrl ? (
        <div className="mb-4">
          <p className="mb-2 text-[13px] font-medium text-[#6e6786]">
            현재 저장된 썸네일
          </p>
          <img
            src={existingUrl}
            alt={`${title}-existing`}
            className="h-auto w-full max-w-[260px] rounded-[16px] border border-[#ebe4f5] object-cover"
          />
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onChange}
        disabled={disabled}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={`inline-flex h-[44px] min-w-[160px] items-center justify-center rounded-[14px] px-4 text-[14px] font-bold text-white transition ${
          disabled
            ? "cursor-not-allowed bg-[#c4b7f1]"
            : "bg-[#6948f5] hover:bg-[#5636df]"
        }`}
      >
        {existingUrl ? "썸네일 변경하기" : "썸네일 선택하기"}
      </button>

      <p className="mt-3 text-[13px] text-[#6f6888]">
        {selectedFileName || "아직 선택된 새 썸네일이 없습니다."}
      </p>

      <p className="mt-1 text-[12px] text-[#9a91b8]">
        JPG, PNG 등 이미지 파일 / 최대 10MB
      </p>

      {previewUrl ? (
        <div className="mt-4">
          <p className="mb-2 text-[13px] font-medium text-[#6e6786]">
            새 썸네일 미리보기
          </p>
          <img
            src={previewUrl}
            alt={`${title}-preview`}
            className="h-auto w-full max-w-[260px] rounded-[16px] border border-[#ebe4f5] object-cover"
          />
        </div>
      ) : null}
    </div>
  );
}

export default function VideoUploadPage() {
  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");
  const [artistEmail, setArtistEmail] = useState("");

  const [videoLink1, setVideoLink1] = useState("");
  const [videoLink2, setVideoLink2] = useState("");
  const [videoLink3, setVideoLink3] = useState("");
  const [videoLink4, setVideoLink4] = useState("");
  const [videoStyleTags, setVideoStyleTags] = useState("");

  const [thumbFile1, setThumbFile1] = useState<File | null>(null);
  const [thumbFile2, setThumbFile2] = useState<File | null>(null);
  const [thumbFile3, setThumbFile3] = useState<File | null>(null);
  const [thumbFile4, setThumbFile4] = useState<File | null>(null);

  const [existingThumbUrl1, setExistingThumbUrl1] = useState("");
  const [existingThumbUrl2, setExistingThumbUrl2] = useState("");
  const [existingThumbUrl3, setExistingThumbUrl3] = useState("");
  const [existingThumbUrl4, setExistingThumbUrl4] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isLoadingExistingData, setIsLoadingExistingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const thumbInputRef1 = useRef<HTMLInputElement | null>(null);
  const thumbInputRef2 = useRef<HTMLInputElement | null>(null);
  const thumbInputRef3 = useRef<HTMLInputElement | null>(null);
  const thumbInputRef4 = useRef<HTMLInputElement | null>(null);

  const thumbPreviewUrl1 = useMemo(() => {
    if (!thumbFile1) return "";
    return URL.createObjectURL(thumbFile1);
  }, [thumbFile1]);

  const thumbPreviewUrl2 = useMemo(() => {
    if (!thumbFile2) return "";
    return URL.createObjectURL(thumbFile2);
  }, [thumbFile2]);

  const thumbPreviewUrl3 = useMemo(() => {
    if (!thumbFile3) return "";
    return URL.createObjectURL(thumbFile3);
  }, [thumbFile3]);

  const thumbPreviewUrl4 = useMemo(() => {
    if (!thumbFile4) return "";
    return URL.createObjectURL(thumbFile4);
  }, [thumbFile4]);

  useEffect(() => {
    return () => {
      if (thumbPreviewUrl1) URL.revokeObjectURL(thumbPreviewUrl1);
      if (thumbPreviewUrl2) URL.revokeObjectURL(thumbPreviewUrl2);
      if (thumbPreviewUrl3) URL.revokeObjectURL(thumbPreviewUrl3);
      if (thumbPreviewUrl4) URL.revokeObjectURL(thumbPreviewUrl4);
    };
  }, [thumbPreviewUrl1, thumbPreviewUrl2, thumbPreviewUrl3, thumbPreviewUrl4]);

  useEffect(() => {
    let ignore = false;

    async function loadSessionAndArtist() {
      try {
        setIsCheckingSession(true);
        setIsLoadingExistingData(true);
        setError("");
        setMessage("");

        const meRes = await fetch("/api/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const meData: MeResponse = await meRes.json();

        if (!meRes.ok || !meData.isLoggedIn) {
          window.location.href = "/login";
          return;
        }

        if (!meData.isArtist || !meData.artistId) {
          window.location.href = "/artist-register";
          return;
        }

        const currentArtistId = String(meData.artistId);

        if (!ignore) {
          setArtistId(currentArtistId);
          setArtistName(meData.name || "");
          setArtistEmail(meData.email || "");
        }

        const artistRes = await fetch(`/api/artists/${currentArtistId}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const artistData: ArtistDetailResponse = await artistRes.json();

        if (!artistRes.ok) {
          throw new Error("기존 영상 포트폴리오 정보를 불러오지 못했습니다.");
        }

        if (!ignore) {
          const items = artistData.video_portfolio_items ?? [];
          const item1 = findItem(items, 1);
          const item2 = findItem(items, 2);
          const item3 = findItem(items, 3);
          const item4 = findItem(items, 4);

          setArtistName(artistData.name || meData.name || "");
          setArtistEmail(artistData.email || meData.email || "");
          setVideoLink1(item1?.link || "");
          setVideoLink2(item2?.link || "");
          setVideoLink3(item3?.link || "");
          setVideoLink4(item4?.link || "");
          setExistingThumbUrl1(item1?.thumb || "");
          setExistingThumbUrl2(item2?.thumb || "");
          setExistingThumbUrl3(item3?.thumb || "");
          setExistingThumbUrl4(item4?.thumb || "");
          const firstTags =
            items.find((it) => it.style_tags && it.style_tags.length > 0)
              ?.style_tags ?? [];
          setVideoStyleTags(firstTags.join(", "));
        }
      } catch (err) {
        console.error(err);
        if (!ignore) {
          setError(
            err instanceof Error
              ? err.message
              : "영상 포트폴리오 정보를 불러오는 중 오류가 발생했습니다."
          );
        }
      } finally {
        if (!ignore) {
          setIsCheckingSession(false);
          setIsLoadingExistingData(false);
        }
      }
    }

    loadSessionAndArtist();

    return () => {
      ignore = true;
    };
  }, []);

  const makeThumbnailChangeHandler =
    (setter: React.Dispatch<React.SetStateAction<File | null>>) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;

      if (!file) {
        setter(null);
        return;
      }

      if (file.size > MAX_THUMBNAIL_SIZE) {
        setError(
          `썸네일 이미지 용량이 너무 큽니다. 최대 10MB까지 가능합니다. (${file.name}: ${formatBytes(
            file.size
          )})`
        );
        setter(null);
        return;
      }

      setError("");
      setMessage("");
      setter(file);
    };

  const handleThumbnailChange1 = makeThumbnailChangeHandler(setThumbFile1);
  const handleThumbnailChange2 = makeThumbnailChangeHandler(setThumbFile2);
  const handleThumbnailChange3 = makeThumbnailChangeHandler(setThumbFile3);
  const handleThumbnailChange4 = makeThumbnailChangeHandler(setThumbFile4);

  const uploadThumbnailToCloudinary = async (file: File) => {
    const signRes = await fetch("/api/cloudinary/sign", {
      method: "POST",
    });

    const signData: CloudinarySignResponse = await signRes.json();

    if (!signRes.ok) {
      throw new Error(signData?.error || "Cloudinary 서명 요청에 실패했습니다.");
    }

    const { cloudName, apiKey, timestamp, folder, signature } = signData;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("folder", folder);
    formData.append("signature", signature);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      throw new Error(
        uploadData?.error?.message || "Cloudinary 썸네일 업로드에 실패했습니다."
      );
    }

    return uploadData.secure_url as string;
  };

  const uploadOptionalThumbnail = async (
    file: File | null,
    existingUrl: string,
    label: string
  ) => {
    if (!file) return existingUrl;

    setMessage(`${label} 업로드 중...`);
    return await uploadThumbnailToCloudinary(file);
  };

  const handleSave = async () => {
    if (!artistId) {
      setError("작가 정보를 아직 찾지 못했습니다.");
      return;
    }

    const hasAtLeastOneVideo =
      videoLink1.trim() ||
      videoLink2.trim() ||
      videoLink3.trim() ||
      videoLink4.trim();

    if (!hasAtLeastOneVideo) {
      setError("영상 링크를 최소 1개 이상 입력해 주세요.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setMessage("저장을 준비하고 있습니다...");

      const thumbUrl1 = await uploadOptionalThumbnail(
        thumbFile1,
        existingThumbUrl1,
        "영상 1 썸네일"
      );
      const thumbUrl2 = await uploadOptionalThumbnail(
        thumbFile2,
        existingThumbUrl2,
        "영상 2 썸네일"
      );
      const thumbUrl3 = await uploadOptionalThumbnail(
        thumbFile3,
        existingThumbUrl3,
        "영상 3 썸네일"
      );
      const thumbUrl4 = await uploadOptionalThumbnail(
        thumbFile4,
        existingThumbUrl4,
        "영상 4 썸네일"
      );

      setMessage("영상 포트폴리오를 저장하고 있습니다...");

      const items = [
        { position: 1, link: videoLink1.trim(), thumb: thumbUrl1 },
        { position: 2, link: videoLink2.trim(), thumb: thumbUrl2 },
        { position: 3, link: videoLink3.trim(), thumb: thumbUrl3 },
        { position: 4, link: videoLink4.trim(), thumb: thumbUrl4 },
      ];
      const style_tags = videoStyleTags
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const res = await fetch(`/api/artists/${artistId}/video-portfolio`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ items, style_tags }),
      });

      const data: VideoPortfolioSaveResponse = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || "영상 포트폴리오 저장에 실패했습니다.");
      }

      setExistingThumbUrl1(thumbUrl1);
      setExistingThumbUrl2(thumbUrl2);
      setExistingThumbUrl3(thumbUrl3);
      setExistingThumbUrl4(thumbUrl4);

      setThumbFile1(null);
      setThumbFile2(null);
      setThumbFile3(null);
      setThumbFile4(null);

      setMessage("영상 포트폴리오 저장이 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "영상 포트폴리오 저장 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsSaving(false);
    }
  };

  const isBusy = isCheckingSession || isLoadingExistingData || isSaving;

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[38px] border border-[#ece3f6] bg-[radial-gradient(circle_at_top_left,_rgba(144,110,255,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.12),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_40px_rgba(78,58,130,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-full border border-[#e7dbf7] bg-white px-4 py-2 text-[12px] font-semibold text-[#7a5cf6]">
                DAYPIC VIDEO GALLERY
              </div>

              <h1 className="mt-5 text-[34px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[52px]">
                영상 포트폴리오를
                <br />
                더 선명하게 보여주세요
              </h1>

              <p className="mt-5 max-w-[760px] text-[16px] leading-8 text-[#6f6888]">
                영상 링크와 링크별 썸네일은 고객이 작가님의 촬영 스타일과 분위기를 빠르게 이해하는 데 중요한 기준이 됩니다.
                정리된 영상 포트폴리오는 문의 연결에도 도움이 됩니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex rounded-full bg-[#f2ebff] px-4 py-2 text-[13px] font-semibold text-[#6d46f6]">
                  영상 링크 최대 4개
                </div>
                <div className="inline-flex rounded-full bg-[#f8eef8] px-4 py-2 text-[13px] font-semibold text-[#c0569f]">
                  링크별 썸네일 설정 가능
                </div>
                <div className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-[13px] font-semibold text-[#4a73d6]">
                  스타일 태그 저장 가능
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#eadff7] bg-white/88 p-6 shadow-[0_12px_28px_rgba(84,62,133,0.07)]">
              <div className="text-[12px] font-bold tracking-[0.14em] text-[#9b8dbf]">
                ARTIST STATUS
              </div>

              <h2 className="mt-3 text-[28px] font-black leading-[1.25] tracking-[-0.05em] text-[#2b2745]">
                현재 등록 상태를
                <br />
                확인해 주세요
              </h2>

              <div className="mt-5 space-y-3 text-[15px] leading-7 text-[#6e6786]">
                <div className="rounded-[18px] bg-[#f7f3ff] px-4 py-4">
                  <span className="font-bold text-[#4f3ccf]">작가명</span>
                  <div className="mt-1 text-[#2d2748]">
                    {isCheckingSession
                      ? "작가 정보를 확인하고 있습니다..."
                      : artistName || "작가 정보를 찾지 못했습니다."}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#fcf4f8] px-4 py-4">
                  <span className="font-bold text-[#b95d98]">등록된 영상 링크</span>
                  <div className="mt-1 text-[#2d2748]">
                    {[videoLink1, videoLink2, videoLink3, videoLink4].filter((item) => item.trim()).length}
                    개 입력됨
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#eef5ff] px-4 py-4">
                  <span className="font-bold text-[#5b7fda]">등록된 썸네일</span>
                  <div className="mt-1 text-[#2d2748]">
                    {[
                      existingThumbUrl1 || thumbPreviewUrl1,
                      existingThumbUrl2 || thumbPreviewUrl2,
                      existingThumbUrl3 || thumbPreviewUrl3,
                      existingThumbUrl4 || thumbPreviewUrl4,
                    ].filter(Boolean).length}
                    개 설정됨
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#f4ecff] px-4 py-4">
                  <span className="font-bold text-[#6846d7]">스타일 태그</span>
                  <div className="mt-1 text-[#2d2748]">
                    {videoStyleTags.trim()
                      ? "영상 스타일 태그가 입력되어 있습니다."
                      : "영상 스타일 태그가 아직 입력되지 않았습니다."}
                  </div>
                </div>

                {!!artistEmail && (
                  <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4">
                    <span className="font-bold text-[#7a5cf6]">이메일</span>
                    <div className="mt-1 text-[#2d2748]">{artistEmail}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {(message || error) && (
          <section className="mt-6">
            <div
              className={`rounded-[22px] border px-5 py-4 text-[15px] font-medium ${
                error
                  ? "border-red-200 bg-red-50 text-red-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          </section>
        )}

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <div>
              <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
                영상 링크 등록
              </h2>
              <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
                유튜브, 인스타 릴스, 비메오 등 고객에게 보여줄 영상 링크를 등록해 주세요.
              </p>
            </div>

            <div className="mt-6 grid gap-4">
              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 1
                </label>
                <input
                  type="text"
                  value={videoLink1}
                  onChange={(e) => setVideoLink1(e.target.value)}
                  placeholder="https://youtube.com/... 또는 https://www.instagram.com/reel/..."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 2
                </label>
                <input
                  type="text"
                  value={videoLink2}
                  onChange={(e) => setVideoLink2(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 3
                </label>
                <input
                  type="text"
                  value={videoLink3}
                  onChange={(e) => setVideoLink3(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 링크 4
                </label>
                <input
                  type="text"
                  value={videoLink4}
                  onChange={(e) => setVideoLink4(e.target.value)}
                  placeholder="추가 영상 링크를 입력해 주세요."
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
              </div>

              <div>
                <label className="mb-3 block text-[15px] font-bold text-[#4a3c7d]">
                  영상 스타일 태그
                </label>
                <input
                  type="text"
                  value={videoStyleTags}
                  onChange={(e) => setVideoStyleTags(e.target.value)}
                  placeholder="예: 감성적 연출, 다큐 스타일, 시네마틱"
                  disabled={isBusy}
                  className="h-14 w-full rounded-2xl border border-[#e7e1f5] bg-[#faf9fd] px-5 text-base text-[#32285d] outline-none transition focus:border-violet-500 disabled:cursor-not-allowed disabled:bg-[#f1eef8]"
                />
                <p className="mt-2 text-[13px] text-[#9a91b8]">
                  여러 개 입력할 경우 쉼표(,)로 구분해 주세요.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
              링크별 썸네일 등록
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
              각 영상 링크에 맞는 썸네일을 각각 등록하거나 변경해 주세요.
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ThumbnailUploader
                title="영상 1 썸네일"
                existingUrl={existingThumbUrl1}
                previewUrl={thumbPreviewUrl1}
                selectedFileName={thumbFile1 ? `선택된 파일: ${thumbFile1.name}` : ""}
                inputRef={thumbInputRef1}
                onChange={handleThumbnailChange1}
                disabled={isBusy}
              />

              <ThumbnailUploader
                title="영상 2 썸네일"
                existingUrl={existingThumbUrl2}
                previewUrl={thumbPreviewUrl2}
                selectedFileName={thumbFile2 ? `선택된 파일: ${thumbFile2.name}` : ""}
                inputRef={thumbInputRef2}
                onChange={handleThumbnailChange2}
                disabled={isBusy}
              />

              <ThumbnailUploader
                title="영상 3 썸네일"
                existingUrl={existingThumbUrl3}
                previewUrl={thumbPreviewUrl3}
                selectedFileName={thumbFile3 ? `선택된 파일: ${thumbFile3.name}` : ""}
                inputRef={thumbInputRef3}
                onChange={handleThumbnailChange3}
                disabled={isBusy}
              />

              <ThumbnailUploader
                title="영상 4 썸네일"
                existingUrl={existingThumbUrl4}
                previewUrl={thumbPreviewUrl4}
                selectedFileName={thumbFile4 ? `선택된 파일: ${thumbFile4.name}` : ""}
                inputRef={thumbInputRef4}
                onChange={handleThumbnailChange4}
                disabled={isBusy}
              />
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className={`mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-bold text-white transition ${
                isBusy
                  ? "cursor-not-allowed bg-[#c4b7f1]"
                  : "bg-gradient-to-r from-[#6b56f5] to-[#d35fae] hover:opacity-95"
              }`}
            >
              {isSaving ? "저장 중입니다..." : "영상 포트폴리오 저장"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)]">
          <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
            등록 전에 확인해 주세요
          </h3>
          <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
            영상 포트폴리오는 작가님의 촬영 리듬과 분위기를 가장 빠르게 전달하는 자료입니다.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">첫 링크가 중요합니다</span>
              가장 먼저 보일 영상은 작가님의 스타일을 잘 보여주는 대표 영상으로 선택해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">썸네일 통일감</span>
              각 영상 썸네일은 해당 영상 분위기와 잘 맞는 컷으로 선택해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">링크 품질 확인</span>
              고객이 바로 볼 수 있도록 공개 링크가 정상 작동하는지 꼭 확인해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">스타일 전달력</span>
              태그를 함께 정리해 두면 고객이 원하는 분위기와의 적합도를 더 빠르게 판단할 수 있습니다.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Link
              href="/artist-dashboard"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white"
            >
              대시보드 돌아가기
            </Link>
            <Link
              href="/artist-calendar"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white"
            >
              일정 관리
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}