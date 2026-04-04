"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

type ArtistLookupResponse = {
  success?: boolean;
  artist?: {
    id: string;
    email: string;
    name: string;
  };
  error?: string;
};

type ArtistDetailResponse = {
  id: string;
  email: string;
  name: string;
  image?: string;
  portfolio_images?: string[] | string;
};

type PortfolioSaveResponse = {
  success?: boolean;
  savedCount?: number;
  imageUrls?: string[];
  error?: string;
};

type RepresentativeImageSaveResponse = {
  success?: boolean;
  imageUrl?: string;
  error?: string;
};

const MAX_FILE_COUNT = 40;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ADMIN_INQUIRY_URL = "https://pf.kakao.com/_YOUR_CHANNEL_LINK";

const headerButtonClass =
  "inline-flex h-[44px] min-w-[116px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-colors duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white";

function ArtistUploadPageInner() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [artistId, setArtistId] = useState("");
  const [artistName, setArtistName] = useState("");

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [representativeImage, setRepresentativeImage] = useState("");

  const [files, setFiles] = useState<File[]>([]);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isFindingArtist, setIsFindingArtist] = useState(false);
  const [isLoadingExistingImages, setIsLoadingExistingImages] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingExistingImages, setIsSavingExistingImages] = useState(false);
  const [isUpdatingRepresentative, setIsUpdatingRepresentative] = useState(false);

  const replaceInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const previewUrls = useMemo(() => {
    return files.map((file) => URL.createObjectURL(file));
  }, [files]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  function normalizeImageArray(value: unknown): string[] {
    if (!value) return [];

    if (Array.isArray(value)) {
      return value
        .map((item) => {
          if (typeof item === "string") return item.trim();
          return "";
        })
        .filter(Boolean);
    }

    if (typeof value === "string") {
      return value
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    return [];
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  useEffect(() => {
    if (!email) {
      setError("이메일 정보가 없어 올바른 링크로 다시 접속해 주세요.");
      return;
    }

    const findArtist = async () => {
      try {
        setIsFindingArtist(true);
        setError("");
        setMessage("");

        const res = await fetch(
          `/api/artists/by-email?email=${encodeURIComponent(email)}`
        );
        const data: ArtistLookupResponse = await res.json();

        if (!res.ok || !data.artist) {
          throw new Error(data.error || "작가 정보를 찾지 못했습니다.");
        }

        setArtistId(data.artist.id);
        setArtistName(data.artist.name);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "작가 정보를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsFindingArtist(false);
      }
    };

    findArtist();
  }, [email]);

  useEffect(() => {
    if (!artistId) return;

    const loadExistingImages = async () => {
      try {
        setIsLoadingExistingImages(true);
        setError("");

        const res = await fetch(`/api/artists/${artistId}`, {
          method: "GET",
          cache: "no-store",
        });

        const data: ArtistDetailResponse = await res.json();

        if (!res.ok) {
          throw new Error("기존 포트폴리오 이미지를 불러오지 못했습니다.");
        }

        setExistingImages(normalizeImageArray(data.portfolio_images));
        setRepresentativeImage(
          typeof data.image === "string" ? data.image.trim() : ""
        );
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "기존 포트폴리오 이미지를 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setIsLoadingExistingImages(false);
      }
    };

    loadExistingImages();
  }, [artistId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) {
      setFiles([]);
      setError("");
      return;
    }

    if (selectedFiles.length > MAX_FILE_COUNT) {
      setError(`최대 ${MAX_FILE_COUNT}장까지만 업로드할 수 있습니다.`);
      setFiles([]);
      return;
    }

    if (existingImages.length + selectedFiles.length > MAX_FILE_COUNT) {
      setError(`기존 이미지 포함 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있습니다.`);
      setFiles([]);
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (oversizedFile) {
      setError(
        `파일 용량이 너무 큽니다. 1장당 최대 10MB까지 가능합니다. (${oversizedFile.name}: ${formatBytes(
          oversizedFile.size
        )})`
      );
      setFiles([]);
      return;
    }

    setError("");
    setMessage("");
    setFiles(selectedFiles);
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setError("");
    setMessage("");
  };

  const uploadSingleFileToCloudinary = async (file: File) => {
    const signRes = await fetch("/api/cloudinary/sign", {
      method: "POST",
    });

    const signData = await signRes.json();

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
        uploadData?.error?.message || "Cloudinary 업로드에 실패했습니다."
      );
    }

    return uploadData.secure_url as string;
  };

  const savePortfolioImages = async (nextImageUrls: string[]) => {
    if (!artistId) {
      throw new Error("작가 ID가 없습니다.");
    }

    const cleanedUrls = nextImageUrls
      .filter((url) => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);

    if (cleanedUrls.length > MAX_FILE_COUNT) {
      throw new Error(`포트폴리오 이미지는 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있습니다.`);
    }

    const saveRes = await fetch(`/api/artists/${artistId}/portfolio-images`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrls: cleanedUrls,
      }),
    });

    const saveData: PortfolioSaveResponse = await saveRes.json();

    if (!saveRes.ok || !saveData.success) {
      throw new Error(saveData.error || "포트폴리오 저장에 실패했습니다.");
    }

    return saveData.imageUrls ?? cleanedUrls;
  };

  const saveRepresentativeImage = async (imageUrl: string) => {
    if (!artistId) {
      throw new Error("작가 ID가 없습니다.");
    }

    const res = await fetch(`/api/artists/${artistId}/representative-image`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
      }),
    });

    const data: RepresentativeImageSaveResponse = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "대표이미지 저장에 실패했습니다.");
    }

    return data.imageUrl ?? imageUrl;
  };

  const handleUpload = async () => {
    if (!email) {
      setError("이메일 정보가 없습니다.");
      return;
    }

    if (!artistId) {
      setError("작가 정보를 아직 찾지 못했습니다.");
      return;
    }

    if (files.length === 0) {
      setError("먼저 업로드할 이미지를 선택해 주세요.");
      return;
    }

    if (existingImages.length + files.length > MAX_FILE_COUNT) {
      setError(`기존 이미지 포함 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있습니다.`);
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      setMessage("이미지를 업로드하고 있습니다...");

      const uploadedUrls: string[] = [];

      for (const file of files) {
        const url = await uploadSingleFileToCloudinary(file);
        uploadedUrls.push(url);
      }

      setMessage("업로드한 이미지를 저장하고 있습니다...");

      const mergedUrls = [...existingImages, ...uploadedUrls];
      const savedUrls = await savePortfolioImages(mergedUrls);

      setExistingImages(savedUrls);
      setFiles([]);
      setMessage(`업로드가 완료되었습니다. 총 ${savedUrls.length}장이 저장되었습니다.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "업로드 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteExistingImage = async (index: number) => {
    try {
      setIsSavingExistingImages(true);
      setError("");
      setMessage("기존 이미지를 삭제하고 있습니다...");

      const targetUrl = existingImages[index];
      const nextImages = existingImages.filter((_, i) => i !== index);

      if (nextImages.length === 0) {
        setError(
          "마지막 1장을 삭제하려면 먼저 새 이미지를 올리거나, 0장 허용 API 수정이 필요합니다."
        );
        setMessage("");
        return;
      }

      const savedUrls = await savePortfolioImages(nextImages);
      setExistingImages(savedUrls);

      if (representativeImage && representativeImage === targetUrl) {
        const nextRepresentative = savedUrls[0] || "";
        if (nextRepresentative) {
          const savedRepresentative = await saveRepresentativeImage(
            nextRepresentative
          );
          setRepresentativeImage(savedRepresentative);
        } else {
          setRepresentativeImage("");
        }
      }

      setMessage("기존 포트폴리오 이미지 삭제가 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "기존 이미지 삭제 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsSavingExistingImages(false);
    }
  };

  const handleReplaceExistingImage = async (
    index: number,
    file: File | null
  ) => {
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      setError(
        `파일 용량이 너무 큽니다. 1장당 최대 10MB까지 가능합니다. (${file.name}: ${formatBytes(
          file.size
        )})`
      );
      setMessage("");
      return;
    }

    try {
      setIsSavingExistingImages(true);
      setError("");
      setMessage("새 이미지로 교체하고 있습니다...");

      const uploadedUrl = await uploadSingleFileToCloudinary(file);

      const currentUrl = existingImages[index];
      const nextImages = [...existingImages];
      nextImages[index] = uploadedUrl;

      const savedUrls = await savePortfolioImages(nextImages);
      setExistingImages(savedUrls);

      if (representativeImage && representativeImage === currentUrl) {
        const savedRepresentative = await saveRepresentativeImage(uploadedUrl);
        setRepresentativeImage(savedRepresentative);
      }

      setMessage("기존 이미지 교체가 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "이미지 교체 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsSavingExistingImages(false);
    }
  };

  const handleSetRepresentativeImage = async (imageUrl: string) => {
    try {
      setIsUpdatingRepresentative(true);
      setError("");
      setMessage("대표이미지를 저장하고 있습니다...");

      const savedRepresentative = await saveRepresentativeImage(imageUrl);
      setRepresentativeImage(savedRepresentative);

      setMessage("대표이미지 설정이 완료되었습니다.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "대표이미지 저장 중 오류가 발생했습니다."
      );
      setMessage("");
    } finally {
      setIsUpdatingRepresentative(false);
    }
  };

  const isBusy =
    isUploading ||
    isFindingArtist ||
    isSavingExistingImages ||
    isLoadingExistingImages ||
    isUpdatingRepresentative;

  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
     

      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 md:pt-10">
        <section className="overflow-hidden rounded-[38px] border border-[#ece3f6] bg-[radial-gradient(circle_at_top_left,_rgba(144,110,255,0.14),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.12),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_40px_rgba(78,58,130,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <div className="inline-flex rounded-full border border-[#e7dbf7] bg-white px-4 py-2 text-[12px] font-semibold text-[#7a5cf6]">
                DAYPIC PHOTO GALLERY
              </div>

              <h1 className="mt-5 text-[34px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[52px]">
                사진 포트폴리오를
                <br />
                더 선명하게 보여주세요
              </h1>

              <p className="mt-5 max-w-[760px] text-[16px] leading-8 text-[#6f6888]">
                업로드된 사진은 고객이 작가님의 분위기와 디테일을 빠르게 이해하는 데
                중요한 역할을 합니다. <br></br>대표이미지와 포트폴리오를 정리해 두면 문의
                연결에도 도움이 됩니다.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <div className="inline-flex rounded-full bg-[#f2ebff] px-4 py-2 text-[13px] font-semibold text-[#6d46f6]">
                  대표이미지 설정 가능
                </div>
                <div className="inline-flex rounded-full bg-[#f8eef8] px-4 py-2 text-[13px] font-semibold text-[#c0569f]">
                  기존 이미지 교체 가능
                </div>
                <div className="inline-flex rounded-full bg-[#edf5ff] px-4 py-2 text-[13px] font-semibold text-[#4a73d6]">
                  최대 40장 업로드
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#eadff7] bg-white/88 p-6 shadow-[0_12px_28px_rgba(84,62,133,0.07)]">
              <div className="text-[12px] font-bold tracking-[0.14em] text-[#9b8dbf]">
                ARTIST STATUS
              </div>

              <h2 className="mt-3 text-[28px] font-black leading-[1.25] tracking-[-0.05em] text-[#2b2745]">
                현재 업로드 상태를
                <br />
                확인해 주세요
              </h2>

              <div className="mt-5 space-y-3 text-[15px] leading-7 text-[#6e6786]">
                <div className="rounded-[18px] bg-[#f7f3ff] px-4 py-4">
                  <span className="font-bold text-[#4f3ccf]">작가명</span>
                  <div className="mt-1 text-[#2d2748]">
                    {isFindingArtist
                      ? "작가 정보를 확인하고 있습니다..."
                      : artistName || "작가 정보를 찾지 못했습니다."}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#fcf4f8] px-4 py-4">
                  <span className="font-bold text-[#b95d98]">기존 포트폴리오</span>
                  <div className="mt-1 text-[#2d2748]">
                    {isLoadingExistingImages
                      ? "기존 이미지를 불러오고 있습니다..."
                      : `${existingImages.length}장 저장됨`}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#eef5ff] px-4 py-4">
                  <span className="font-bold text-[#5b7fda]">새로 선택한 이미지</span>
                  <div className="mt-1 text-[#2d2748]">
                    {files.length > 0
                      ? `${files.length}장 선택됨`
                      : "아직 선택된 새 이미지가 없습니다."}
                  </div>
                </div>

                <div className="rounded-[18px] bg-[#f4ecff] px-4 py-4">
                  <span className="font-bold text-[#6846d7]">대표이미지</span>
                  <div className="mt-1 text-[#2d2748]">
                    {representativeImage
                      ? "대표이미지가 설정되어 있습니다."
                      : "대표이미지가 아직 설정되지 않았습니다."}
                  </div>
                </div>
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

        <section className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
                  기존 포트폴리오 관리
                </h2>
                <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
                  저장된 이미지는 삭제하거나 교체할 수 있고, 원하는 이미지를 대표사진으로
                  설정할 수 있습니다.
                </p>
              </div>
              <div className="text-[13px] font-medium text-[#7b6aa7]">
                총 {existingImages.length}장
              </div>
            </div>

            {representativeImage ? (
              <div className="mt-5 rounded-[18px] border border-[#e5dbff] bg-[#f7f3ff] px-4 py-4 text-[14px] text-[#654fb0]">
                현재 대표이미지가 설정되어 있습니다.
              </div>
            ) : null}

            {isLoadingExistingImages ? (
              <p className="mt-6 text-[15px] text-[#6f6888]">
                기존 포트폴리오를 불러오고 있습니다...
              </p>
            ) : existingImages.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-3">
                {existingImages.map((url, index) => {
                  const isRepresentative = representativeImage === url;

                  return (
                    <div
                      key={`${url}-${index}`}
                      className={`overflow-hidden rounded-[20px] border bg-[#fbf9ff] ${
                        isRepresentative
                          ? "border-[#7c5cff] shadow-[0_0_0_4px_rgba(124,92,255,0.12)]"
                          : "border-[#ebe4f5]"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`existing-${index + 1}`}
                        className="h-[220px] w-full object-cover"
                      />

                      <div className="space-y-2 p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteExistingImage(index)}
                            disabled={isBusy}
                            className={`inline-flex h-[44px] items-center justify-center rounded-[14px] text-[14px] font-bold text-white transition ${
                              isBusy
                                ? "cursor-not-allowed bg-[#d2c8ef]"
                                : "bg-[#ef5b6b] hover:bg-[#db4556]"
                            }`}
                          >
                            삭제
                          </button>

                          <button
                            type="button"
                            onClick={() => replaceInputRefs.current[index]?.click()}
                            disabled={isBusy}
                            className={`inline-flex h-[44px] items-center justify-center rounded-[14px] border text-[14px] font-bold transition ${
                              isBusy
                                ? "cursor-not-allowed border-[#ece5f8] bg-[#f4f1fb] text-[#b7accf]"
                                : "border-[#dccccf2] bg-white text-[#4d426b] hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white"
                            }`}
                          >
                            교체
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSetRepresentativeImage(url)}
                          disabled={isBusy || isRepresentative}
                          className={`inline-flex h-[44px] w-full items-center justify-center rounded-[14px] text-[14px] font-bold transition ${
                            isRepresentative
                              ? "cursor-not-allowed bg-[#7c5cff] text-white"
                              : isBusy
                              ? "cursor-not-allowed bg-[#d2c8ef] text-white"
                              : "bg-[#6948f5] text-white hover:bg-[#5636df]"
                          }`}
                        >
                          {isRepresentative ? "현재 대표이미지" : "대표이미지로 설정"}
                        </button>

                        <input
                          ref={(el) => {
                            replaceInputRefs.current[index] = el;
                          }}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            handleReplaceExistingImage(index, file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-6 text-[15px] text-[#6f6888]">
                아직 저장된 기존 포트폴리오 이미지가 없습니다.
              </p>
            )}
          </div>

          <div className="rounded-[30px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)] md:p-8">
            <h2 className="text-[26px] font-black tracking-[-0.04em] text-[#2b2745]">
              새 이미지 추가 업로드
            </h2>
            <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
              새로 선택한 이미지는 업로드 전에 미리보기에서 삭제할 수 있습니다.
            </p>

            <div className="mt-5 rounded-[20px] bg-[#faf7ff] p-5">
              <input
                ref={uploadInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                disabled={isBusy}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                disabled={isBusy}
                className={`inline-flex h-[48px] min-w-[180px] items-center justify-center rounded-[16px] px-5 text-[15px] font-bold text-white transition ${
                  isBusy
                    ? "cursor-not-allowed bg-[#c4b7f1]"
                    : "bg-[#6948f5] hover:bg-[#5636df]"
                }`}
              >
                이미지 선택하기
              </button>

              <p className="mt-4 text-[14px] text-[#6f6888]">
                {files.length > 0
                  ? `새로 선택된 파일: ${files.length}개`
                  : "아직 선택된 새 이미지가 없습니다."}
              </p>

              <p className="mt-2 text-[13px] text-[#9a91b8]">
                JPG, PNG 등 이미지 파일 / 1장당 최대 10MB / 기존 이미지 포함 최대 40장
              </p>
            </div>

            {previewUrls.length > 0 ? (
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                {previewUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="relative overflow-hidden rounded-[18px] border border-[#ebe4f5] bg-[#fbf9ff]"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      disabled={isBusy}
                      className={`absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold text-white ${
                        isBusy
                          ? "cursor-not-allowed bg-[#cfc6e9]"
                          : "bg-[#2c2448]/80 hover:bg-[#2c2448]"
                      }`}
                      aria-label={`새 이미지 ${index + 1} 삭제`}
                    >
                      ✕
                    </button>

                    <img
                      src={url}
                      alt={`preview-${index + 1}`}
                      className="h-[150px] w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isBusy}
              className={`mt-6 inline-flex h-[52px] w-full items-center justify-center rounded-[18px] text-[16px] font-bold text-white transition ${
                isBusy
                  ? "cursor-not-allowed bg-[#c4b7f1]"
                  : "bg-gradient-to-r from-[#6b56f5] to-[#d35fae] hover:opacity-95"
              }`}
            >
              {isUploading ? "업로드 중입니다..." : "새 이미지 업로드"}
            </button>
          </div>
        </section>

        <section className="mt-8 rounded-[28px] border border-[#e8dff3] bg-white p-6 shadow-[0_10px_26px_rgba(60,50,100,0.06)]">
          <h3 className="text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
            업로드 전에 확인해 주세요
          </h3>
          <p className="mt-2 text-[14px] leading-7 text-[#6b6482]">
            사진 포트폴리오는 고객이 작가님의 분위기를 이해하는 가장 빠른 기준이 됩니다.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">대표이미지 우선 설정</span>
              가장 먼저 보여줄 사진은 작가님의 분위기를 잘 보여주는 이미지로 선택해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">중복 사진 정리</span>
              비슷한 컷이 반복되면 고객이 포트폴리오를 길게 느낄 수 있으니 핵심 컷 위주로 구성해 주세요.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">톤과 스타일 유지</span>
              전체적인 색감과 분위기가 일정할수록 작가님의 정체성이 더 선명하게 전달됩니다.
            </div>

            <div className="rounded-[18px] bg-[#faf7ff] px-4 py-4 text-[14px] leading-6 text-[#645d80]">
              <span className="block font-bold text-[#4f3ccf]">고객 시선 기준</span>
              고객이 처음 봤을 때 바로 이해할 수 있도록 대표 장면과 감정이 담긴 컷을 중심으로 배치해 주세요.
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end sm:items-center">
            <Link
              href="/artist-dashboard"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              대시보드 돌아가기
            </Link>
            <Link
              href="/artist-calendar"
              className="inline-flex h-[48px] items-center justify-center rounded-[16px] border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-all duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white"
            >
              일정 관리
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function ArtistUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#faf7fc] text-[18px] text-[#4a3c7d]">
          로딩 중입니다...
        </div>
      }
    >
      <ArtistUploadPageInner />
    </Suspense>
  );
}