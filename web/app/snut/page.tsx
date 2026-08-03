"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type NullableNumber = number | null;
type NullableText = string | null;

type AdmissionType =
  | "고교추천"
  | "재직자"
  | "학생부종합"
  | "논술"
  | "실기"
  | "수시기타"
  | null;

type ApplicationResult = {
  입학연도: string | number;
  모집시기: string | number;
  수험번호: string;
  전형코드: string;
  전형명: string;
  계열명: NullableText;
  모집단위코드: string;
  모집단위명: string;
  전형유형?: NullableText;
  학생부반영비율?: NullableNumber;
  논술반영비율?: NullableNumber;
  실기반영비율?: NullableNumber;
  학생부점수범위?: NullableText;
  적용계산식?: NullableText;
  평가방식?: NullableText;
  반영범위?: NullableText;
  전형구조?: NullableText;
  비교내신유형?: NullableText;
  산출방식?: NullableText;
};

type SubjectResult = {
  학년?: number;
  학기?: number;
  편제명?: NullableText;
  반영교과?: NullableText;
  교과명?: NullableText;
  과목명?: NullableText;
  과목코드?: NullableText;
  이수단위?: NullableNumber;
  원점수?: NullableNumber;
  평균?: NullableNumber;
  표준편차?: NullableNumber;
  석차?: NullableNumber;
  재적수?: NullableNumber;
  석차등급?: NullableText;
  적용등급?: NullableNumber;
  성취도?: NullableText;
  적용성취도?: NullableText;
  점수구분?: NullableText;
  과목반영점수?: NullableNumber;
  가중점수?: NullableNumber;
  반영판정?: NullableText;
  진로선택순위?: NullableNumber;
  진로순위?: NullableNumber;
  최종반영여부?: NullableText;
  석차백분율?: NullableNumber;
};

type SummaryResult = {
  검증구분?: NullableText;
  구분값?: NullableText;
  점수구분?: NullableText;
  반영과목수?: NullableNumber;
  이수단위합?: NullableNumber;
  가중점수합?: NullableNumber;
  중간평균?: NullableNumber;
  구분별평균?: NullableNumber;
  선택순위?: NullableNumber;
  검증결과?: NullableText;
  재계산교과점수?: NullableNumber;
  재계산점수?: NullableNumber;
  산출점수?: NullableNumber;
  차이?: NullableNumber;
};

type FinalResult = {
  결과유형?: NullableText;
  수험번호?: NullableText;
  전형코드?: NullableText;
  전형명?: NullableText;
  계열명?: NullableText;
  모집단위코드?: NullableText;
  모집단위명?: NullableText;
  반영교과학기수?: NullableNumber;
  자격판정이수단위합?: NullableNumber;
  지원자격판정?: NullableText;
  최종반영과목수?: NullableNumber;
  최종반영이수단위합?: NullableNumber;
  가중점수합?: NullableNumber;
  교과점수원값?: NullableNumber;
  최종교과점수?: NullableNumber;
  비교내신점수?: NullableNumber;
  산출방식?: NullableText;
  평가방식?: NullableText;
  논술점수?: NullableNumber;
  실기점수?: NullableNumber;
  전형총점?: NullableNumber;

  진학사저장점수?: NullableNumber;
  재계산학생부점수?: NullableNumber;
  점수차이?: NullableNumber;
  점수검증결과?: NullableText;
};

type VerifyResponse = {
  message: string;
  examNo: string;
  supported: boolean;
  admissionType?: AdmissionType;
  routeVersion?: string;
  data: {
    application: ApplicationResult | null;
    subjects: SubjectResult[];
    summaries: SummaryResult[];
    finalResult: FinalResult | null;
  };
};

const universities = [
  {
    code: "swu",
    shortName: "숭의여대",
    fullName: "숭의여자대학교",
    enabled: true,
    href: "/",
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
    enabled: true,
    href: "/snut",
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

function displayValue(value: unknown, digits?: number): string {
  if (value === null || value === undefined || value === "") return "-";

  if (typeof value === "number" && Number.isFinite(value)) {
    return digits === undefined ? String(value) : value.toFixed(digits);
  }

  return String(value);
}

function getApplicationDescription(application: ApplicationResult): string {
  return String(
    application.적용계산식 ??
      application.반영범위 ??
      application.전형구조 ??
      application.산출방식 ??
      "-"
  );
}

function inferAdmissionType(result: VerifyResponse): AdmissionType {
  if (result.admissionType) return result.admissionType;

  const name = result.data.application?.전형명 ?? "";

  if (name.includes("고교추천")) return "고교추천";
  if (name.includes("특성화고") && name.includes("재직자")) return "재직자";

  if (
    name.includes("학교생활우수자") ||
    name.includes("창의융합인재") ||
    name.includes("국가보훈대상자") ||
    name.includes("기회균등") ||
    name.includes("농어촌학생") ||
    name.includes("평생학습자") ||
    name.includes("특수교육대상자") ||
    name.includes("군위탁")
  ) {
    return "학생부종합";
  }

  if (name.includes("논술")) return "논술";
  if (name.includes("실기")) return "실기";

  return "수시기타";
}

function getFinalStatus(finalResult: FinalResult) {
  const invalid = finalResult.지원자격판정?.includes("부적격");
  const verification = finalResult.점수검증결과 ?? "";
  const calculatedScore =
    finalResult.재계산학생부점수 ?? finalResult.최종교과점수;

  if (invalid) {
    return {
      label: "지원자격 재확인",
      className: "status-badge status-error",
    };
  }

  if (verification.includes("불일치")) {
    return {
      label: "점수 불일치",
      className: "status-badge status-error",
    };
  }

  if (verification.includes("일치")) {
    return {
      label: "점수 일치",
      className: "status-badge status-success",
    };
  }

  if (calculatedScore == null) {
    return {
      label: "산출값 재확인",
      className: "status-badge status-error",
    };
  }

  return {
    label: "계산 완료",
    className: "status-badge status-success",
  };
}

export default function Home() {
  const pathname = usePathname();

  const [examNo, setExamNo] = useState("26149800011");

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
        `/api/snut/verify?examNo=${encodeURIComponent(trimmedExamNo)}`,
        {
          cache: "no-store",
        }
      );

      const body = (await response.json()) as VerifyResponse;

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

  const admissionType = result ? inferAdmissionType(result) : null;
  const isRecommendation = admissionType === "고교추천";
  const isEssay = admissionType === "논술";
  const isPractical = admissionType === "실기";
  const isComprehensive = admissionType === "학생부종합";

  const finalResult = result?.data.finalResult ?? null;

  const recalculatedScore =
    finalResult?.재계산학생부점수 ??
    finalResult?.최종교과점수 ??
    finalResult?.교과점수원값 ??
    null;

  const hasCalculatedScore = recalculatedScore != null;
  const hasSubjectCalculation = useMemo(
    () =>
      Boolean(
        result?.data.subjects.some(
          (row) =>
            row.과목반영점수 != null ||
            row.가중점수 != null ||
            row.최종반영여부 != null
        )
      ),
    [result]
  );

  const finalStatus = finalResult ? getFinalStatus(finalResult) : null;

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
            {universities.map((university) =>
              university.enabled ? (
                <Link
                  key={university.code}
                  href={university.href!}
                  className={`university-nav-item ${
                    pathname === university.href ? "active" : ""
                  }`}
                  title={university.fullName}
                >
                  {university.shortName}
                </Link>
              ) : (
                <button
                  key={university.code}
                  type="button"
                  className="university-nav-item"
                  disabled
                  title={`${university.fullName} 준비 중`}
                >
                  {university.shortName}
                  <span className="coming-soon">준비 중</span>
                </button>
              )
            )}
          </nav>
        </div>
      </header>

      <main className="page">
        <section className="search-card">
          <div className="search-card-header">
            <div>
              <span className="university-name">서울과학기술대학교</span>
              <h1>수시 성적 검증</h1>
              <p>
                모든 수시 전형을 대상으로 과목별 반영값, 계산 중간값과
                학생별 환산점수를 확인합니다.
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
                placeholder="수험번호 입력"
                autoComplete="off"
              />
            </div>

            <button type="submit" className="verify-button" disabled={loading}>
              <span className="button-icon">{loading ? "⋯" : "✓"}</span>
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
                    <strong>
                      {displayValue(result.data.application.입학연도)}
                    </strong>
                  </div>

                  <div>
                    <span>모집시기</span>
                    <strong>
                      {displayValue(result.data.application.모집시기)}
                    </strong>
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
                    <span>전형유형</span>
                    <strong>
                      {displayValue(
                        result.data.application.전형유형 ?? admissionType
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>계열</span>
                    <strong>
                      {displayValue(result.data.application.계열명)}
                    </strong>
                  </div>

                  <div>
                    <span>지원학과</span>
                    <strong>{result.data.application.모집단위명}</strong>
                  </div>

                  <div className="summary-item-emphasis">
                    <span>학생부 반영비율</span>
                    <strong>
                      {result.data.application.학생부반영비율 == null
                        ? "-"
                        : `${result.data.application.학생부반영비율}%`}
                    </strong>
                  </div>

                  <div>
                    <span>학생부 점수범위</span>
                    <strong>
                      {displayValue(
                        result.data.application.학생부점수범위
                      )}
                    </strong>
                  </div>

                  <div className="summary-item-formula">
                    <span>적용 기준</span>
                    <strong>
                      {getApplicationDescription(result.data.application)}
                    </strong>
                  </div>

                  {/* {isComprehensive && (
                    <div className="summary-item-formula">
                      <span>점수 안내</span>
                      <strong>
                        아래 점수는 성적검증용 공통 환산점수이며 실제
                        학생부종합 서류평가 점수 또는 전형 최종점수가 아닙니다.
                      </strong>
                    </div>
                  )} */}
                </div>
              </section>
            )}

            {!result.supported ? (
              <section className="result-section">
                <div className="search-message">
                  <span>!</span>
                  <p>{result.message}</p>
                </div>
              </section>
            ) : (
              <>
                <section className="result-section">
                  <div className="section-header">
                    <div>
                      <h2>과목별 성적 계산</h2>
                      <p>
                        원자료, 반영교과, 적용점수, 가중점수, 반영 여부를
                        과목 단위로 확인합니다.
                      </p>
                    </div>

                    {hasSubjectCalculation && (
                      <span className="status-badge status-success">
                        계산 상세
                      </span>
                    )}
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>학년</th>
                          <th>학기</th>
                          <th>편제명</th>
                          <th>반영교과</th>
                          <th>교과명</th>
                          <th>과목명</th>
                          <th>이수단위</th>
                          <th>원점수</th>
                          <th>평균</th>
                          <th>표준편차</th>
                          <th>재적수</th>
                          <th>석차등급</th>
                          <th>적용등급</th>
                          <th>성취도</th>
                          <th>점수구분</th>
                          <th>과목반영점수</th>
                          <th>가중점수</th>
                          <th>반영판정</th>
                          <th>선택순위</th>
                          <th>최종반영여부</th>
                        </tr>
                      </thead>

                      <tbody>
                        {result.data.subjects.length === 0 ? (
                          <tr>
                            <td colSpan={20}>
                              표시할 과목 계산 결과가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          result.data.subjects.map((row, index) => (
                            <tr
                              key={`${row.과목코드 ?? row.과목명 ?? index}-${index}`}
                            >
                              <td>{displayValue(row.학년)}</td>
                              <td>{displayValue(row.학기)}</td>
                              <td>{displayValue(row.편제명)}</td>
                              <td>{displayValue(row.반영교과)}</td>
                              <td>{displayValue(row.교과명)}</td>
                              <td>{displayValue(row.과목명)}</td>
                              <td>{displayValue(row.이수단위)}</td>
                              <td>{displayValue(row.원점수)}</td>
                              <td>{displayValue(row.평균)}</td>
                              <td>{displayValue(row.표준편차)}</td>
                              <td>{displayValue(row.재적수)}</td>
                              <td>{displayValue(row.석차등급)}</td>
                              <td>{displayValue(row.적용등급)}</td>
                              <td>
                                {displayValue(
                                  row.적용성취도 ?? row.성취도
                                )}
                              </td>
                              <td>{displayValue(row.점수구분)}</td>
                              <td>{displayValue(row.과목반영점수)}</td>
                              <td>{displayValue(row.가중점수)}</td>
                              <td>{displayValue(row.반영판정)}</td>
                              <td>
                                {displayValue(
                                  row.진로선택순위 ?? row.진로순위
                                )}
                              </td>
                              <td>{displayValue(row.최종반영여부)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                {result.data.summaries.length > 0 && (
                  <section className="result-section">
                    <div className="section-header">
                      <div>
                        <h2>중간 집계 및 선정 검증</h2>
                        <p>
                          반영과목 수, 이수단위 합, 가중점수 합, 교과별 평균
                          및 선택순위를 확인합니다.
                        </p>
                      </div>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>검증구분</th>
                            <th>구분값</th>
                            <th>점수구분</th>
                            <th>반영과목수</th>
                            <th>이수단위합</th>
                            <th>가중점수합</th>
                            <th>중간평균</th>
                            <th>선택순위</th>
                            <th>검증결과</th>
                          </tr>
                        </thead>

                        <tbody>
                          {result.data.summaries.map((summary, index) => (
                            <tr
                              key={`${summary.검증구분 ?? "summary"}-${index}`}
                            >
                              <td>{displayValue(summary.검증구분)}</td>
                              <td>{displayValue(summary.구분값)}</td>
                              <td>{displayValue(summary.점수구분)}</td>
                              <td>{displayValue(summary.반영과목수)}</td>
                              <td>{displayValue(summary.이수단위합)}</td>
                              <td>{displayValue(summary.가중점수합)}</td>
                              <td>
                                {displayValue(
                                  summary.중간평균 ??
                                    summary.구분별평균 ??
                                    summary.재계산교과점수 ??
                                    summary.재계산점수
                                )}
                              </td>
                              <td>{displayValue(summary.선택순위)}</td>
                              <td>{displayValue(summary.검증결과)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {finalResult && finalStatus && (
                  <section className="result-section">
                    <div className="section-header">
                      <div>
                        <h2>
                          {isComprehensive
                            ? "검증용 학생부 환산점수"
                            : "최종 학생부 성적 검증"}
                        </h2>
                        <p>
                          가중점수 합과 이수단위 합을 기준으로 재계산한
                          학생별 환산점수와 검증 결과를 확인합니다.
                        </p>
                      </div>

                      <span className={finalStatus.className}>
                        {finalStatus.label}
                      </span>
                    </div>

                    <div className="final-score-grid">
                      <div className="score-card">
                        <span className="score-label">반영 과목 수</span>
                        <strong className="score-main">
                          {displayValue(finalResult.최종반영과목수)}
                        </strong>
                        <span className="score-detail">
                          이수단위 합{" "}
                          {displayValue(
                            finalResult.최종반영이수단위합
                          )}
                        </span>
                      </div>

                      <div className="score-card">
                        <span className="score-label">계산 중간값</span>
                        <strong className="score-main">
                          {displayValue(finalResult.가중점수합)}
                        </strong>
                        <div className="comparison-row">
                          <span>가중점수 합</span>
                          <strong>
                            {displayValue(finalResult.가중점수합)}
                          </strong>
                        </div>
                        <div className="comparison-row">
                          <span>이수단위 합</span>
                          <strong>
                            {displayValue(
                              finalResult.최종반영이수단위합
                            )}
                          </strong>
                        </div>
                      </div>

                      <div className="score-card score-card-highlight">
                        <span className="score-label">점수 검증</span>
                        <strong className="score-main">
                          {displayValue(
                            finalResult.점수검증결과 ??
                              (recalculatedScore != null
                                ? "재계산 완료"
                                : "확인 필요")
                          )}
                        </strong>

                        <div className="comparison-row">
                          <span>재계산 학생부점수</span>
                          <strong>
                            {displayValue(recalculatedScore, 6)}
                          </strong>
                        </div>

                        {finalResult.진학사저장점수 != null && (
                          <div className="comparison-row">
                            <span>진학사 저장점수</span>
                            <strong>
                              {displayValue(
                                finalResult.진학사저장점수,
                                6
                              )}
                            </strong>
                          </div>
                        )}

                        {finalResult.점수차이 != null && (
                          <div className="comparison-row">
                            <span>차이</span>
                            <strong>
                              {displayValue(finalResult.점수차이, 6)}
                            </strong>
                          </div>
                        )}
                      </div>

                      <div className="score-card score-card-primary">
                        <span className="score-label">
                          {isComprehensive
                            ? "검증용 환산점수"
                            : "최종 교과점수"}
                        </span>

                        <strong className="score-main score-main-large">
                          {displayValue(recalculatedScore, 2)}
                        </strong>

                        <div className="comparison-row">
                          <span>교과점수 원값</span>
                          <strong>
                            {displayValue(
                              finalResult.교과점수원값,
                              6
                            )}
                          </strong>
                        </div>

                        <div className="comparison-row">
                          <span>산출방식</span>
                          <strong>
                            {displayValue(finalResult.산출방식)}
                          </strong>
                        </div>

                        {finalResult.지원자격판정 != null && (
                          <div className="comparison-row">
                            <span>지원자격</span>
                            <strong>
                              {displayValue(
                                finalResult.지원자격판정
                              )}
                            </strong>
                          </div>
                        )}

                        {isRecommendation &&
                          finalResult.반영교과학기수 != null && (
                            <div className="comparison-row">
                              <span>반영교과 학기 수</span>
                              <strong>
                                {displayValue(
                                  finalResult.반영교과학기수
                                )}
                              </strong>
                            </div>
                          )}

                        {isEssay && finalResult.논술점수 != null && (
                          <div className="comparison-row">
                            <span>논술점수</span>
                            <strong>
                              {displayValue(finalResult.논술점수, 2)}
                            </strong>
                          </div>
                        )}

                        {isPractical && finalResult.실기점수 != null && (
                          <div className="comparison-row">
                            <span>실기점수</span>
                            <strong>
                              {displayValue(finalResult.실기점수, 2)}
                            </strong>
                          </div>
                        )}

                        {finalResult.전형총점 != null && (
                          <div className="comparison-row">
                            <span>전형총점</span>
                            <strong>
                              {displayValue(finalResult.전형총점, 2)}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {!hasCalculatedScore && (
                      <div className="search-message">
                        <span>!</span>
                        <p>
                          최종 계산점수가 전달되지 않았습니다. API 응답의
                          finalResult와 프로시저 마지막 결과셋을 확인해주세요.
                        </p>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}