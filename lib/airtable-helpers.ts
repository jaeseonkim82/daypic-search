export type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
};

export function pickImage(fields: Record<string, unknown>): string {
  const candidates = [
    fields["대표사진"],
    fields["대표이미지"],
    fields["대표 이미지"],
    fields["image"],
    fields["thumbnail"],
  ];

  for (const value of candidates) {
    if (!value) continue;

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];

      if (typeof first === "string") return first.trim();

      if (first && typeof first === "object" && "url" in first) {
        return String((first as { url?: unknown }).url || "").trim();
      }

      if (
        first &&
        typeof first === "object" &&
        (first as { thumbnails?: { large?: { url?: string } } }).thumbnails?.large?.url
      ) {
        return String(
          (first as { thumbnails: { large: { url: string } } }).thumbnails.large.url
        ).trim();
      }
    }
  }

  return "";
}

export function pickAttachmentUrl(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && value.length > 0) {
    const first = value[0];

    if (typeof first === "string" && first.trim()) {
      return first.trim();
    }

    if (first && typeof first === "object" && "url" in first) {
      return String((first as { url?: unknown }).url || "").trim();
    }

    if (
      first &&
      typeof first === "object" &&
      (first as { thumbnails?: { large?: { url?: string } } }).thumbnails?.large?.url
    ) {
      return String(
        (first as { thumbnails: { large: { url: string } } }).thumbnails.large.url
      ).trim();
    }
  }

  return "";
}

export function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value == null) return [];
  return [String(value).trim()].filter(Boolean);
}

export function toStringValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (value == null) return "";
  return String(value).trim();
}

export function normalizeText(value: string): string {
  return value.replace(/\s/g, "").trim().toLowerCase();
}

export function getField(
  fields: Record<string, unknown>,
  candidates: string[]
): unknown {
  for (const key of candidates) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== "") {
      return fields[key];
    }
  }
  return undefined;
}

export function formatDateToYMD(value: string): string {
  if (!value) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  if (value.includes("T")) {
    return value.split("T")[0];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.trim();
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

export async function fetchAirtableRecords(
  tableName: string,
  token: string,
  baseId: string
): Promise<AirtableRecord[]> {
  if (!token || !baseId) {
    throw new Error("Airtable 환경변수가 설정되지 않았어.");
  }

  const encodedTableName = encodeURIComponent(tableName);
  let offset = "";
  const allRecords: AirtableRecord[] = [];

  while (true) {
    const url = new URL(
      `https://api.airtable.com/v0/${baseId}/${encodedTableName}`
    );

    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Airtable 요청 실패 (${response.status}): ${errorText || "응답 없음"}`
      );
    }

    const data = (await response.json()) as {
      records?: AirtableRecord[];
      offset?: string;
    };

    allRecords.push(...(data.records || []));

    if (!data.offset) break;
    offset = data.offset;
  }

  return allRecords;
}
