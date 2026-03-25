import Link from "next/link";

type TipSection = {
  title: string;
  description: string;
  tips: {
    title: string;
    body: string;
  }[];
};

const tipSections: TipSection[] = [
  {
    title: "작가 선택 꿀팁",
    description: "본식 스냅과 영상 작가를 고를 때 가장 먼저 봐야 할 포인트예요.",
    tips: [
      {
        title: "사진 톤이 내 취향과 맞는지 먼저 확인해요",
        body: "밝고 화사한지, 차분하고 감성적인지, 피부 표현은 어떤지 먼저 보는 게 중요해요.",
      },
      {
        title: "가격보다 포함 범위를 같이 비교해요",
        body: "보정본 수, 원본 제공 여부, 촬영 시간, 출장비 포함 여부를 함께 비교해야 해요.",
      },
      {
        title: "계약 전 납품 일정은 꼭 확인해요",
        body: "예식 후 원본과 보정본을 언제 받을 수 있는지 미리 알아두는 게 좋아.",
      },
    ],
  },
  {
    title: "계약 전에 꼭 확인할 것",
    description: "나중에 아쉬움이 남지 않게, 계약 전에 꼭 짚고 넘어가야 하는 내용이예요.",
    tips: [
      {
        title: "추가 비용 발생 조건을 확인해요",
        body: "출장비, 연장 촬영비, 주차비, 원판 촬영 여부 등 추가 비용이 생길 수 있는 항목을 미리 확인해요.",
      },
      {
        title: "촬영 범위를 명확히 물어봐요",
        body: "신부대기실, 본식, 가족사진, 폐백까지 어디까지 포함되는지 정확히 확인하는 게 좋아요.",
      },
      {
        title: "취소 및 일정 변경 규정을 체크해요",
        body: "예식 일정 변경이나 취소가 생길 경우 환불 규정이 어떻게 되는지 미리 알아야 해요.",
      },
    ],
  },
  {
    title: "예식 당일 꿀팁",
    description: "당일 흐름과 결과물을 위해 미리 챙기면 좋은 포인트들이예요.",
    tips: [
      {
        title: "촬영팀에게 타임라인을 미리 공유해요",
        body: "예식 당일 순서와 시간을 미리 공유하면 중요한 장면 누락을 줄일 수 있어요.",
      },
      {
        title: "꼭 찍고 싶은 인물이나 장면을 전달해요",
        body: "부모님, 친구, 특별한 이벤트 장면이 있다면 사전에 전달하는 게 좋아요.",
      },
      {
        title: "신부대기실과 본식장 조명을 체크해요",
        body: "조명 환경에 따라 사진 분위기가 달라질 수 있어서 미리 확인하면 훨씬 좋아요.",
      },
      {
        title: "식권은 예식전날 미리 따로 챙겨두면 좋아요",
        body: "미리 따로 챙겨두면 웨딩홀 도착해서 바로 관계자에게 전달하면 시간을 단축하고 사진을 더 많이 찍을 수 있어요"
      }
    
    ],
  },
  {
    title: "준비 전반 꿀팁",
    description: "전체 결혼 준비를 조금 더 편하게 만드는 실전 팁이예요.",
    tips: [
      {
        title: "준비 항목은 한 번에 다 하지 말고 나눠서 해요",
        body: "체크리스트 기준으로 큰 항목부터 하나씩 정리하면 훨씬 덜 지치고 놓치는 것도 줄어들어요.",
      },
      {
        title: "비교할 때는 감정 말고 기준표를 만들어요",
        body: "가격, 스타일, 후기, 포함 범위를 표처럼 정리하면 선택이 훨씬 쉬워져요.",
      },
      {
        title: "무조건 많은 옵션보다 나에게 맞는 선택이 중요해요",
        body: "유행보다 내가 원하는 분위기와 만족도를 기준으로 고르는 게 결과적으로 후회가 적어요.",
      },
    ],
  },
];

export default function TipsPage() {
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
              href="/checklist"
              className="inline-flex h-11 items-center justify-center rounded-[14px] border border-[#e6ddf2] bg-white px-4 text-[14px] font-semibold text-[#5f587a] transition hover:bg-[#faf7ff]"
            >
              체크리스트 보기
            </Link>
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#6d46f6] px-4 text-[14px] font-semibold text-white shadow-[0_10px_24px_rgba(109,70,246,0.24)] transition hover:translate-y-[-1px]"
            >
              작가 찾으러 가기
            </Link>
          </div>
        </header>

        <section className="overflow-hidden rounded-[32px] border border-[#ece4f4] bg-white shadow-[0_20px_44px_rgba(80,60,120,0.08)]">
          <div className="grid gap-0 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="bg-[linear-gradient(135deg,#f4edff_0%,#efe7fb_100%)] px-6 py-8 md:px-8 md:py-10">
              <span className="inline-flex rounded-full bg-white/85 px-3 py-1 text-[12px] font-semibold text-[#7b5cf6]">
                DAYPIC WEDDING TIPS
              </span>

              <h1 className="mt-4 text-[32px] font-black leading-[1.15] tracking-[-0.05em] text-[#272246] md:text-[40px]">
                결혼 준비
                <br />
                꿀팁 모음
              </h1>

              <p className="mt-4 max-w-[520px] text-[15px] leading-7 text-[#6f6886]">
                결혼 준비를 하면서 자주 놓치는 포인트들을 한 번에 정리했어요.
                본식 촬영, 계약, 일정, 준비 흐름까지 실제로 도움 되는 팁만 담았어요.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-[24px] border border-white/60 bg-white/85 p-5 shadow-[0_14px_28px_rgba(90,70,140,0.07)]">
                  <p className="text-[13px] font-semibold text-[#8f84a8]">
                    이런 사람에게 추천해요
                  </p>
                  <ul className="mt-3 space-y-2 text-[14px] leading-6 text-[#5f587a]">
                    <li>• 결혼 준비 순서가 헷갈리는 예비부부</li>
                    <li>• 본식 스냅/영상 작가 선택이 고민되는 사람</li>
                    <li>• 계약 전에 무엇을 봐야 하는지 알고 싶은 사람</li>
                  </ul>
                </div>

                <div className="rounded-[24px] border border-white/60 bg-white/85 p-5 shadow-[0_14px_28px_rgba(90,70,140,0.07)]">
                  <p className="text-[13px] font-semibold text-[#8f84a8]">
                    DAYPIC 한마디
                  </p>
                  <p className="mt-3 text-[14px] leading-7 text-[#5f587a]">
                    좋은 작가는 사진만 잘 찍는 사람이 아니라, 예식 흐름을 이해하고
                    소통이 잘 되는 사람이야. 내 취향과 예식 분위기에 맞는 작가를
                    찾는 게 가장 중요해요.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 md:px-8 md:py-10">
              <div className="space-y-5">
                {tipSections.map((section) => (
                  <section
                    key={section.title}
                    className="rounded-[26px] border border-[#ece4f4] bg-[#fcfbff] p-5 shadow-[0_10px_26px_rgba(80,60,120,0.05)]"
                  >
                    <div className="mb-4">
                      <p className="inline-flex rounded-full bg-[#f3ecff] px-3 py-1 text-[11px] font-semibold text-[#7b5cf6]">
                        TIP SECTION
                      </p>
                      <h2 className="mt-3 text-[22px] font-bold tracking-[-0.03em] text-[#2f2947]">
                        {section.title}
                      </h2>
                      <p className="mt-2 text-[14px] leading-6 text-[#7a7296]">
                        {section.description}
                      </p>
                    </div>

                    <div className="space-y-3">
                      {section.tips.map((tip) => (
                        <article
                          key={tip.title}
                          className="rounded-[20px] border border-[#ebe4f4] bg-white p-4"
                        >
                          <h3 className="text-[16px] font-semibold leading-6 text-[#342e4f]">
                            {tip.title}
                          </h3>
                          <p className="mt-2 text-[14px] leading-7 text-[#6f6886]">
                            {tip.body}
                          </p>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}