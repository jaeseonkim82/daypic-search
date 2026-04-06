import { NextRequest, NextResponse } from "next/server";

type AirtableRecord = {
  id: string;
  createdTime?: string;
  fields: Record<string, any>;
};

const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;
const ARTISTS_TABLE = process.env.AIRTABLE_ARTISTS_TABLE || "artists";

function getTableUrl() {
  return `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(
    ARTISTS_TABLE
  )}`;
}

function getHeaders() {
  return {
    Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    "Content-Type": "application/json",
  };
}

function isRecordId(value: string) {
  return /^rec[a-zA-Z0-9]+$/.test(value);
}

function hasOwn(obj: Record<string, any>, key: string) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function pickFirstString(fields: Record<string, any>, candidates: string[]) {
  for (const key of candidates) {
    const value = fields?.[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return "";
}

function pickFirstArray(fields: Record<string, any>, candidates: string[]) {
  for (const key of candidates) {
    const value = fields?.[key];

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

    if (typeof value === "string" && value.trim() !== "") {
      return value
        .split(/\r?\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function pickFirstValue(fields: Record<string, any>, candidates: string[]) {
  for (const key of candidates) {
    if (fields?.[key] !== undefined && fields?.[key] !== null) {
      return fields[key];
    }
  }
  return undefined;
}

function findExistingFieldName(fields: Record<string, any>, candidates: string[]) {
  for (const key of candidates) {
    if (hasOwn(fields, key)) {
      return key;
    }
  }
  return null;
}

function sanitizeString(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function sanitizeStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeAttachmentArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const attachment = item as Record<string, any>;
      return {
        id: typeof attachment.id === "string" ? attachment.id : undefined,
        url: typeof attachment.url === "string" ? attachment.url : undefined,
        filename:
          typeof attachment.filename === "string"
            ? attachment.filename
            : undefined,
      };
    })
    .filter(Boolean);
}

function normalizeSingleAttachmentUrl(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    const first = value[0];
    if (
      first &&
      typeof first === "object" &&
      "url" in first &&
      typeof (first as { url?: unknown }).url === "string"
    ) {
      return (first as { url: string }).url.trim();
    }
  }

  return "";
}

function toAttachmentFieldValue(url: string) {
  return url ? [{ url }] : [];
}

function normalizeArtist(record: AirtableRecord) {
  const fields = record.fields || {};

  const portfolioImages = pickFirstArray(fields, [
  "portfolio_images",
  "portfolioImages",
  "포트폴리오이미지",
  "포트폴리오 이미지",
]);

  const styleKeywords = pickFirstArray(fields, [
    "style_keywords",
    "styleKeywords",
    "스타일키워드",
    "성향키워드",
    "촬영스타일",
  ]);

  const videoThumbnailRaw = pickFirstValue(fields, [
    "video_thumbnail",
    "videoThumbnail",
    "영상썸네일",
    "대표썸네일",
  ]);

  const videoThumb1Raw = pickFirstValue(fields, ["video_thumb_1"]);
  const videoThumb2Raw = pickFirstValue(fields, ["video_thumb_2"]);
  const videoThumb3Raw = pickFirstValue(fields, ["video_thumb_3"]);
  const videoThumb4Raw = pickFirstValue(fields, ["video_thumb_4"]);

  return {
    id: record.id,
    artist_id: pickFirstString(fields, ["artist_id"]),
    user_id: pickFirstString(fields, ["user_id", "userId"]),
    kakao_id: pickFirstString(fields, ["kakao_id"]),

    name: pickFirstString(fields, [
      "name",
      "Name",
      "artist_name",
      "작가명",
      "이름",
      "companyName",
      "company_name",
      "업체명",
    ]),

    email: pickFirstString(fields, [
      "email",
      "Email",
      "artist_email",
      "작가이메일",
      "이메일",
    ]),

    phone: pickFirstString(fields, [
      "phone",
      "Phone",
      "전화번호",
      "연락처",
      "휴대폰",
    ]),

    service: pickFirstArray(fields, [
      "service",
      "services",
      "촬영서비스",
      "서비스",
    ]),

    region: pickFirstArray(fields, [
      "region",
      "regions",
      "촬영지역",
      "활동지역",
      "지역",
    ]),

    price: pickFirstString(fields, [
      "price",
      "가격",
      "price_range",
      "가격대",
      "촬영비용",
    ]),

    style_keywords: styleKeywords,
    keywords: styleKeywords,
    성향키워드: styleKeywords,

    portfolio: pickFirstString(fields, [
      "portfolio",
      "portfolio_url",
      "포트폴리오",
      "포트폴리오링크",
      "포트폴리오 링크",
    ]),

    open_chat_url: pickFirstString(fields, [
      "open_chat_url",
      "openchat_url",
      "오픈채팅",
      "오픈채팅링크",
      "오픈채팅 링크",
    ]),

    artist_type: pickFirstString(fields, [
      "artist_type",
      "artistType",
      "작가유형",
      "작가 타입",
    ]),

    portfolio_images: portfolioImages,

    image:
  normalizeSingleAttachmentUrl(
    pickFirstValue(fields, [
      "image",
      "main_image",
      "대표이미지",
      "대표 이미지",
      "대표사진",
      "thumbnail",
    ])
  ) ||
  pickFirstString(fields, [
    "image",
    "main_image",
    "대표이미지",
    "대표 이미지",
    "대표사진",
    "thumbnail",
  ]),
    rating:
      typeof pickFirstValue(fields, ["rating", "평점"]) === "number"
        ? pickFirstValue(fields, ["rating", "평점"])
        : null,

    video_link_1: pickFirstString(fields, ["video_link_1"]),
    video_link_2: pickFirstString(fields, ["video_link_2"]),
    video_link_3: pickFirstString(fields, ["video_link_3"]),
    video_link_4: pickFirstString(fields, ["video_link_4"]),

    video_links: [
      pickFirstString(fields, ["video_link_1"]),
      pickFirstString(fields, ["video_link_2"]),
      pickFirstString(fields, ["video_link_3"]),
      pickFirstString(fields, ["video_link_4"]),
    ].filter(Boolean),

    video_thumbnail: normalizeSingleAttachmentUrl(videoThumbnailRaw),
    video_thumbnail_attachments: normalizeAttachmentArray(videoThumbnailRaw),

    video_thumb_1: normalizeSingleAttachmentUrl(videoThumb1Raw),
    video_thumb_2: normalizeSingleAttachmentUrl(videoThumb2Raw),
    video_thumb_3: normalizeSingleAttachmentUrl(videoThumb3Raw),
    video_thumb_4: normalizeSingleAttachmentUrl(videoThumb4Raw),

    video_thumb_1_attachments: normalizeAttachmentArray(videoThumb1Raw),
    video_thumb_2_attachments: normalizeAttachmentArray(videoThumb2Raw),
    video_thumb_3_attachments: normalizeAttachmentArray(videoThumb3Raw),
    video_thumb_4_attachments: normalizeAttachmentArray(videoThumb4Raw),

    video_style_tags: pickFirstArray(fields, [
      "video_style_tags",
      "videoStyleTags",
      "영상스타일태그",
      "영상 스타일 태그",
    ]),
  };
}

async function fetchAirtable(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      ...getHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
}

async function findArtistRecord(id: string): Promise<AirtableRecord | null> {
  const tableUrl = getTableUrl();

  if (isRecordId(id)) {
    const directRes = await fetchAirtable(`${tableUrl}/${id}`, {
      method: "GET",
    });

    if (directRes.ok) {
      return await directRes.json();
    }

    if (directRes.status !== 404) {
      const text = await directRes.text();
      throw new Error(`작가 조회 실패: ${directRes.status} ${text}`);
    }
  }

  const formula = encodeURIComponent(
    `OR({artist_id}="${id}", {kakao_id}="${id}", {user_id}="${id}")`
  );

  const searchRes = await fetchAirtable(
    `${tableUrl}?filterByFormula=${formula}&maxRecords=1`,
    { method: "GET" }
  );

  if (!searchRes.ok) {
    const text = await searchRes.text();
    throw new Error(`작가 검색 실패: ${searchRes.status} ${text}`);
  }

  const data = await searchRes.json();
  return data.records?.[0] || null;
}

function setStringField(
  updateFields: Record<string, any>,
  existingFields: Record<string, any>,
  candidates: string[],
  fallback: string,
  value: string
) {
  const key = findExistingFieldName(existingFields, candidates) || fallback;
  updateFields[key] = value;
}

function setArrayOrStringField(
  updateFields: Record<string, any>,
  existingFields: Record<string, any>,
  candidates: string[],
  fallback: string,
  value: string[]
) {
  const key = findExistingFieldName(existingFields, candidates) || fallback;
  const currentValue = existingFields?.[key];

  if (typeof currentValue === "string") {
    updateFields[key] = value.join(", ");
    return;
  }

  updateFields[key] = value;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const record = await findArtistRecord(id);

    if (!record) {
      return NextResponse.json({ error: "작가를 찾을 수 없어." }, { status: 404 });
    }

    return NextResponse.json(normalizeArtist(record));
  } catch (error) {
    console.error("GET /api/artists/[id] error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "작가 정보를 불러오는 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const record = await findArtistRecord(id);

    if (!record) {
      return NextResponse.json(
        { error: "수정할 작가를 찾을 수 없어." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updateFields: Record<string, any> = {};

    if (hasOwn(body, "phone")) {
      setStringField(
        updateFields,
        record.fields,
        ["phone", "Phone", "전화번호", "연락처", "휴대폰"],
        "phone",
        sanitizeString(body.phone)
      );
    }

    if (hasOwn(body, "price")) {
      setStringField(
        updateFields,
        record.fields,
        ["price", "가격", "price_range", "가격대", "촬영비용"],
        "price",
        sanitizeString(body.price)
      );
    }

    if (hasOwn(body, "service")) {
      setArrayOrStringField(
        updateFields,
        record.fields,
        ["service", "services", "촬영서비스", "서비스"],
        "service",
        sanitizeStringArray(body.service)
      );
    }

    if (hasOwn(body, "region")) {
      setArrayOrStringField(
        updateFields,
        record.fields,
        ["region", "regions", "촬영지역", "활동지역", "지역"],
        "region",
        sanitizeStringArray(body.region)
      );
    }

    if (hasOwn(body, "style_keywords")) {
      setArrayOrStringField(
        updateFields,
        record.fields,
        ["style_keywords", "styleKeywords", "스타일키워드", "성향키워드", "촬영스타일"],
        "style_keywords",
        sanitizeStringArray(body.style_keywords)
      );
    }

    if (hasOwn(body, "video_link_1")) {
      setStringField(
        updateFields,
        record.fields,
        ["video_link_1"],
        "video_link_1",
        sanitizeString(body.video_link_1)
      );
    }

    if (hasOwn(body, "video_link_2")) {
      setStringField(
        updateFields,
        record.fields,
        ["video_link_2"],
        "video_link_2",
        sanitizeString(body.video_link_2)
      );
    }

    if (hasOwn(body, "video_link_3")) {
      setStringField(
        updateFields,
        record.fields,
        ["video_link_3"],
        "video_link_3",
        sanitizeString(body.video_link_3)
      );
    }

    if (hasOwn(body, "video_link_4")) {
      setStringField(
        updateFields,
        record.fields,
        ["video_link_4"],
        "video_link_4",
        sanitizeString(body.video_link_4)
      );
    }

    if (hasOwn(body, "video_style_tags")) {
      setArrayOrStringField(
        updateFields,
        record.fields,
        ["video_style_tags", "videoStyleTags", "영상스타일태그", "영상 스타일 태그"],
        "video_style_tags",
        sanitizeStringArray(body.video_style_tags)
      );
    }

    if (hasOwn(body, "video_thumbnail")) {
      const key =
        findExistingFieldName(record.fields, [
          "video_thumbnail",
          "videoThumbnail",
          "영상썸네일",
          "대표썸네일",
        ]) || "video_thumbnail";

      const thumbnailUrl = sanitizeString(body.video_thumbnail);
      updateFields[key] = toAttachmentFieldValue(thumbnailUrl);
    }

    if (hasOwn(body, "video_thumb_1")) {
      const key = findExistingFieldName(record.fields, ["video_thumb_1"]) || "video_thumb_1";
      updateFields[key] = toAttachmentFieldValue(sanitizeString(body.video_thumb_1));
    }

    if (hasOwn(body, "video_thumb_2")) {
      const key = findExistingFieldName(record.fields, ["video_thumb_2"]) || "video_thumb_2";
      updateFields[key] = toAttachmentFieldValue(sanitizeString(body.video_thumb_2));
    }

    if (hasOwn(body, "video_thumb_3")) {
      const key = findExistingFieldName(record.fields, ["video_thumb_3"]) || "video_thumb_3";
      updateFields[key] = toAttachmentFieldValue(sanitizeString(body.video_thumb_3));
    }

    if (hasOwn(body, "video_thumb_4")) {
      const key = findExistingFieldName(record.fields, ["video_thumb_4"]) || "video_thumb_4";
      updateFields[key] = toAttachmentFieldValue(sanitizeString(body.video_thumb_4));
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({
        ok: true,
        message: "변경할 항목이 없어.",
        artist: normalizeArtist(record),
      });
    }

    const updateRes = await fetchAirtable(`${getTableUrl()}/${record.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        fields: updateFields,
      }),
    });

    if (!updateRes.ok) {
      const text = await updateRes.text();
      throw new Error(`작가 정보 수정 실패: ${updateRes.status} ${text}`);
    }

    const updatedRecord = await updateRes.json();

    return NextResponse.json({
      ok: true,
      message: "작가정보가 저장되었어.",
      artist: normalizeArtist(updatedRecord),
    });
  } catch (error) {
    console.error("PATCH /api/artists/[id] error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "작가정보 저장 중 오류가 발생했어.",
      },
      { status: 500 }
    );
  }
}