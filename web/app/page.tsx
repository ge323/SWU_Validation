"use client";

import { useState } from "react";

export default function Home() {
  const [examNo, setExamNo] = useState("");
  const [message, setMessage] = useState("");

  const handleSearch = async () => {
  const trimmedExamNo = examNo.trim();

  if (!trimmedExamNo) {
    setMessage("수험번호를 입력해주세요.");
    return;
  }

  try {
    setMessage("조회 중입니다.");

    const response = await fetch(
      `/api/verify?examNo=${encodeURIComponent(trimmedExamNo)}`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message ?? "조회에 실패했습니다.");
      return;
    }

    setMessage(
      `${data.message} / 수험번호: ${data.examNo}`
    );

    console.log("API 응답:", data);
  } catch (error) {
    console.error(error);
    setMessage("서버 요청 중 오류가 발생했습니다.");
  }
};

  return (
    <div className="min-h-screen bg-zinc-100 px-6 py-12">
      <main className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-zinc-900">
            숭의여대 성적검증
          </h1>

          <p className="mt-2 text-sm text-zinc-500">
            수험번호를 입력하여 성적 계산 결과를 조회합니다.
          </p>
        </div>

        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <label
            htmlFor="examNo"
            className="mb-2 block text-sm font-semibold text-zinc-700"
          >
            수험번호
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="examNo"
              type="text"
              value={examNo}
              onChange={(event) => setExamNo(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSearch();
                }
              }}
              placeholder="예: 01510001"
              className="h-12 flex-1 rounded-lg border border-zinc-300 bg-white px-4 text-zinc-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={handleSearch}
              className="h-12 rounded-lg bg-blue-600 px-8 font-semibold text-white transition hover:bg-blue-700 active:bg-blue-800"
            >
              조회
            </button>
          </div>

          {message && (
            <p className="mt-4 text-sm text-zinc-600">
              {message}
            </p>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">
          조회 결과가 이 영역에 표시됩니다.
        </section>
      </main>
    </div>
  );
}