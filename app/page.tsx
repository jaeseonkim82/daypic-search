import Link from "next/link";

const ADMIN_INQUIRY_URL = "https://pf.kakao.com/_YOUR_CHANNEL_LINK";

const headerButtonClass =
  "inline-flex h-[44px] min-w-[116px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-5 text-[14px] font-semibold text-[#4d426b] transition-colors duration-200 hover:border-[#2c2448] hover:bg-[#2c2448] hover:text-white active:border-[#2c2448] active:bg-[#2c2448] active:text-white";

  const primaryButtonClass =
   "inline-flex h-[54px] min-w-[176px] items-center justify-center rounded-full border border-[#7a5cf6] bg-white px-6 text-[15px] font-semibold text-[#7a5cf6] transition-all duration-200 hover:bg-[#2c2448] hover:text-white hover:border-[#2c2448] hover:shadow-[0_10px_24px_rgba(44,36,72,0.22)] active:bg-[#2c2448] active:text-white";
   const secondaryButtonClass =
  "inline-flex h-[54px] min-w-[176px] items-center justify-center rounded-full border border-[#7a5cf6] bg-white px-6 text-[15px] font-semibold text-[#7a5cf6] transition-all duration-200 hover:bg-[#2c2448] hover:text-white hover:border-[#2c2448] hover:shadow-[0_10px_24px_rgba(44,36,72,0.22)] active:bg-[#2c2448] active:text-white";
  const cardButtonClass =
  "mt-6 inline-flex h-[48px] w-full items-center justify-center rounded-[16px] border border-[#e3d8f4] bg-[#f7f2ff] text-center text-[14px] font-semibold text-[#5d47cb] transition hover:bg-[#6d46f6] hover:text-white";

const faqItems = [
  {
    q: "데이픽 이용이나 검색 서비스에 별도 수수료가 있나요?",
    a: "아니요. 데이픽은 사용자가 원하는 날짜에 촬영 가능한 작가를 더 빠르게 찾을 수 있도록 돕는 플랫폼이며, 현재 검색과 탐색 과정에서 별도 이용 수수료는 없습니다.",
  },
  {
    q: "표시된 가격은 확정 금액인가요?",
    a: "작가가 등록한 기준 가격을 바탕으로 표시됩니다. 실제 촬영 구성이나 추가 옵션에 따라 세부 비용은 달라질 수 있으므로, 최종 금액은 작가님과 직접 상담 후 확인하시는 것이 가장 정확합니다.",
  },
  {
    q: "원하는 날짜에 작가가 보이지 않는 경우는 오류인가요?",
    a: "오류가 아니라 해당 날짜에 촬영 가능 일정이 등록된 작가가 없거나, 선택하신 조건에 맞는 작가가 없는 경우일 수 있습니다. 날짜나 조건을 조금 조정하여 다시 검색해보시는 것을 권장드립니다.",
  },
  {
    q: "작가와의 문의는 어떻게 진행되나요?",
    a: "검색 결과와 상세페이지에서 작가별 문의 링크를 통해 직접 문의하실 수 있습니다. 데이픽은 가능한 작가를 빠르게 찾는 데 집중하고 있으며, 실제 상담과 예약은 작가님과 직접 진행됩니다.",
  },
  {
    q: "데이픽은 어떤 사용자에게 가장 잘 맞나요?",
    a: "예식 날짜가 이미 정해져 있고, 해당 날짜에 실제 촬영 가능한 작가를 먼저 빠르게 확인하고 싶은 분들께 특히 잘 맞습니다. 복잡한 비교보다 빠른 탐색과 문의 연결을 원하시는 분들께 적합합니다.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#faf7fc] text-[#251f3c]">
      <header className="sticky top-0 z-40 border-b border-[#ece4f5] bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-4 md:px-8">
          <Link href="/" className="inline-flex items-center">
            <img
              src="/daypic_logo.png"
              alt="DayPic 로고"
              className="h-11 w-auto object-contain"
            />
          </Link>

          <nav className="hidden items-center gap-3 md:flex">
            <Link href="/search" className={headerButtonClass}>
              가능한 작가 찾기
            </Link>
            <Link href="/artist-dashboard" className={headerButtonClass}>
              작가 대시보드
            </Link>
            <a
              href={ADMIN_INQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={headerButtonClass}
            >
              관리자 문의
            </a>
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/search"
              className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-4 text-[12px] font-semibold text-[#4d426b]"
            >
              작가 찾기
            </Link>
            <a
              href={ADMIN_INQUIRY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-[40px] min-w-[92px] items-center justify-center rounded-full border border-[#dccff2] bg-white px-4 text-[12px] font-semibold text-[#4d426b]"
            >
              문의하기
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 md:pt-10">
        <section className="relative overflow-hidden rounded-[38px] border border-[#eee5f7] bg-[radial-gradient(circle_at_top_left,_rgba(164,133,255,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(244,170,214,0.18),_transparent_24%),linear-gradient(135deg,_#ffffff_0%,_#fcf9ff_52%,_#f8f3fb_100%)] p-6 shadow-[0_18px_50px_rgba(95,71,147,0.08)] md:p-8 xl:p-10">
          <div className="grid gap-8 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="max-w-[720px]">
              <div className="inline-flex rounded-full border border-[#eadff8] bg-white/85 px-4 py-2 text-[12px] font-semibold text-[#7a5cf6] shadow-sm">
                DAYPIC HOME
              </div>

              <h1 className="mt-5 text-[36px] font-black leading-[1.16] tracking-[-0.06em] text-[#2a2444] md:text-[58px]">
                원하는 날짜에
                <br />
                촬영 가능한 작가를
                <br />
                <span className="text-[#7a5cf6]">더 빠르게 찾아보세요</span>
              </h1>

              <p className="mt-5 max-w-[620px] text-[16px] leading-8 text-[#6f6888]">
                데이픽은 예식 날짜와 조건을 기준으로, 현재 촬영 가능한 작가를
                더 빠르게 찾을 수 있도록 돕는 플랫폼입니다. 복잡한 비교보다
                정확한 탐색과 빠른 문의 연결에 집중했습니다.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/search" className={primaryButtonClass}>
                  가능한 작가 찾기
                </Link>
                <Link href="/artist-dashboard" className={secondaryButtonClass}>
                  작가 대시보드
                </Link>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-[22px] border border-[#e8def4] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f2ebff] text-[20px]">
                    📅
                  </div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                    날짜 기준
                  </p>
                  <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
                    정확한 탐색
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
                    원하는 예식 날짜에 촬영 가능한 작가를 먼저 확인하실 수 있습니다.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#e8def4] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff1f7] text-[20px]">
                    🎛️
                  </div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                    조건 필터
                  </p>
                  <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
                    서비스 맞춤
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
                    서비스, 지역, 예산 조건을 기준으로 원하는 작가를 좁혀보실 수 있습니다.
                  </p>
                </div>

                <div className="rounded-[22px] border border-[#e8def4] bg-white/92 p-5 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef5ff] text-[20px]">
                    💬
                  </div>
                  <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                    빠른 문의
                  </p>
                  <p className="mt-1 text-[20px] font-black tracking-[-0.04em] text-[#2b2745]">
                    바로 연결
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
                    작가 상세페이지를 확인하고 문의 링크를 통해 빠르게 직접 연결됩니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="self-start rounded-[34px] border border-[#ebe2f6] bg-white/86 p-5 shadow-[0_16px_36px_rgba(94,72,145,0.10)] md:p-6">
              <div className="rounded-[28px] border border-[#ece3f7] bg-[linear-gradient(180deg,_#ffffff_0%,_#fcf9ff_100%)] p-5 md:p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9d91b4]">
                  빠르게 시작하기
                </p>

                <h2 className="mt-3 text-[34px] font-black leading-[1.2] tracking-[-0.05em] text-[#2c2646]">
                  복잡한 비교보다
                  <br />
                  빠른 탐색이 먼저입니다
                </h2>

                <p className="mt-4 text-[15px] leading-7 text-[#786f92]">
                  날짜를 먼저 정하고, 서비스와 지역을 맞춰보신 뒤 현재 가능한
                  작가를 찾는 흐름으로 더 직관적으로 이동하실 수 있습니다.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[20px] bg-[#f5efff] px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[18px] shadow-sm">
                        📅
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                          STEP 1
                        </p>
                        <p className="mt-1 text-[17px] font-bold text-[#2c2646]">
                          예식 날짜를 선택해주세요
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#fff3f8] px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[18px] shadow-sm">
                        🎯
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                          STEP 2
                        </p>
                        <p className="mt-1 text-[17px] font-bold text-[#2c2646]">
                          서비스 · 지역 · 예산 조건을 확인해주세요
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[20px] bg-[#eef5ff] px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-white text-[18px] shadow-sm">
                        💌
                      </div>
                      <div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8a7eb0]">
                          STEP 3
                        </p>
                        <p className="mt-1 text-[17px] font-bold text-[#2c2646]">
                          가능한 작가를 확인하신 뒤 바로 문의해주세요
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Link
                  href="/search"
                  className="mt-6 inline-flex h-[54px] w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7b5cf6] to-[#d75eb6] text-[15px] font-semibold text-white transition hover:translate-y-[-1px] hover:shadow-[0_14px_26px_rgba(123,92,246,0.25)]"
                >
                  가능한 작가 찾기
                </Link>
              </div>
            </div>
          </div>
        </section>

       <section className="mt-14 space-y-10">
  {/* 촬영 서비스 소개 섹션 */}
<section className="mt-20">
  <div className="rounded-[34px] border border-[#e8def4] bg-white px-8 py-12 shadow-[0_10px_26px_rgba(60,50,100,0.05)] md:px-12 md:py-14">

    {/* 좌측 텍스트 */}
    <div className="grid gap-12 md:grid-cols-2 md:items-center">
      <div>
        <div className="text-[17px] font-semibold text-[#9a8cff]">
          촬영 서비스 카테고리
        </div>

        <h2 className="mt-3 text-[28px] font-bold leading-[1.4] text-[#2b2340] md:text-[34px]">
          본식스냅부터 스튜디오촬영까지
          <br />
          다양한 촬영 작가님을 찾으실 수 있습니다
        </h2>

        <p className="mt-4 text-[15px] leading-[1.7] text-[#6b6585]">
          데이픽은 날짜 중심 검색을 기반으로, 본식스냅, 영상촬영, 아이폰스냅,
          돌스냅, 야외촬영, 스튜디오촬영 등 다양한 촬영 서비스를 함께 탐색하실 수 있도록 준비하고 있습니다.
        </p>
      </div>

      {/* 우측 카드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">

        {[
          { icon: "💐", title: "본식스냅", desc: "예식 당일의 순간을 담는 촬영" },
          { icon: "📸", title: "서브스냅", desc: "메인 촬영을 보완하는 추가 촬영" },
          { icon: "🎥", title: "영상촬영", desc: "영상으로 기록하는 웨딩 스토리" },
          { icon: "📱", title: "아이폰스냅", desc: "더 자연스럽고 가벼운 촬영" },
          { icon: "🎂", title: "돌스냅", desc: "첫 생일의 소중한 순간 기록" },
          { icon: "🐶", title: "애견스냅", desc: "반려견과 함께하는 특별한 촬영" },
          { icon: "🌿", title: "야외촬영", desc: "자연 속에서 담는 감성 촬영" },
          { icon: "🏛️", title: "스튜디오촬영", desc: "컨셉에 맞춘 연출 촬영" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex flex-col items-center justify-center rounded-[20px] border border-[#eee7ff] bg-[#faf8ff] px-4 py-5 text-center transition hover:shadow-md"
          >
            <div className="mb-2 flex h-[44px] w-[44px] items-center justify-center rounded-full bg-white text-[20px] shadow">
              {item.icon}
            </div>

            <div className="text-[14px] font-semibold text-[#3d3558]">
              {item.title}
            </div>

            <div className="mt-1 text-[12px] leading-[1.5] text-[#8a84a3]">
              {item.desc}
            </div>
          </div>
        ))}

      </div>
    </div>

  </div>
</section>

<section className="mt-20">
  <div className="max-w-6xl mx-auto px-6">
    <div className="text-center">
      <p className="text-[16px] font-semibold tracking-[0.08em] text-[#8a7eb0]">
        DAYPIC POINT
      </p>
      <h2 className="mt-3 text-[30px] md:text-[38px] font-black leading-[1.3] tracking-[-0.05em] text-[#7a5cf6]">
        좋은 작가를 찾는 기준은
        <br className="hidden md:block" />
        생각보다 더 분명합니다
      </h2>
      <p className="mt-4 text-[15px] md:text-[16px] leading-8 text-[#6f6888]">
        취향이 맞는지, 소통이 편한지, 그리고 원하는 날짜에 실제로 가능한지.
        <br className="hidden md:block" />
        데이픽은 그 핵심 기준부터 먼저 확인하실 수 있도록 설계했습니다.
      </p>
    </div>

    <div className="mt-12 grid gap-6 md:grid-cols-3">
      <div className="rounded-[28px] border border-[#e8def4] bg-white p-6 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#f5efff] text-[22px]">
          💜
        </div>
        <p className="mt-5 text-[13px] font-semibold tracking-[0.08em] text-[#8a7eb0]">
          취향
        </p>
        <h3 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#2c2646]">
          내 취향에 맞는 작가
        </h3>
        <p className="mt-3 text-[15px] leading-8 text-[#6f6888]">
          사진은 잘 찍는 것만으로 결정되지 않습니다. 내가 원하는 분위기와 결이 맞는지부터 확인하실 수 있어야 합니다.
        </p>
      </div>

      <div className="rounded-[28px] border border-[#e8def4] bg-white p-6 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#fff3f7] text-[22px]">
          💬
        </div>
        <p className="mt-5 text-[13px] font-semibold tracking-[0.08em] text-[#8a7eb0]">
          소통
        </p>
        <h3 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#2c2646]">
          준비 과정이 편한 작가
        </h3>
        <p className="mt-3 text-[15px] leading-8 text-[#6f6888]">
          문의 후 답변이 늦어질수록 준비 과정은 불안해질 수 있습니다. 빠르게 연결되는 흐름이 중요합니다.
        </p>
      </div>

      <div className="rounded-[28px] border border-[#e8def4] bg-white p-6 shadow-[0_10px_24px_rgba(78,58,130,0.05)]">
        <div className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#eef5ff] text-[22px]">
          📅
        </div>
        <p className="mt-5 text-[13px] font-semibold tracking-[0.08em] text-[#8a7eb0]">
          일정
        </p>
        <h3 className="mt-2 text-[24px] font-black tracking-[-0.04em] text-[#2c2646]">
          원하는 날짜에 가능한 작가
        </h3>
        <p className="mt-3 text-[15px] leading-8 text-[#6f6888]">
          마음에 드는 작가를 찾았더라도 날짜가 맞지 않으면 다시 시작해야 합니다. 데이픽은 그 비효율을 줄입니다.
        </p>
      </div>
    </div>

    <div className="mt-10 rounded-[30px] border border-[#e8def4] bg-[#faf7ff] p-6 md:p-8">
  <div className="grid gap-6 lg:grid-cols-[1.1fr_1.9fr] lg:items-center">
    <div>
      <p className="text-[13px] font-semibold tracking-[0.08em] text-[#8a7eb0]">
        이용 흐름
      </p>
      <h3 className="mt-2 text-[28px] font-black tracking-[-0.04em] text-[#2c2646]">
        처음 이용하셔도 어렵지 않게
      </h3>
      <p className="mt-3 text-[15px] leading-7 text-[#6f6888]">
        날짜와 조건을 먼저 정하고, 가능한 작가를 확인한 뒤 바로 문의까지 이어지는 흐름으로 구성했습니다.
      </p>
    </div>

    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-[22px] border border-[#ece4f7] bg-white px-5 py-5 shadow-[0_6px_16px_rgba(60,50,100,0.04)] transition hover:shadow-md">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f3f0ff] text-[20px]">
          📅
        </div>
        <p className="mt-4 text-[12px] font-semibold text-[#8a7eb0]">01</p>
        <p className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#2c2646]">
          날짜와 조건 입력
        </p>
        <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
          예식 날짜와 원하는 촬영 조건을 먼저 선택해주세요.
        </p>
      </div>

      <div className="rounded-[22px] border border-[#ece4f7] bg-white px-5 py-5 shadow-[0_6px_16px_rgba(60,50,100,0.04)] transition hover:shadow-md">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#eef5ff] text-[20px]">
          🔍
        </div>
        <p className="mt-4 text-[12px] font-semibold text-[#8a7eb0]">02</p>
        <p className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#2c2646]">
          가능한 작가 확인
        </p>
        <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
          그 날짜에 실제로 촬영 가능한 작가를 중심으로 확인하실 수 있습니다.
        </p>
      </div>

      <div className="rounded-[22px] border border-[#ece4f7] bg-white px-5 py-5 shadow-[0_6px_16px_rgba(60,50,100,0.04)] transition hover:shadow-md">
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#fff3f7] text-[20px]">
          💬
        </div>
        <p className="mt-4 text-[12px] font-semibold text-[#8a7eb0]">03</p>
        <p className="mt-2 text-[20px] font-black tracking-[-0.03em] text-[#2c2646]">
          바로 문의 연결
        </p>
        <p className="mt-2 text-[14px] leading-6 text-[#6f6888]">
          마음에 드는 작가를 찾으셨다면 상세페이지에서 바로 문의하실 수 있습니다.
        </p>
      </div>
    </div>
  </div>
</div>
  </div>
</section>

  
</section>

        <section className="mt-16">
          <h2 className="text-center text-[34px] font-black tracking-[-0.05em] text-[#2c2646]">
            자주 묻는 질문
          </h2>

          <div className="mx-auto mt-8 max-w-[1100px] space-y-3">
            {faqItems.map((item, index) => (
              <details
                key={item.q}
                className="group overflow-hidden rounded-[18px] border border-[#ebe2f6] bg-white shadow-[0_8px_18px_rgba(60,50,100,0.04)]"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-5 text-[16px] font-semibold text-[#3d355c]">
                  <span>
                    Q{index + 1}. {item.q}
                  </span>
                  <span className="text-[18px] text-[#7a5cf6] transition group-open:rotate-180">
                    ˅
                  </span>
                </summary>
                <div className="border-t border-[#f1ebf8] px-5 py-5 text-[15px] leading-8 text-[#6f6888]">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-[32px] bg-[#2a2148] px-6 py-14 text-center text-white shadow-[0_18px_40px_rgba(42,33,72,0.16)] md:px-10">
          <h2 className="text-[30px] font-black tracking-[-0.05em] md:text-[42px]">
            가장 투명하고 빠른 결혼 준비의 시작
          </h2>

          <p className="mx-auto mt-4 max-w-[860px] text-[15px] leading-8 text-[#d3caf0] md:text-[16px]">
            “작가님, 그날 가능하신가요?”를 반복해서 묻고 기다리기 전에,
            먼저 가능한 작가를 확인하고 바로 연결되는 흐름을 경험해보세요.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/search"
              className="inline-flex h-[52px] min-w-[170px] items-center justify-center rounded-full bg-[#7b5cf6] px-6 text-[15px] font-semibold text-white transition hover:bg-[#8a6aff]"
            >
              나의 작가 찾기
            </Link>
            <Link
              href="/artist-dashboard"
              className="inline-flex h-[52px] min-w-[170px] items-center justify-center rounded-full bg-[#5f49d2] px-6 text-[15px] font-semibold text-white transition hover:bg-[#715de0]"
            >
              작가 대시보드
            </Link>
          </div>
        </section>

        <footer className="mt-8 rounded-[26px] border border-[#e8def4] bg-white px-5 py-5 shadow-[0_10px_26px_rgba(60,50,100,0.05)] md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <img
                src="/daypic_logo.png"
                alt="DayPic 로고"
                className="mt-1 h-10 w-auto object-contain"
              />
              <p className="max-w-[520px] text-[14px] leading-7 text-[#726a8e]">
                원하는 날짜에 촬영 가능한 작가를 더 쉽게 찾으실 수 있도록,
                데이픽은 검색 경험을 계속 다듬고 있습니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link href="/search" className={headerButtonClass}>
                작가 찾기
              </Link>
              <Link href="/artist-dashboard" className={headerButtonClass}>
                작가 대시보드
              </Link>
              <a
                href={ADMIN_INQUIRY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={headerButtonClass}
              >
                문의하기
              </a>
            </div>
          </div>
        </footer>
      </div>

      <a
        href={ADMIN_INQUIRY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex h-[58px] items-center justify-center gap-2 rounded-full bg-[#2c2448] px-5 text-[14px] font-semibold text-white shadow-[0_18px_30px_rgba(44,36,72,0.24)] transition hover:translate-y-[-1px] hover:bg-[#3a2d63]"
      >
        <span className="text-[17px]">💬</span>
        관리자 문의
      </a>
    </main>
  );
}