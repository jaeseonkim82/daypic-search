type Props = {
  show: boolean;
  /** 페이지 맥락에 맞게 바꿀 수 있는 안내 문구 */
  message?: string;
  className?: string;
};

const DEFAULT_MESSAGE =
  "데이터 서버 연결이 일시적으로 불안정해. 잠시 후 다시 시도해줘.";

/**
 * /api/me 응답의 dbError=true 시 표시할 공통 배너.
 * Tailwind 기반 스타일. 페이지 레이아웃에 맞춰 mb-6 여백 기본 제공.
 */
export default function DbErrorBanner({ show, message, className }: Props) {
  if (!show) return null;

  return (
    <div
      className={
        className ??
        "mb-6 rounded-[20px] border border-[#f7c2c2] bg-[#fff5f5] px-6 py-4 text-sm text-[#a63838]"
      }
    >
      {message ?? DEFAULT_MESSAGE}
    </div>
  );
}
