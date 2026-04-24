"use client";

import { useEffect, useMemo, useState } from "react";
import { useMe } from "@/lib/queries/me";
import {
  useArtistClosed,
  useAddClosedDate,
  useDeleteClosedDate,
} from "@/lib/queries/artist-closed";

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
};

type MeResponse = {
  ok: boolean;
  isLoggedIn: boolean;
  isArtist: boolean;
  artistId: string | null;
  artistCode?: string | null;
  kakaoId?: string | null;
  email: string | null;
  name: string | null;
  dbError?: boolean;
};

function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getMonthLabel(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
}

function buildCalendarDays(currentMonth: Date): CalendarDay[] {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const date = new Date(year, month - 1, day);
    days.push({
      date: formatDate(date),
      day,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date: formatDate(date),
      day,
      isCurrentMonth: true,
    });
  }

  while (days.length < 42) {
    const day = days.length - (startDayOfWeek + daysInMonth) + 1;
    const date = new Date(year, month + 1, day);
    days.push({
      date: formatDate(date),
      day,
      isCurrentMonth: false,
    });
  }

  return days;
}

export default function ArtistCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState("");
  const [message, setMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  const days = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);

  const { data: meData, isLoading: isMeLoading, isError: isMeError } = useMe();

  // 세션 정보는 useMe 데이터에서 직접 파생 (useState + useEffect setState 불필요)
  const sessionArtistId = meData?.artistId ?? "";
  const sessionEmail = meData?.email ?? "";
  const dbError = meData?.dbError === true;
  const sessionReady =
    !isMeLoading &&
    !isMeError &&
    !!meData?.isLoggedIn &&
    !!meData?.isArtist &&
    !!meData?.artistId;

  // 리다이렉트 분기만 useEffect 로 (부수 효과)
  useEffect(() => {
    if (isMeLoading) return;
    if (isMeError || !meData || !meData.isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    if (!meData.isArtist || !meData.artistId) {
      window.location.href = "/artist-register";
    }
  }, [isMeLoading, isMeError, meData]);

  useEffect(() => {
    if (!selectedDate && days.length > 0) {
      const firstCurrent = days.find((d) => d.isCurrentMonth)?.date || days[0].date;
      setSelectedDate(firstCurrent);
    }
  }, [days, selectedDate]);

  const closedQuery = useArtistClosed(sessionReady && !!sessionArtistId);
  const blockedDates = closedQuery.data?.dates ?? [];
  const isLoading = closedQuery.isLoading;
  const isBlocked = selectedDate ? blockedDates.includes(selectedDate) : false;

  // 쿼리 에러도 파생값으로 (setState 불필요)
  const closedQueryError = closedQuery.isError
    ? closedQuery.error instanceof Error
      ? closedQuery.error.message
      : "일정 정보를 불러오지 못했어."
    : "";
  const error = submitError || closedQueryError;

  const addClosedMutation = useAddClosedDate();
  const deleteClosedMutation = useDeleteClosedDate();
  const isSaving = addClosedMutation.isPending || deleteClosedMutation.isPending;

  async function handleRegisterBlocked() {
    if (!selectedDate || !sessionArtistId || isSaving) return;
    try {
      setSubmitError("");
      setMessage("");
      const data = await addClosedMutation.mutateAsync(selectedDate);
      setMessage(
        data.duplicated
          ? "이미 등록된 촬영 불가 날짜야."
          : "촬영 불가 날짜가 등록되었어."
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "촬영 불가 날짜 등록 중 오류가 발생했어."
      );
    }
  }

  async function handleReleaseBlocked() {
    if (!selectedDate || !sessionArtistId || isSaving) return;

    try {
      setSubmitError("");
      setMessage("");
      await deleteClosedMutation.mutateAsync(selectedDate);
      setMessage("촬영 불가 날짜가 해제되었어.");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "촬영 불가 날짜 해제 중 오류가 발생했어."
      );
    }
  }

  function moveMonth(offset: number) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  }

  return (
    <main className="page">
      <div className="wrap">
        <div className="header">
          <div className="badge">DAYPIC 일정관리</div>
          <h1>작가 일정관리</h1>
          <p>
            촬영 불가 날짜를 등록하거나 해제할 수 있습니다.
            <br />
            예약 취소 시 다시 촬영 가능 상태로 변경할 수 있어요.
          </p>
        </div>

        <div className="notice">
          <span>⚡</span>
          <span>보라색 점이 있는 날짜는 현재 촬영 불가 상태입니다.</span>
        </div>

        {!sessionReady && <div className="info">로그인 정보를 확인하는 중...</div>}
        {isLoading && <div className="info">등록된 날짜를 불러오는 중...</div>}
        {dbError && (
          <div className="alert error">
            데이터 서버 연결이 일시적으로 불안정해. 잠시 후 다시 시도해줘.
          </div>
        )}
        {!!error && <div className="alert error">{error}</div>}
        {!!message && <div className="alert success">{message}</div>}

        <section className="calendarCard">
          <div className="calendarTop">
            <button type="button" className="navBtn" onClick={() => moveMonth(-1)}>
              ‹
            </button>
            <h2>{getMonthLabel(currentMonth)}</h2>
            <button type="button" className="navBtn" onClick={() => moveMonth(1)}>
              ›
            </button>
          </div>

          <div className="weekdays">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="daysGrid">
            {days.map((day) => {
              const blocked = blockedDates.includes(day.date);
              const selected = selectedDate === day.date;

              return (
                <button
                  key={day.date}
                  type="button"
                  className={`dayBtn ${selected ? "selected" : ""} ${
                    day.isCurrentMonth ? "" : "muted"
                  }`}
                  onClick={() => setSelectedDate(day.date)}
                >
                  {day.day}
                  {blocked && <span className="dot" />}
                </button>
              );
            })}
          </div>
        </section>

        <section className="actionCard">
          <div>
            <div className="label">선택한 날짜</div>
            <div className="date">{selectedDate || "-"}</div>
            <div className="status">현재 상태: {isBlocked ? "촬영 불가" : "촬영 가능"}</div>
            {!!sessionEmail && <div className="subinfo">{sessionEmail}</div>}
          </div>

          <div className="buttons">
            <button
              type="button"
              className="primaryBtn"
              onClick={handleRegisterBlocked}
              disabled={!selectedDate || !sessionArtistId || isSaving}
            >
              {isSaving ? "처리 중..." : "촬영 불가 등록"}
            </button>

            <button
              type="button"
              className="secondaryBtn"
              onClick={handleReleaseBlocked}
              disabled={!selectedDate || !sessionArtistId || isSaving}
            >
              해제
            </button>
          </div>
        </section>
      </div>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 40px 20px 70px;
          background: radial-gradient(
              circle at top center,
              rgba(114, 91, 255, 0.08) 0%,
              rgba(255, 255, 255, 0) 34%
            ),
            linear-gradient(180deg, #fbfaff 0%, #ffffff 100%);
        }

        .wrap {
          max-width: 1100px;
          margin: 0 auto;
          font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo",
            "Noto Sans KR", sans-serif;
        }

        .header {
          text-align: center;
          margin-bottom: 26px;
        }

        .badge {
          display: inline-block;
          padding: 8px 14px;
          border-radius: 999px;
          background: #f1edff;
          border: 1px solid #ddd5ff;
          color: #5d4ae6;
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 14px;
        }

        h1 {
          margin: 0 0 12px;
          font-size: 40px;
          line-height: 1.3;
          font-weight: 800;
          color: #22164d;
          letter-spacing: -0.03em;
        }

        .header p {
          margin: 0;
          font-size: 17px;
          line-height: 1.8;
          color: #655d84;
        }

        .notice {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 10px;
          margin: 0 auto 24px;
          padding: 14px 18px;
          max-width: 760px;
          border-radius: 18px;
          background: #f4f0ff;
          color: #4b3f85;
          font-size: 15px;
          font-weight: 600;
          text-align: center;
        }

        .info,
        .alert {
          margin-bottom: 16px;
          padding: 14px 16px;
          border-radius: 14px;
          text-align: center;
          font-weight: 700;
        }

        .info {
          background: #f4f0ff;
          color: #4b3f85;
        }

        .alert.error {
          background: #fff2f2;
          color: #a33a3a;
        }

        .alert.success {
          background: #eefaf1;
          color: #237247;
        }

        .calendarCard {
          background: #ffffff;
          border: 1px solid #ece8fb;
          border-radius: 28px;
          box-shadow: 0 14px 36px rgba(54, 36, 138, 0.08);
          padding: 28px 24px 24px;
        }

        .calendarTop {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .calendarTop h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          color: #24174f;
        }

        .navBtn {
          width: 42px;
          height: 42px;
          border: 1px solid #ddd5ff;
          border-radius: 12px;
          background: #fff;
          color: #5d4ae6;
          font-size: 24px;
          cursor: pointer;
        }

        .weekdays,
        .daysGrid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 10px;
        }

        .weekdays {
          margin-bottom: 10px;
        }

        .weekdays div {
          text-align: center;
          font-size: 15px;
          font-weight: 700;
          color: #7b7398;
          padding: 8px 0;
        }

        .dayBtn {
          position: relative;
          min-height: 86px;
          border-radius: 18px;
          background: #ffffff;
          border: 1px solid #ece8fb;
          color: #2c2157;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
        }

        .dayBtn.selected {
          background: #f3efff;
          border: 2px solid #6e57ff;
        }

        .dayBtn.muted {
          color: #c1bdd4;
          background: #fbfaff;
        }

        .dot {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #6e57ff;
        }

        .actionCard {
          margin-top: 20px;
          background: #ffffff;
          border: 1px solid #ece8fb;
          border-radius: 22px;
          box-shadow: 0 10px 28px rgba(54, 36, 138, 0.06);
          padding: 20px 22px;
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .label {
          font-size: 13px;
          color: #817aa0;
          margin-bottom: 6px;
          font-weight: 700;
        }

        .date {
          font-size: 24px;
          font-weight: 800;
          color: #24174f;
          margin-bottom: 6px;
        }

        .status {
          font-size: 14px;
          font-weight: 700;
          color: #6b6292;
        }

        .subinfo {
          margin-top: 8px;
          font-size: 13px;
          color: #8a82a8;
        }

        .buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .primaryBtn,
        .secondaryBtn {
          height: 48px;
          padding: 0 22px;
          border-radius: 14px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
        }

        .primaryBtn {
          border: none;
          background: #6c4eff;
          color: #fff;
        }

        .primaryBtn:disabled {
          background: #cfc9f6;
          cursor: not-allowed;
        }

        .secondaryBtn {
          border: 1px solid #d9d2f6;
          background: #fff;
          color: #4e4572;
        }

        .secondaryBtn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          h1 {
            font-size: 30px;
          }

          .dayBtn {
            min-height: 68px;
            font-size: 18px;
          }

          .actionCard {
            flex-direction: column;
            align-items: stretch;
          }
        }

        @media (max-width: 640px) {
          .page {
            padding: 26px 14px 40px;
          }

          .calendarCard {
            padding: 18px 14px 16px;
            border-radius: 20px;
          }

          .calendarTop h2 {
            font-size: 22px;
          }

          .dayBtn {
            min-height: 54px;
            font-size: 16px;
            border-radius: 14px;
          }

          .weekdays div {
            font-size: 13px;
          }

          .date {
            font-size: 20px;
          }

          .primaryBtn,
          .secondaryBtn {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}