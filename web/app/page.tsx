"use client";

import { FormEvent, useState } from "react";

type SubjectResult = {
  입학연도: number;
  모집시기: number;
  수험번호: string;
  학년: number;
  학기: number;
  교과명: string | null;
  과목명: string;
  이수단위: number;
  석차등급: string | null;
  Z점수: number | null;
  적용등급: number | null;
  계산된_과목별등급가중값: number | null;
  과목별가중값검증: string;
  등급산출방법: string | null;
  반영여부: string | null;
};

type SemesterResult = {
  입학연도: number;
  모집시기: number;
  수험번호: string;
  학년: number;
  학기: number;
  반영과목수: number;
  제외과목수: number;
  과목합계_이수단위: number;
  총이수단위: number;
  과목합계_등급가중값: number;
  등급가중합: number;
  학기평균등급: number;
  재계산_학기평균등급: number;
  이수단위검증: string;
  등급가중합검증: string;
  학기평균검증: string;
};

type RankingResult = {
  입학연도: number;
  모집시기: number;
  수험번호: string;
  학년: number;
  학기: number;
  최종학기등급: number;
  우수학기순위: number;
  기대순위: number;
  우수학기순위검증: string;
  우수학기여부: string;
};

type FinalScoreResult = {
  입학연도: number;
  모집시기: number;
  수험번호: string;
  우수학기1_학년: number;
  우수학기1_학기: number;
  우수학기1_등급: number;
  우수학기2_학년: number;
  우수학기2_학기: number;
  우수학기2_등급: number;
  우수2개학기_평균등급: number;
  재계산_우수2개학기_평균등급: number;
  학생부점수_1000점: number;
  재계산_학생부점수_1000점: number;
  우수학기평균검증: string;
  최종점수검증: string;
};

type VerifyResponse = {
  message: string;
  examNo: string;
  data: {
    subjects: SubjectResult[];
    semesters: SemesterResult[];
    rankings: RankingResult[];
    finalScore: FinalScoreResult | null;
  };
};

export default function Home() {
  const [examNo, setExamNo] = useState("01510001");
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedExamNo = examNo.trim();

    if (!trimmedExamNo) {
      setMessage("수험번호를 입력해주세요.");
      setResult(null);
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setResult(null);

      const response = await fetch(
        `/api/verify?examNo=${encodeURIComponent(trimmedExamNo)}`
      );

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.message ?? "성적 검증에 실패했습니다.");
      }

      setResult(body);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "성적 검증 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <section className="search-card">
        <h1>학생부 성적 검증</h1>

        <form onSubmit={handleSubmit} className="search-form">
          <input
            type="text"
            value={examNo}
            onChange={(event) => setExamNo(event.target.value)}
            placeholder="수험번호 입력"
          />

          <button type="submit" disabled={loading}>
            {loading ? "조회 중..." : "검증하기"}
          </button>
        </form>

        {message && <p className="error-message">{message}</p>}
      </section>

      {result && (
        <>
          <section className="result-section">
            <h2>과목별 성적 계산</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>학년</th>
                    <th>학기</th>
                    <th>교과명</th>
                    <th>과목명</th>
                    <th>이수단위</th>
                    <th>석차등급</th>
                    <th>Z점수</th>
                    <th>적용등급</th>
                    <th>가중값</th>
                    <th>검증</th>
                    <th>반영 여부</th>
                  </tr>
                </thead>

                <tbody>
                  {result.data.subjects.map((subject, index) => (
                    <tr
                      key={`${subject.학년}-${subject.학기}-${subject.과목명}-${index}`}
                    >
                      <td>{subject.학년}</td>
                      <td>{subject.학기}</td>
                      <td>{subject.교과명 ?? "-"}</td>
                      <td>{subject.과목명}</td>
                      <td>{subject.이수단위}</td>
                      <td>{subject.석차등급 ?? "-"}</td>
                      <td>{subject.Z점수 ?? "-"}</td>
                      <td>{subject.적용등급 ?? "-"}</td>
                      <td>{subject.계산된_과목별등급가중값 ?? "-"}</td>
                      <td>{subject.과목별가중값검증}</td>
                      <td>{subject.반영여부 ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="result-section">
            <h2>학기별 평균등급 검증</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>학년</th>
                    <th>학기</th>
                    <th>반영과목수</th>
                    <th>제외과목수</th>
                    <th>총이수단위</th>
                    <th>등급가중합</th>
                    <th>학기평균등급</th>
                    <th>재계산 평균등급</th>
                    <th>이수단위 검증</th>
                    <th>가중합 검증</th>
                    <th>평균 검증</th>
                  </tr>
                </thead>

                <tbody>
                  {result.data.semesters.map((semester) => (
                    <tr key={`${semester.학년}-${semester.학기}`}>
                      <td>{semester.학년}</td>
                      <td>{semester.학기}</td>
                      <td>{semester.반영과목수}</td>
                      <td>{semester.제외과목수}</td>
                      <td>{semester.총이수단위}</td>
                      <td>{semester.등급가중합}</td>
                      <td>{semester.학기평균등급}</td>
                      <td>{semester.재계산_학기평균등급}</td>
                      <td>{semester.이수단위검증}</td>
                      <td>{semester.등급가중합검증}</td>
                      <td>{semester.학기평균검증}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="result-section">
            <h2>우수학기 선정 검증</h2>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>학년</th>
                    <th>학기</th>
                    <th>최종학기등급</th>
                    <th>우수학기순위</th>
                    <th>기대순위</th>
                    <th>검증</th>
                    <th>반영 여부</th>
                  </tr>
                </thead>

                <tbody>
                  {result.data.rankings.map((ranking) => (
                    <tr key={`${ranking.학년}-${ranking.학기}`}>
                      <td>{ranking.학년}</td>
                      <td>{ranking.학기}</td>
                      <td>{ranking.최종학기등급}</td>
                      <td>{ranking.우수학기순위}</td>
                      <td>{ranking.기대순위}</td>
                      <td>{ranking.우수학기순위검증}</td>
                      <td>{ranking.우수학기여부}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {result.data.finalScore && (
            <section className="result-section">
              <h2>최종 학생부점수</h2>

              <div className="summary-grid">
                <div>
                  <span>우수학기 1</span>
                  <strong>
                    {result.data.finalScore.우수학기1_학년}학년{" "}
                    {result.data.finalScore.우수학기1_학기}학기 /{" "}
                    {result.data.finalScore.우수학기1_등급}
                  </strong>
                </div>

                <div>
                  <span>우수학기 2</span>
                  <strong>
                    {result.data.finalScore.우수학기2_학년}학년{" "}
                    {result.data.finalScore.우수학기2_학기}학기 /{" "}
                    {result.data.finalScore.우수학기2_등급}
                  </strong>
                </div>

                <div>
                  <span>우수학기 평균등급</span>
                  <strong>
                    {result.data.finalScore.우수2개학기_평균등급}
                  </strong>
                </div>

                <div>
                  <span>학생부점수</span>
                  <strong>
                    {result.data.finalScore.학생부점수_1000점}
                  </strong>
                </div>

                <div>
                  <span>평균 검증</span>
                  <strong>
                    {result.data.finalScore.우수학기평균검증}
                  </strong>
                </div>

                <div>
                  <span>최종점수 검증</span>
                  <strong>{result.data.finalScore.최종점수검증}</strong>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}