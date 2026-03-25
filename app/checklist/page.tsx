"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type ChecklistSection = {
  title: string;
  description: string;
  items: string[];
};

const checklistSections: ChecklistSection[] = [
  {
    title: "예식 준비",
    description: "가장 먼저 큰 일정과 예식 기본 틀을 정리해요.",
    items: [
      "예식 날짜 확정",
      "예식장 투어 및 계약",
      "하객 규모 대략 정리",
      "예식 시간 확정",
      "폐백 여부 결정",
    ],
  },
  {
    title: "스드메 준비",
    description: "촬영, 드레스, 메이크업 관련 일정을 본격적으로 잡는 단계예요.",
    items: [
      "스드메 업체 비교",
      "스튜디오 촬영 여부 결정",
      "드레스 투어 및 선택",
      "메이크업 샵 예약",
      "촬영 일정 확정",
    ],
  },
  {
    title: "본식 촬영",
    description: "데이픽에서 가장 중요하게 볼 수 있는 영역이예요.",
    items: [
      "본식 스냅 작가 찾기",
      "서브스냅 추가 결정 여부",
      "아이폰스냅 추가 결정 여부",
      "영상 촬영 여부 결정",
      "포트폴리오 확인",
      "계약 전 포함사항 확인",
      "계약서 확인",
      "납품 일정 체크",
    ],
  },
  {
    title: "예복 / 스타일",
    description: "본식 당일 전체 무드를 완성하는 준비예요.",
    items: [
      "신랑 예복 준비",
      "신부 웨딩슈즈 준비",
      "액세서리 준비",
      "본식 속옷 준비",
      "혼주 의상 준비",
    ],
  },
  {
    title: "청첩장 / 하객 관리",
    description: "실제로 예식 안내를 시작하는 단계예요.",
    items: [
      "모바일 청첩장 제작",
      "종이 청첩장 여부 결정",
      "하객 리스트 정리",
      "좌석 / 식권 계획",
      "안내 메시지 작성",
    ],
  },
  {
    title: "본식 진행 / 신혼여행",
    description: "행사 진행과 본식 이후 일정까지 함께 챙겨야 해요.",
    items: [
      "사회자 섭외",
      "축가 섭외",
      "식전 영상 준비",
      "신혼여행 예약",
      "여권 및 일정 확인",
    ],
  },
];

const allItems = checklistSections.flatMap((section) => section.items);

export default function ChecklistPage() {
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const pdfTargetRef = useRef<HTMLDivElement | null>(null);

  const totalCount = allItems.length;
  const checkedCount = checkedItems.length;

  const progress = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((checkedCount / totalCount) * 100);
  }, [checkedCount, totalCount]);

  function toggleItem(item: string) {
    setCheckedItems((prev) =>
      prev.includes(item)
        ? prev.filter((checked) => checked !== item)
        : [...prev, item]
    );
  }

  function selectAll() {
    setCheckedItems(allItems);
  }

  function clearAll() {
    setCheckedItems([]);
  }

  async function downloadPdf() {
    if (!pdfTargetRef.current) return;

    try {
      setIsDownloading(true);

      const canvas = await html2canvas(pdfTargetRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "p",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;
      const contentHeight = (canvas.height * contentWidth) / canvas.width;

      if (contentHeight <= pdfHeight - margin * 2) {
        pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
      } else {
        let remainingHeight = contentHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", margin, position + margin, contentWidth, contentHeight);
        remainingHeight -= pdfHeight - margin * 2;

        while (remainingHeight > 0) {
          position -= pdfHeight - margin * 2;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", margin, position + margin, contentWidth, contentHeight);
          remainingHeight -= pdfHeight - margin * 2;
        }
      }

      pdf.save("daypic-checklist.pdf");
    } catch (error) {
      console.error(error);
      alert("PDF 저장 중 오류가 발생했어요.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf7ff_0%,#f6f1ff_100%)] text-[#25213d]">
      <div className="mx-auto max-w-[1180px] px-5 py-6 md:px-8 md:py-8">
        <header className="mb-6 flex flex-col gap-4 rounded-[28px] border border-[#ece4f4] bg-white/90 px-5 py-5 shadow-[0_18px_40px_rgba(90,70,140,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between md:px-6">
          <Link href="/" className="inline-flex items-center gap-3 self-start">
            <img
              src="/daypic_logo.png"
              alt="daypic logo"
              className="h-10 w-auto object-contain md:h-11"
            />
          </Link>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#e6ddf2] bg-white px-4 text-[14px] font-semibold text-[#5f587a] transition hover:bg-[#faf7ff]"
            >
              작가 찾으러 가기
            </Link>

            <button
              type="button"
              onClick={downloadPdf}
              disabled={isDownloading}
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#6d46f6] px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(109,70,246,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? "PDF 만드는 중..." : "PDF 다운로드"}
            </button>
          </div>
        </header>

        <section className="overflow-hidden rounded-[32px] border border-[#ece4f4] bg-white shadow-[0_20px_44px_rgba(80,60,120,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="bg-[linear-gradient(135deg,#f4edff_0%,#efe7fb_100%)] px-6 py-8 md:px-8 md:py-10">
              <span className="inline-flex rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
                DAYPIC CHECKLIST
              </span>

              <h1 className="mt-4 text-[32px] font-black leading-[1.15] tracking-[-0.05em] text-[#272246] md:text-[40px]">
                결혼 준비
                <br />
                체크리스트
              </h1>

              <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[#6f6886]">
                결혼 준비를 하면서 놓치기 쉬운 항목들을 한 번에 정리했어요.
                중요한 순서대로 체크하고, 준비 현황도 바로 확인할 수 있어요.
              </p>

              <div className="mt-7 rounded-[24px] border border-white/60 bg-white/85 p-5 shadow-[0_14px_28px_rgba(90,70,140,0.07)]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-semibold text-[#8f84a8]">
                      현재 진행률
                    </p>
                    <p className="mt-1 text-[28px] font-black tracking-[-0.04em] text-[#2f2947]">
                      {progress}%
                    </p>
                  </div>

                  <div className="rounded-[18px] bg-[#f5f0ff] px-4 py-3 text-right">
                    <p className="text-[12px] font-semibold text-[#8f84a8]">
                      완료한 항목
                    </p>
                    <p className="mt-1 text-[20px] font-black text-[#6d46f6]">
                      {checkedCount}
                      <span className="ml-1 text-[14px] text-[#8f84a8]">
                        / {totalCount}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-3 w-full overflow-hidden rounded-full bg-[#ece4fb]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7a5cff_0%,#d45abf_100%)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#6d46f6] px-4 text-[14px] font-semibold text-white transition hover:translate-y-[-1px]"
                  >
                    전체 선택
                  </button>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#e3daf2] bg-white px-4 text-[14px] font-semibold text-[#5f587a] transition hover:bg-[#faf7ff]"
                  >
                    전체 해제
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 md:px-8 md:py-10">
              <div className="rounded-[24px] border border-[#ece4f4] bg-[#fcfaff] p-5">
                <p className="text-[13px] font-semibold text-[#8f84a8]">
                  안내
                </p>
                <p className="mt-2 text-[15px] leading-7 text-[#625b7d]">
                  아래 결과 요약 카드가 PDF로 저장돼. 체크를 먼저 하고 저장해봐요.
                </p>
              </div>

              <div className="mt-5 space-y-4">
                {checklistSections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-[24px] border border-[#ece4f4] bg-white p-5 shadow-[0_10px_26px_rgba(80,60,120,0.05)]"
                  >
                    <div className="mb-4">
                      <h2 className="text-[20px] font-bold tracking-[-0.03em] text-[#2f2947]">
                        {section.title}
                      </h2>
                      <p className="mt-1 text-[14px] leading-6 text-[#7a7296]">
                        {section.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {section.items.map((item) => {
                        const isChecked = checkedItems.includes(item);

                        return (
                          <label
                            key={item}
                            className={`flex cursor-pointer items-center gap-3 rounded-[18px] border px-4 py-4 transition ${
                              isChecked
                                ? "border-[#d8c9ff] bg-[#f6f0ff]"
                                : "border-[#eee7f6] bg-[#fcfbff] hover:bg-[#faf7ff]"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleItem(item)}
                              className="h-5 w-5 rounded border-[#c9b9ee] text-[#6d46f6] focus:ring-[#6d46f6]"
                            />

                            <div className="min-w-0 flex-1">
                              <p
                                className={`text-[15px] font-semibold ${
                                  isChecked ? "text-[#5a3fd6]" : "text-[#342e4f]"
                                }`}
                              >
                                {item}
                              </p>
                            </div>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                isChecked
                                  ? "bg-white text-[#6d46f6]"
                                  : "bg-[#f2ecfb] text-[#8a82a6]"
                              }`}
                            >
                              {isChecked ? "완료" : "대기"}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          ref={pdfTargetRef}
          className="mx-auto mt-8 max-w-[900px] rounded-[32px] border border-[#ece4f4] bg-white p-8 shadow-[0_18px_40px_rgba(90,70,140,0.08)]"
        >
          <div className="flex items-start justify-between gap-6 border-b border-[#efe8f7] pb-6">
            <div>
              <img
                src="/daypic_logo.png"
                alt="daypic logo"
                className="h-10 w-auto object-contain"
              />
              <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8f84a8]">
                Wedding Checklist Summary
              </p>
              <h2 className="mt-2 text-[30px] font-black tracking-[-0.04em] text-[#272246]">
                나의 결혼 준비 현황
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#6f6886]">
                체크한 항목만 정리한 저장용 결과 카드예요.
              </p>
            </div>

            <div className="rounded-[22px] bg-[#f6f0ff] px-5 py-4 text-right">
              <p className="text-[12px] font-semibold text-[#8f84a8]">진행률</p>
              <p className="mt-1 text-[26px] font-black text-[#6d46f6]">
                {progress}%
              </p>
              <p className="mt-1 text-[13px] text-[#7a7296]">
                {checkedCount} / {totalCount} 완료
              </p>
            </div>
          </div>

          <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-[#ece4fb]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#7a5cff_0%,#d45abf_100%)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-8 space-y-5">
            {checklistSections.map((section) => {
              const completedInSection = section.items.filter((item) =>
                checkedItems.includes(item)
              );

              if (completedInSection.length === 0) return null;

              return (
                <div
                  key={section.title}
                  className="rounded-[24px] border border-[#ece4f4] bg-[#fcfaff] p-5"
                >
                  <h3 className="text-[18px] font-bold text-[#2f2947]">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-[13px] leading-6 text-[#7a7296]">
                    {section.description}
                  </p>

                  <div className="mt-4 grid gap-3">
                    {completedInSection.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-[16px] border border-[#ddd2f3] bg-white px-4 py-3"
                      >
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#efe7ff] text-[13px] font-bold text-[#6d46f6]">
                          ✓
                        </span>
                        <p className="text-[14px] font-semibold text-[#352f50]">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {checkedCount === 0 && (
              <div className="rounded-[24px] border border-dashed border-[#d9cfee] bg-[#fcfaff] px-6 py-10 text-center">
                <p className="text-[20px] font-bold text-[#2f2947]">
                  아직 체크한 항목이 없어요
                </p>
                <p className="mt-2 text-[14px] leading-6 text-[#7a7296]">
                  왼쪽 체크리스트에서 항목을 선택한 뒤 다시 PDF를 저장해봐요.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}