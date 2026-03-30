"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default function ArtistUploadPage() {
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
      setError("이메일 정보가 없어. 올바른 링크로 다시 접속해줘요.");
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
          throw new Error(data.error || "작가 정보를 찾지 못했어요.");
        }

        setArtistId(data.artist.id);
        setArtistName(data.artist.name);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "작가 정보를 불러오는 중 오류가 발생했어요."
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
          throw new Error("기존 포트폴리오 이미지를 불러오지 못했어요.");
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
            : "기존 포트폴리오 이미지를 불러오는 중 오류가 발생했어요."
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
      setError(`최대 ${MAX_FILE_COUNT}장까지만 업로드할 수 있어요.`);
      setFiles([]);
      return;
    }

    if (existingImages.length + selectedFiles.length > MAX_FILE_COUNT) {
      setError(`기존 이미지 포함 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있어요.`);
      setFiles([]);
      return;
    }

    const oversizedFile = selectedFiles.find((file) => file.size > MAX_FILE_SIZE);

    if (oversizedFile) {
      setError(
        `파일 용량이 너무 커요. 1장당 최대 10MB까지 가능해요. (${oversizedFile.name}: ${formatBytes(
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
      throw new Error(signData?.error || "Cloudinary 서명 요청에 실패했어요.");
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
        uploadData?.error?.message || "Cloudinary 업로드에 실패했어요."
      );
    }

    return uploadData.secure_url as string;
  };

  const savePortfolioImages = async (nextImageUrls: string[]) => {
    if (!artistId) {
      throw new Error("작가 ID가 없어요.");
    }

    const cleanedUrls = nextImageUrls
      .filter((url) => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);

    if (cleanedUrls.length > MAX_FILE_COUNT) {
      throw new Error(`포트폴리오 이미지는 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있어요.`);
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
      throw new Error(saveData.error || "포트폴리오 저장에 실패했어요.");
    }

    return saveData.imageUrls ?? cleanedUrls;
  };

  const saveRepresentativeImage = async (imageUrl: string) => {
    if (!artistId) {
      throw new Error("작가 ID가 없어요.");
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
      throw new Error(data.error || "대표이미지 저장에 실패했어요.");
    }

    return data.imageUrl ?? imageUrl;
  };

  const handleUpload = async () => {
    if (!email) {
      setError("이메일 정보가 없어요.");
      return;
    }

    if (!artistId) {
      setError("작가 정보를 아직 찾지 못했어요.");
      return;
    }

    if (files.length === 0) {
      setError("먼저 업로드할 이미지를 선택해줘요.");
      return;
    }

    if (existingImages.length + files.length > MAX_FILE_COUNT) {
      setError(`기존 이미지 포함 최대 ${MAX_FILE_COUNT}장까지만 저장할 수 있어요.`);
      return;
    }

    try {
      setIsUploading(true);
      setError("");
      setMessage("이미지 업로드 중이예요...");

      const uploadedUrls: string[] = [];

      for (const file of files) {
        const url = await uploadSingleFileToCloudinary(file);
        uploadedUrls.push(url);
      }

      setMessage("Airtable에 저장 중이예요...");

      const mergedUrls = [...existingImages, ...uploadedUrls];
      const savedUrls = await savePortfolioImages(mergedUrls);

      setExistingImages(savedUrls);
      setFiles([]);
      setMessage(`업로드 완료! 총 ${savedUrls.length}장 저장했어요.`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "업로드 중 오류가 발생했어요."
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
      setMessage("기존 이미지를 삭제 중이예요...");

      const targetUrl = existingImages[index];
      const nextImages = existingImages.filter((_, i) => i !== index);

      if (nextImages.length === 0) {
        setError(
          "마지막 1장을 삭제하려면 먼저 새 이미지를 올리거나, 0장 허용 API 수정이 필요해요."
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

      setMessage("기존 포트폴리오 이미지 삭제 완료!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "기존 이미지 삭제 중 오류가 발생했어요."
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
        `파일 용량이 너무 커요. 1장당 최대 10MB까지 가능해요. (${file.name}: ${formatBytes(
          file.size
        )})`
      );
      setMessage("");
      return;
    }

    try {
      setIsSavingExistingImages(true);
      setError("");
      setMessage("새 이미지로 교체 중이예요...");

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

      setMessage("기존 이미지 교체 완료!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "이미지 교체 중 오류가 발생했어요."
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
      setMessage("대표이미지를 저장 중이예요...");

      const savedRepresentative = await saveRepresentativeImage(imageUrl);
      setRepresentativeImage(savedRepresentative);

      setMessage("대표이미지 설정 완료!");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "대표이미지 저장 중 오류가 발생했어요."
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
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "80px 20px",
      }}
    >
      <h1 style={{ fontSize: "32px", fontWeight: "bold" }}>
        작가 포트폴리오 업로드 / 관리
      </h1>

      <p style={{ marginTop: "10px", opacity: 0.75 }}>
        기존 이미지는 삭제/교체할 수 있고, 새 이미지는 최대 40장까지 추가할 수 있어요
      </p>

      <div style={{ marginTop: "20px", opacity: 0.7, textAlign: "center" }}>
        <div>현재 계정: {email || "이메일 없음"}</div>
        <div style={{ marginTop: "8px" }}>
          {isFindingArtist
            ? "작가 정보를 찾는 중..."
            : artistName
            ? `작가명: ${artistName}`
            : "작가명: 찾지 못함"}
        </div>
      </div>

      <div
        style={{
          marginTop: "35px",
          background: "#111",
          padding: "30px",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "980px",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ fontSize: "22px", fontWeight: 700 }}>기존 포트폴리오</h2>

        <p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.7 }}>
          저장된 기존 이미지는 삭제하거나 다른 이미지로 교체할 수 있고, 대표이미지로도 지정할 수 있어요
        </p>

        {representativeImage ? (
          <div
            style={{
              marginTop: "16px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: "#1a1a1a",
              border: "1px solid #2d2d2d",
              fontSize: "14px",
              color: "#bdbdbd",
            }}
          >
            현재 대표이미지가 설정되어 있어요
          </div>
        ) : null}

        {isLoadingExistingImages ? (
          <p style={{ marginTop: "18px", opacity: 0.7 }}>
            기존 포트폴리오를 불러오는 중...
          </p>
        ) : existingImages.length > 0 ? (
          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            {existingImages.map((url, index) => {
              const isRepresentative = representativeImage === url;

              return (
                <div
                  key={`${url}-${index}`}
                  style={{
                    border: isRepresentative
                      ? "2px solid #7c5cff"
                      : "1px solid #333",
                    borderRadius: "12px",
                    overflow: "hidden",
                    background: "#181818",
                    boxShadow: isRepresentative
                      ? "0 0 0 3px rgba(124, 92, 255, 0.18)"
                      : "none",
                  }}
                >
                  <img
                    src={url}
                    alt={`existing-${index + 1}`}
                    style={{
                      width: "100%",
                      height: "180px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      padding: "10px",
                      background: "#101010",
                    }}
                  >
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleDeleteExistingImage(index)}
                        disabled={isBusy}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: isBusy ? "#555" : "#ff4d4f",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 700,
                          cursor: isBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        삭제
                      </button>

                      <button
                        type="button"
                        onClick={() => replaceInputRefs.current[index]?.click()}
                        disabled={isBusy}
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: isBusy ? "#555" : "#fff",
                          color: "#000",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 700,
                          cursor: isBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        교체
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSetRepresentativeImage(url)}
                      disabled={isBusy || isRepresentative}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        background: isRepresentative ? "#7c5cff" : "#2a2a2a",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor:
                          isBusy || isRepresentative ? "not-allowed" : "pointer",
                      }}
                    >
                      {isRepresentative ? "현재 대표" : "대표로 설정"}
                    </button>

                    <input
                      ref={(el) => {
                        replaceInputRefs.current[index] = el;
                      }}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
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
          <p style={{ marginTop: "18px", opacity: 0.7 }}>
            아직 저장된 기존 포트폴리오 이미지가 없어요.
          </p>
        )}

        <hr
          style={{
            margin: "32px 0",
            border: "none",
            borderTop: "1px solid #2b2b2b",
          }}
        />

        <h2 style={{ fontSize: "22px", fontWeight: 700 }}>새 이미지 추가 업로드</h2>

        <p style={{ marginTop: "10px", fontSize: "14px", opacity: 0.7 }}>
          새로 선택한 이미지는 업로드 전에 미리보기에서 삭제할 수 있어요
        </p>

        <div style={{ marginTop: "20px" }}>
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={isBusy}
            style={{ display: "none" }}
          />

          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={isBusy}
            style={{
              padding: "14px 20px",
              background: isBusy ? "#444" : "#7c5cff",
              color: "#fff",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "15px",
              cursor: isBusy ? "not-allowed" : "pointer",
              minWidth: "180px",
            }}
          >
            이미지 선택하기
          </button>
        </div>

        <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.85 }}>
          {files.length > 0
            ? `새로 선택된 파일: ${files.length}개`
            : "아직 선택된 새 이미지가 없어요"}
        </p>

        <p style={{ marginTop: "12px", fontSize: "14px", opacity: 0.65 }}>
          JPG, PNG 등 이미지 파일 / 1장당 최대 10MB / 기존 이미지 포함 최대 40장
        </p>

        {previewUrls.length > 0 ? (
          <div
            style={{
              marginTop: "24px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
              gap: "12px",
            }}
          >
            {previewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                style={{
                  position: "relative",
                  border: "1px solid #333",
                  borderRadius: "10px",
                  overflow: "hidden",
                  background: "#181818",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleRemoveFile(index)}
                  disabled={isBusy}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "rgba(0,0,0,0.72)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "999px",
                    width: "26px",
                    height: "26px",
                    cursor: isBusy ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                  aria-label={`새 이미지 ${index + 1} 삭제`}
                >
                  ✕
                </button>

                <img
                  src={url}
                  alt={`preview-${index + 1}`}
                  style={{
                    width: "100%",
                    height: "120px",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {message ? (
          <p style={{ color: "#7CFF7C", marginTop: "18px" }}>{message}</p>
        ) : null}

        {error ? (
          <p style={{ color: "#ff6b6b", marginTop: "18px", whiteSpace: "pre-line" }}>
            {error}
          </p>
        ) : null}
      </div>

      <button
        style={{
          marginTop: "30px",
          padding: "14px 28px",
          background: isBusy ? "#666" : "#fff",
          color: "#000",
          borderRadius: "10px",
          cursor: isBusy ? "not-allowed" : "pointer",
          fontWeight: 700,
          border: "none",
        }}
        onClick={handleUpload}
        disabled={isBusy}
      >
        {isUploading ? "업로드 중..." : "새 이미지 업로드"}
      </button>
    </div>
  );
}