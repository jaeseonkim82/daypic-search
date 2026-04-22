/**
 * YYYY-MM-DD 형식으로 정규화. 이미 그 형식이면 그대로.
 * ISO 포함 문자열은 T 앞부분을, 그 외는 Date 파싱 후 재포맷.
 */
export function formatDateToYMD(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.trim();

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}
