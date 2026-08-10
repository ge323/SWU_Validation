"use client";

import { useMemo, useState } from "react";

import UniversitySelector from "../components/university/UniversitySelector";
import type { UniversityCode } from "../components/university/UniversitySelector";

import ExcelUploader from "../components/upload/ExcelUploader";

import {
  parseExcelFiles,
  type ExcelRow,
} from "../lib/excel/parser";

type StepStatus =
  | "complete"
  | "active"
  | "waiting";

export default function Home() {
  /* =========================================================
     기본 상태
     ========================================================= */

  const [
    selectedUniversity,
    setSelectedUniversity,
  ] = useState<UniversityCode | null>(null);

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [isAnalyzed, setIsAnalyzed] =
    useState(false);

  const [isVerified, setIsVerified] =
    useState(false);

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  /* =========================================================
     Excel 분석 상태
     ========================================================= */

  const [excelRows, setExcelRows] =
    useState<ExcelRow[]>([]);

  const [totalApplicants, setTotalApplicants] =
    useState(0);

  const [totalRows, setTotalRows] =
    useState(0);

  const [errorRows, setErrorRows] =
    useState(0);

  const [columns, setColumns] =
    useState<string[]>([]);

  /* =========================================================
     검색
     ========================================================= */

  const [
    searchApplicantNo,
    setSearchApplicantNo,
  ] = useState("");

  /* =========================================================
     진행 단계
     ========================================================= */

  const steps = useMemo(
    () => [
      {
        number: 1,
        label: "대학 선택",
        status: getStepStatus(
          Boolean(selectedUniversity),
          true
        ),
      },
      {
        number: 2,
        label: "파일 업로드",
        status: getStepStatus(
          selectedFiles.length > 0,
          Boolean(selectedUniversity)
        ),
      },
      {
        number: 3,
        label: "데이터 확인",
        status: getStepStatus(
          isAnalyzed,
          selectedFiles.length > 0
        ),
      },
      {
        number: 4,
        label: "전체 검증",
        status: getStepStatus(
          isVerified,
          isAnalyzed
        ),
      },
    ],
    [
      selectedUniversity,
      selectedFiles,
      isAnalyzed,
      isVerified,
    ]
  );

  /* =========================================================
     대학 선택
     ========================================================= */

  function handleUniversitySelect(
    university: UniversityCode
  ) {
    if (selectedUniversity !== university) {
      setSelectedFiles([]);

      resetExcelAnalysis();

      setIsVerified(false);
    }

    setSelectedUniversity(university);
  }

  /* =========================================================
     Excel 파일 추가
     ========================================================= */

  function handleFilesSelect(
    files: File[]
  ) {
    setSelectedFiles((prevFiles) => {
      const mergedFiles = [...prevFiles];

      files.forEach((newFile) => {
        const isDuplicate =
          mergedFiles.some(
            (existingFile) =>
              existingFile.name ===
                newFile.name &&
              existingFile.size ===
                newFile.size &&
              existingFile.lastModified ===
                newFile.lastModified
          );

        if (!isDuplicate) {
          mergedFiles.push(newFile);
        }
      });

      return mergedFiles;
    });

    resetExcelAnalysis();
    setIsVerified(false);
  }

  /* =========================================================
     특정 파일 삭제
     ========================================================= */

  function handleFileRemove(
    index: number
  ) {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter(
        (_, fileIndex) =>
          fileIndex !== index
      )
    );

    resetExcelAnalysis();
    setIsVerified(false);
  }

  /* =========================================================
     모든 파일 삭제
     ========================================================= */

  function handleClearFiles() {
    setSelectedFiles([]);

    resetExcelAnalysis();

    setIsVerified(false);
  }

  /* =========================================================
     Excel 분석 초기화
     ========================================================= */

  function resetExcelAnalysis() {
    setExcelRows([]);

    setTotalApplicants(0);
    setTotalRows(0);
    setErrorRows(0);

    setColumns([]);

    setSearchApplicantNo("");

    setIsAnalyzed(false);
  }

  /* =========================================================
     Excel 파일 분석
     ========================================================= */

  async function handleAnalyze() {
    if (selectedFiles.length === 0) {
      return;
    }

    try {
      setIsAnalyzing(true);

      const result =
        await parseExcelFiles(
          selectedFiles
        );

      setExcelRows(result.rows);

      setTotalApplicants(
        result.totalApplicants
      );

      setTotalRows(
        result.totalRows
      );

      setErrorRows(
        result.errorRows
      );

      setColumns(
        result.columns
      );

      setIsAnalyzed(true);
      setIsVerified(false);
    } catch (error) {
      console.error(
        "Excel 분석 오류:",
        error
      );

      alert(
        "Excel 파일 분석 중 오류가 발생했습니다."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  /* =========================================================
     전체 검증
     ========================================================= */

  function handleVerify() {
    if (!isAnalyzed) {
      return;
    }

    /*
     * TODO
     *
     * 다음 단계에서:
     *
     * selectedUniversity
     *      ↓
     * 대학별 검증 API
     *      ↓
     * SQL Server
     *      ↓
     * 검증 결과
     *
     * 구조로 연결
     */

    setIsVerified(true);
  }

  /* =========================================================
     수험번호 검색 결과
     ========================================================= */

  const filteredRows =
    searchApplicantNo.trim() === ""
      ? excelRows
      : excelRows.filter((row) => {
          const applicantNo =
            getValue(
              row,
              "수험번호",
              "수험자번호",
              "applicantNo"
            );

          return String(
            applicantNo ?? ""
          ).includes(
            searchApplicantNo.trim()
          );
        });

  /*
   * 브라우저에 수십만 건을 한 번에 렌더링하면
   * 매우 느려질 수 있으므로 화면에는 일부만 출력한다.
   */
  const visibleRows =
    filteredRows.slice(0, 1000);

  // sourceFile은 내부 추적용으로만 사용하고
  // 원본 데이터 표에서는 숨긴다.
  const visibleColumns =
    columns.filter(
      (column) =>
        column !== "sourceFile"
    );
  /* =========================================================
     화면
     ========================================================= */

  return (
    <main className="verification-page">

      {/* =====================================================
          상단
      ====================================================== */}

      <section className="hero-section">

        <div className="hero-content">

          <span className="hero-label">
            Admission Score Verification
          </span>

          <h1>
            대학 입학성적 검증 시스템
          </h1>

          <p>
            대학에서 제공한 학생부 Excel/CSV
            원본 데이터를 업로드하고,
            대학별 성적 산출 기준에 따라
            반영 과정과 최종 결과를
            단계별로 검증합니다.
          </p>

        </div>

        <div className="hero-summary">

          <div>
            <span>선택 대학</span>

            <strong>
              {selectedUniversity
                ? getUniversityName(
                    selectedUniversity
                  )
                : "선택 전"}
            </strong>
          </div>

          <div>
            <span>업로드 파일</span>

            <strong>
              {selectedFiles.length > 0
                ? `${selectedFiles.length}개 파일`
                : "없음"}
            </strong>
          </div>

          <div>
            <span>현재 상태</span>

            <strong>
              {isVerified
                ? "검증 완료"
                : isAnalyzing
                ? "데이터 분석 중"
                : isAnalyzed
                ? "데이터 분석 완료"
                : selectedFiles.length > 0
                ? "파일 업로드 완료"
                : selectedUniversity
                ? "파일 업로드 대기"
                : "대학 선택 대기"}
            </strong>
          </div>

        </div>

      </section>

      {/* =====================================================
          진행 단계
      ====================================================== */}

      <section className="stepper-section">

        <div className="stepper">

          {steps.map(
            (step, index) => (

              <div
                key={step.number}
                className="stepper-group"
              >

                <div
                  className={`step-item ${step.status}`}
                >

                  <span className="step-circle">

                    {step.status === "complete"
                      ? "✓"
                      : step.number}

                  </span>

                  <span className="step-label">
                    {step.label}
                  </span>

                </div>

                {index <
                  steps.length - 1 && (

                  <div
                    className={`step-line ${
                      step.status === "complete"
                        ? "complete"
                        : ""
                    }`}
                  />

                )}

              </div>

            )
          )}

        </div>

      </section>

      {/* =====================================================
          콘텐츠
      ====================================================== */}

      <div className="content-stack">

        {/* ===================================================
            01 대학교 선택
        ==================================================== */}

        <UniversitySelector
          selectedUniversity={
            selectedUniversity
          }
          onSelect={
            handleUniversitySelect
          }
        />

        {/* ===================================================
            02 데이터 파일 업로드
        ==================================================== */}

        <ExcelUploader
          files={selectedFiles}
          disabled={
            !selectedUniversity
          }
          onFilesSelect={
            handleFilesSelect
          }
          onFileRemove={
            handleFileRemove
          }
          onClearFiles={
            handleClearFiles
          }
        />

        {/* ===================================================
            03 전체 학생부 데이터
        ==================================================== */}

        {selectedFiles.length > 0 && (

          <section className="content-card">

            <div className="card-heading">

              <div>

                <span className="section-index">
                  03
                </span>

                <div>

                  <h2>
                    전체 학생부 데이터
                  </h2>

                  <p>
                    업로드한 모든 Excel/CSV
                    파일을 하나의 데이터셋으로
                    병합하여 확인합니다.
                  </p>

                </div>

              </div>

              {!isAnalyzed && (

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    handleAnalyze
                  }
                  disabled={
                    isAnalyzing
                  }
                >
                  {isAnalyzing
                    ? "분석 중..."
                    : "데이터 분석하기"}
                </button>

              )}

            </div>

            {!isAnalyzed ? (

              <div className="empty-state">

                <strong>
                  업로드된 데이터 파일이
                  준비되었습니다.
                </strong>

                <p>
                  데이터 분석 버튼을 누르면
                  모든 Excel/CSV 파일을 읽어
                  하나의 학생부 데이터로
                  병합합니다.
                </p>

              </div>

            ) : (

              <>

                {/* -----------------------------------------
                    데이터 요약
                ------------------------------------------ */}

                <div className="summary-grid">

                  <SummaryCard
                    label="업로드 파일"
                    value={
                      selectedFiles.length.toLocaleString()
                    }
                    unit="개"
                  />

                  <SummaryCard
                    label="전체 지원자"
                    value={
                      totalApplicants.toLocaleString()
                    }
                    unit="명"
                  />

                  <SummaryCard
                    label="전체 데이터"
                    value={
                      totalRows.toLocaleString()
                    }
                    unit="건"
                  />

                  <SummaryCard
                    label="컬럼 수"
                    value={
                      columns.length.toLocaleString()
                    }
                    unit="개"
                  />

                  <SummaryCard
                    label="확인 필요"
                    value={
                      errorRows.toLocaleString()
                    }
                    unit="건"
                    emphasis
                  />

                </div>

                {/* -----------------------------------------
                    데이터 안내
                ------------------------------------------ */}

                <div className="notice-box">

                  <div>

                    <strong>
                      데이터 파일 병합 완료
                    </strong>

                    <p>
                      {selectedFiles.length}
                      개 파일에서 총{" "}
                      {totalRows.toLocaleString()}
                      건의 학생부 데이터를
                      읽었습니다.
                    </p>

                  </div>

                  <span className="data-status-badge">
                    분석 완료
                  </span>

                </div>

                {/* -----------------------------------------
                    전체 원본 데이터
                ------------------------------------------ */}

                <div className="data-preview">

                  <div className="data-preview-header">

                    <div>

                      <strong>
                        학생부 원본 데이터
                      </strong>

                      <p>
                        업로드된 모든 파일의
                        병합 결과입니다.
                      </p>

                    </div>

                    <div className="data-preview-filters">

                      <input
                        type="text"
                        value={
                          searchApplicantNo
                        }
                        onChange={(event) =>
                          setSearchApplicantNo(
                            event.target.value
                          )
                        }
                        placeholder="수험번호 검색"
                      />

                      {searchApplicantNo && (

                        <button
                          type="button"
                          className="secondary-outline-button"
                          onClick={() =>
                            setSearchApplicantNo("")
                          }
                        >
                          초기화
                        </button>

                      )}

                    </div>

                  </div>

                  <div className="data-table-meta">

                    <span>
                      검색 결과{" "}
                      <strong>
                        {filteredRows.length.toLocaleString()}
                      </strong>
                      건
                    </span>

                    {filteredRows.length >
                      1000 && (

                      <span>
                        화면에는 최대
                        1,000건만 표시됩니다.
                      </span>

                    )}

                  </div>

                  <div className="data-table-wrapper">

                    <table className="student-data-table">
                      <thead>
                        <tr>
                          <th className="row-number-column">
                            번호
                          </th>

                          {visibleColumns.map(
                            (column) => (
                              <th key={column}>
                                {column}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {visibleRows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={
                                visibleColumns.length + 1
                              }
                              className="table-empty-cell"
                            >
                              조회되는 데이터가 없습니다.
                            </td>
                          </tr>
                        ) : (
                          visibleRows.map(
                            (row, rowIndex) => (
                              <tr
                                key={`${row.sourceFile}-${rowIndex}`}
                              >
                                <td className="row-number-column">
                                  {rowIndex + 1}
                                </td>

                                {visibleColumns.map(
                                  (column) => {
                                    const value =
                                      row[column];

                                    const isApplicantColumn =
                                      column === "수험번호" ||
                                      column === "수험자번호" ||
                                      column === "지원자번호" ||
                                      column === "접수번호";

                                    return (
                                      <td
                                        key={`${rowIndex}-${column}`}
                                        className={
                                          isApplicantColumn
                                            ? "applicant-number-cell"
                                            : ""
                                        }
                                        title={
                                          value === undefined ||
                                          value === null
                                            ? ""
                                            : String(value)
                                        }
                                      >
                                        {displayValue(value)}
                                      </td>
                                    );
                                  }
                                )}
                              </tr>
                            )
                          )
                        )}
                      </tbody>
                    </table>

                  </div>

                  <div className="table-footer">

                    전체{" "}
                    {totalRows.toLocaleString()}
                    건 중{" "}
                    {Math.min(
                      filteredRows.length,
                      1000
                    ).toLocaleString()}
                    건 표시

                  </div>

                </div>

              </>

            )}

          </section>

        )}

        {/* ===================================================
            04 전체 성적 검증
        ==================================================== */}

        {isAnalyzed && (

          <section className="content-card">

            <div className="card-heading">

              <div>

                <span className="section-index">
                  04
                </span>

                <div>

                  <h2>
                    전체 성적 검증
                  </h2>

                  <p>
                    선택 대학의 성적 산출
                    규칙과 SQL 검증 로직을
                    전체 지원자에게
                    적용합니다.
                  </p>

                </div>

              </div>

              {!isVerified && (

                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    handleVerify
                  }
                >
                  전체 검증 시작
                </button>

              )}

            </div>

            {!isVerified ? (

              <div className="empty-state">

                <strong>
                  전체 데이터를
                  검증할 준비가
                  완료되었습니다.
                </strong>

                <p>
                  다음 단계에서 대학별
                  SQL 검증 API를 연결합니다.
                </p>

              </div>

            ) : (

              <>

                <div className="verification-result-grid">

                  <ResultCard
                    label="전체 지원자"
                    value={
                      totalApplicants.toLocaleString()
                    }
                  />

                  <ResultCard
                    label="정상"
                    value="-"
                    status="success"
                  />

                  <ResultCard
                    label="재확인 필요"
                    value="-"
                    status="warning"
                  />

                  <ResultCard
                    label="오류"
                    value="-"
                    status="error"
                  />

                </div>

                <div className="notice-box">

                  <div>

                    <strong>
                      SQL 검증 API 연결 대기
                    </strong>

                    <p>
                      현재 Excel 원본 데이터
                      조회까지 완료되었습니다.
                      다음 단계에서 기존
                      서울과기대 / 숭의여대
                      SQL 검증 로직을
                      연결합니다.
                    </p>

                  </div>

                </div>

              </>

            )}

          </section>

        )}

        {/* ===================================================
            05 수험생 상세 검증
        ==================================================== */}

        {isVerified && (

          <section className="content-card">

            <div className="card-heading">

              <div>

                <span className="section-index">
                  05
                </span>

                <div>

                  <h2>
                    수험생 상세 검증
                  </h2>

                  <p>
                    특정 수험번호를
                    조회하여 원본 학생부와
                    성적 산출 결과를
                    확인합니다.
                  </p>

                </div>

              </div>

            </div>

            <div className="student-search-area">

              <div className="search-field">

                <label htmlFor="detailApplicantNo">
                  수험번호
                </label>

                <input
                  id="detailApplicantNo"
                  type="text"
                  placeholder="예: 26087000073"
                />

              </div>

              <button
                type="button"
                className="primary-button"
              >
                조회
              </button>

            </div>

            {/* -----------------------------------------------
                06 성적 산출 근거
            ------------------------------------------------ */}

            <div className="calculation-evidence">

              <div className="evidence-title">

                <span className="section-index">
                  06
                </span>

                <div>

                  <h3>
                    성적 산출 근거
                  </h3>

                  <p>
                    어떤 과목이 반영되었고,
                    어떤 계산을 통해
                    최종 점수가 산출되었는지
                    보여주는 영역입니다.
                  </p>

                </div>

              </div>

              <div className="verification-flow">

                <FlowItem
                  number="1"
                  title="원본 학생부"
                  description="업로드된 학생부 원본 확인"
                />

                <FlowArrow />

                <FlowItem
                  number="2"
                  title="반영 기준"
                  description="대학·전형별 성적 반영 규칙 적용"
                />

                <FlowArrow />

                <FlowItem
                  number="3"
                  title="과목 판정"
                  description="반영·미반영 과목 및 사유 확인"
                />

                <FlowArrow />

                <FlowItem
                  number="4"
                  title="최종 계산"
                  description="환산점수·가중점수·최종값 비교"
                />

              </div>

              <div className="empty-state evidence-empty">

                <strong>
                  수험번호를 조회해주세요.
                </strong>

                <p>
                  조회 후 과목별 반영 여부,
                  반영 사유, 이수단위,
                  환산점수, 가중점수와
                  최종 계산식이 표시됩니다.
                </p>

              </div>

            </div>

          </section>

        )}

        {/* ===================================================
            07 Excel 결과 다운로드
        ==================================================== */}

        {isVerified && (

          <section className="content-card">

            <div className="card-heading">

              <div>

                <span className="section-index">
                  07
                </span>

                <div>

                  <h2>
                    검증 결과 다운로드
                  </h2>

                  <p>
                    검증 결과를 세 개의
                    Sheet로 정리하여
                    Excel로 다운로드합니다.
                  </p>

                </div>

              </div>

            </div>

            <div className="export-sheet-grid">

              <ExportSheet
                number="01"
                title="검증요약"
                description="대학, 업로드 파일, 지원자 수, 검증 건수, 일치율"
              />

              <ExportSheet
                number="02"
                title="전체검증결과"
                description="수험번호별 원본값, 재계산값, 차이 및 검증상태"
              />

              <ExportSheet
                number="03"
                title="성적산출근거"
                description="과목별 등급, 이수단위, 반영여부, 가중점수 및 판정사유"
              />

            </div>

            <div className="export-action">

              <button
                type="button"
                className="primary-button"
              >
                Excel 검증 보고서 다운로드
              </button>

            </div>

          </section>

        )}

      </div>

    </main>
  );
}

/* =========================================================
   공통 함수
   ========================================================= */

function getStepStatus(
  complete: boolean,
  enabled: boolean
): StepStatus {
  if (complete) {
    return "complete";
  }

  if (enabled) {
    return "active";
  }

  return "waiting";
}

function getUniversityName(
  code: UniversityCode
) {
  const universityNames: Record<
    UniversityCode,
    string
  > = {
    swu: "숭의여자대학교",
    snut: "서울과학기술대학교",
    gachon: "가천대학교",
    konkuk: "건국대학교",
    khu: "경희대학교",
  };

  return universityNames[code];
}

/*
 * 대학에서 내려주는 Excel마다
 * 컬럼명이 조금 다를 수 있으므로
 * 여러 후보 중 실제 값을 찾아준다.
 */
function getValue(
  row: ExcelRow,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function displayValue(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "-";
  }

  return String(value);
}

/* =========================================================
   Summary Card
   ========================================================= */

function SummaryCard({
  label,
  value,
  unit,
  emphasis = false,
}: {
  label: string;
  value: string;
  unit: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={`summary-card ${
        emphasis
          ? "emphasis"
          : ""
      }`}
    >
      <span>{label}</span>

      <strong>
        {value}
        <small>{unit}</small>
      </strong>
    </div>
  );
}

/* =========================================================
   Result Card
   ========================================================= */

function ResultCard({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status?:
    | "success"
    | "warning"
    | "error";
}) {
  return (
    <div
      className={`result-card ${
        status
          ? `result-${status}`
          : ""
      }`}
    >
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   Verification Flow
   ========================================================= */

function FlowItem({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flow-item">

      <span className="flow-number">
        {number}
      </span>

      <strong>
        {title}
      </strong>

      <p>
        {description}
      </p>

    </div>
  );
}

function FlowArrow() {
  return (
    <span
      className="flow-arrow"
      aria-hidden="true"
    >
      →
    </span>
  );
}

/* =========================================================
   Export Sheet
   ========================================================= */

function ExportSheet({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="export-sheet-card">

      <span>
        Sheet {number}
      </span>

      <strong>
        {title}
      </strong>

      <p>
        {description}
      </p>

    </div>
  );
}