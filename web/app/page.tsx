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
  // 과목별가중값검증: string;
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
    application: ApplicationResult | null;
    subjects: SubjectResult[];
    semesters: SemesterResult[];
    rankings: RankingResult[];
    finalScore: FinalScoreResult | null;
  };
};

type ApplicationResult = {
  입학연도: number;
  모집시기명: string;
  수험번호: string;
  전형명: string;
  모집단위명: string;
  학생부반영비율: number;
  학생부점수범위: string;
  적용계산식: string;
};

function formatDifference(
  value1: number,
  value2: number,
  verificationResult: string
) {
  if (verificationResult === "일치") {
    return "0.000000";
  }

  const difference = Math.abs(Number(value1) - Number(value2));

  return difference.toFixed(6);
}

const universities = [
  {
    code: "swu",
    shortName: "숭의여대",
    fullName: "숭의여자대학교",
    enabled: true,
  },
  {
    code: "gcu",
    shortName: "가천대",
    fullName: "가천대학교",
    enabled: false,
  },
  {
    code: "snut",
    shortName: "서울과기대",
    fullName: "서울과학기술대학교",
    enabled: false,
  },
  {
    code: "ku",
    shortName: "고려대",
    fullName: "고려대학교",
    enabled: false,
  },
  {
    code: "khu",
    shortName: "경희대",
    fullName: "경희대학교",
    enabled: false,
  },
];

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
    <>
      <header className="site-header">
        <div className="header-inner">
          <div className="brand">

            <div className="brand-text">
              <strong>대학 입학성적 검증 시스템</strong>
            </div>
          </div>

          <nav className="university-nav" aria-label="대학교 선택">
            {universities.map((university) => (
              <button
                key={university.code}
                type="button"
                className={`university-nav-item ${
                  university.code === "swu" ? "active" : ""
                }`}
                disabled={!university.enabled}
                title={
                  university.enabled
                    ? university.fullName
                    : `${university.fullName} 준비 중`
                }
              >
                {university.shortName}

                {!university.enabled && (
                  <span className="coming-soon">준비 중</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="page">
        <section className="search-card">
          <div className="search-card-header">
            <div>
              <span className="university-name">
                숭의여자대학교
              </span>

              <h1>학생부 성적 검증</h1>

              <p>
                수험번호를 입력하면 성적 산출 과정과 최종 점수를 확인할 수 있습니다.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="search-form">
            <div className="input-group">
              <label htmlFor="examNo">수험번호</label>

              <input
                id="examNo"
                type="text"
                value={examNo}
                onChange={(event) => setExamNo(event.target.value)}
                placeholder="예: 01510001"
                autoComplete="off"
              />
            </div>

            <button
              type="submit"
              className="verify-button"
              disabled={loading}
            >
              <span className="button-icon">
                {loading ? "⋯" : "✓"}
              </span>

              <span>{loading ? "검증 중..." : "성적 검증하기"}</span>
            </button>
          </form>

          {message && (
            <div className="search-message">
              <span>!</span>
              <p>{message}</p>
            </div>
          )}
        </section>

      {result && (
        <>
        {result.data.application && (
            <section className="result-section">
              <h2>지원정보</h2>

              <div className="summary-grid">
                <div>
                  <span>입학연도</span>
                  <strong>{result.data.application.입학연도}</strong>
                </div>

                <div>
                  <span>모집시기</span>
                  <strong>{result.data.application.모집시기명}</strong>
                </div>

                <div>
                  <span>수험번호</span>
                  <strong>{result.data.application.수험번호}</strong>
                </div>

                <div>
                  <span>전형</span>
                  <strong>{result.data.application.전형명}</strong>
                </div>

                <div>
                  <span>지원학과</span>
                  <strong>{result.data.application.모집단위명}</strong>
                </div>

                <div className="summary-item-emphasis">
                  <span>학생부 반영비율</span>
                  <strong>{result.data.application.학생부반영비율}%</strong>
                </div>

                <div>
                  <span>학생부 점수범위</span>
                  <strong>{result.data.application.학생부점수범위}</strong>
                </div>

                <div className="summary-item-formula">
                  <span>적용 계산식</span>
                  <strong>{result.data.application.적용계산식}</strong>
                </div>
              </div>
            </section>
          )}
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
                    <th>등급가중값</th>
                    {/* <th>검증</th> */}
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
                      {/* <td>{subject.과목별가중값검증}</td> */}
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
                    <th>등급가중합 검증</th>
                    <th>학기평균 검증</th>
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
                    <th>우수학기순위 검증</th>
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
            <div className="section-header">
              <div>
                <h2>최종 학생부점수</h2>
                <p>우수학기 선정 결과와 최종 환산점수를 확인합니다.</p>
              </div>

              <span
                className={
                  result.data.finalScore.최종점수검증 === "일치"
                    ? "status-badge status-success"
                    : "status-badge status-error"
                }
              >
                {result.data.finalScore.최종점수검증 === "일치"
                  ? "검증 완료"
                  : "재확인 필요"}
              </span>
            </div>

            <div className="final-score-grid">
              <div className="score-card">
                <span className="score-label">우수학기 1</span>

                <strong className="score-main">
                  {result.data.finalScore.우수학기1_학년}학년{" "}
                  {result.data.finalScore.우수학기1_학기}학기
                </strong>

                <span className="score-detail">
                  석차등급 {result.data.finalScore.우수학기1_등급}
                </span>
              </div>

              <div className="score-card">
                <span className="score-label">우수학기 2</span>

                <strong className="score-main">
                  {result.data.finalScore.우수학기2_학년}학년{" "}
                  {result.data.finalScore.우수학기2_학기}학기
                </strong>

                <span className="score-detail">
                  석차등급 {result.data.finalScore.우수학기2_등급}
                </span>
              </div>

              <div className="score-card score-card-highlight">
                <span className="score-label">우수 2개 학기 평균등급</span>

                <strong className="score-main">
                  {result.data.finalScore.우수2개학기_평균등급}
                </strong>

                <div className="comparison-row">
                  <span>재계산값</span>
                  <strong>
                    {result.data.finalScore.재계산_우수2개학기_평균등급}
                  </strong>
                </div>

                <div className="comparison-row">
                  <span>차이</span>
                  <strong>
                    {formatDifference(
                      result.data.finalScore.우수2개학기_평균등급,
                      result.data.finalScore.재계산_우수2개학기_평균등급,
                      result.data.finalScore.우수학기평균검증
                    )}
                  </strong>
                </div>
              </div>

              <div className="score-card score-card-primary">
                <span className="score-label">최종 학생부점수</span>

                <strong className="score-main score-main-large">
                  {result.data.finalScore.학생부점수_1000점}
                </strong>

                <div className="comparison-row">
                  <span>재계산값</span>
                  <strong>
                    {result.data.finalScore.재계산_학생부점수_1000점}
                  </strong>
                </div>

                <div className="comparison-row">
                  <span>차이</span>
                  <strong>
                    {formatDifference(
                      result.data.finalScore.학생부점수_1000점,
                      result.data.finalScore.재계산_학생부점수_1000점,
                      result.data.finalScore.최종점수검증
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>
        )}
        </>
      )}
      </main>
    </>
  );
}