/**
 * 클라이언트 공용 정규화 유틸.
 * - normalizeArray: string / string[] / {url}[] / {secure_url}[] 을 string[] 로 수렴
 * - joinLabel: string[] 또는 string 을 " · " 구분자로 연결해 라벨 표시
 */

export function normalizeArray(value: unknown): string[] {
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

export function joinLabel(value: string[] | string | undefined): string {
  if (!value) return "";
  return Array.isArray(value) ? value.join(" · ") : value;
}
