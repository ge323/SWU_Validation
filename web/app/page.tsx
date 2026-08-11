"use client";

import {
  useMemo,
  useState,
} from "react";

import * as XLSX from "xlsx";

import UniversitySelector from "../components/university/UniversitySelector";

import type {
  UniversityCode,
} from "../components/university/UniversitySelector";

import ExcelUploader from "../components/upload/ExcelUploader";

import UniversityEvidence from "../components/verification/UniversityEvidence";

import {
  parseExcelFiles,
  type ExcelRow,
} from "../lib/excel/parser";

import {
  validateUniversityData,
  type UniversityDataValidationResult,
} from "../components/university/validateUniversityData";

type VerificationStatus =
  | "정상"
  | "재확인 필요"
  | "오류";

type VerificationRow = {
  applicantNo: string;
  status: VerificationStatus;
  originalScore?: number | null;
  calculatedScore?: number | null;
  difference?: number | null;
  reason?: string | null;
  raw: ExcelRow;
};

type VerificationSummary = {
  total: number;
  normal: number;
  review: number;
  error: number;
};

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

  const [
    universityDataValidation,
    setUniversityDataValidation,
  ] =
    useState<UniversityDataValidationResult | null>(
      null
    );

  /* =========================================================
     검증 결과 상태
     ========================================================= */

  const [
    verificationRows,
    setVerificationRows,
  ] = useState<VerificationRow[]>([]);

  const [
    verificationSummary,
    setVerificationSummary,
  ] = useState<VerificationSummary>({
    total: 0,
    normal: 0,
    review: 0,
    error: 0,
  });

  const [isVerifying, setIsVerifying] =
    useState(false);

  const [
    detailApplicantNo,
    setDetailApplicantNo,
  ] = useState("");

  const [
    selectedVerification,
    setSelectedVerification,
  ] = useState<VerificationRow | null>(
    null
  );

  const [
    detailSearchMessage,
    setDetailSearchMessage,
  ] = useState("");

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

    setUniversityDataValidation(
      null
    );

    setSearchApplicantNo("");

    setVerificationRows([]);

    setVerificationSummary({
      total: 0,
      normal: 0,
      review: 0,
      error: 0,
    });

    setDetailApplicantNo("");
    setSelectedVerification(null);
    setDetailSearchMessage("");

    setIsVerified(false);
    setIsAnalyzed(false);
  }

  /* =========================================================
     Excel 파일 분석
     ========================================================= */

  async function handleAnalyze() {
    if (
      selectedFiles.length === 0 ||
      !selectedUniversity
    ) {
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

      const validation =
        validateUniversityData(
          selectedUniversity,
          result.rows,
          result.columns,
          selectedFiles
        );

      setUniversityDataValidation(
        validation
      );

      setIsAnalyzed(true);
      setIsVerified(false);
    } catch (error) {
      console.error(
        "데이터 분석 오류:",
        error
      );

      alert(
        "파일 분석 중 오류가 발생했습니다."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  /* =========================================================
     전체 검증
     ========================================================= */

  async function handleVerify() {
    if (!isAnalyzed) {
      return;
    }

    if (!universityDataValidation) {
      alert(
        "업로드 데이터 적합성 검사가 필요합니다."
      );

      return;
    }

    if (!universityDataValidation.isValid) {
      alert(
        "선택한 대학의 데이터 구조와 일치하지 않아 검증을 진행할 수 없습니다."
      );

      return;
    }

    try {
      setIsVerifying(true);

      /*
       * 현재 1차 구현:
       * 업로드된 결과 파일의 상태/점수 컬럼을 기준으로
       * 전체 검증 결과를 구성한다.
       *
       * 이후 대학별 SQL/API가 준비되면
       * 이 부분을 API 호출 결과로 교체하면 된다.
       */
      const results: VerificationRow[] =
        excelRows.map((row) => {
          const applicantNo =
            String(
              getValue(
                row,
                "수험번호",
                "수험자번호",
                "지원자번호",
                "접수번호",
                "applicantNo"
              ) ?? ""
            ).trim();

          const sourceStatus =
            String(
              getValue(
                row,
                "검증상태",
                "검증결과",
                "산출결과"
              ) ?? ""
            ).trim();

          const originalScore =
            toNullableNumber(
              getValue(
                row,
                "실제반영_학생부점수",
                "대학제공점수",
                "제공점수",
                "학생부점수"
              )
            );

          const calculatedScore =
            toNullableNumber(
              getValue(
                row,
                "최종_학생부점수",
                "해당전형교과정량점수",
                "재계산점수",
                "검증점수"
              )
            );

          let difference: number | null =
            null;

          if (
            originalScore !== null &&
            calculatedScore !== null
          ) {
            difference =
              calculatedScore -
              originalScore;
          }

          let status: VerificationStatus =
            "재확인 필요";

          if (
            sourceStatus.includes("오류") ||
            sourceStatus.includes("실패") ||
            sourceStatus.includes("불일치")
          ) {
            status = "오류";
          } else if (
            sourceStatus.includes("완료") ||
            sourceStatus.includes("정상") ||
            sourceStatus.includes("일치")
          ) {
            status = "정상";
          } else if (
            difference !== null &&
            Math.abs(difference) < 0.000001
          ) {
            status = "정상";
          }

          return {
            applicantNo,
            status,
            originalScore,
            calculatedScore,
            difference,
            reason:
              sourceStatus || null,
            raw: row,
          };
        });

      const summary =
        results.reduce<VerificationSummary>(
          (acc, result) => {
            acc.total += 1;

            if (
              result.status === "정상"
            ) {
              acc.normal += 1;
            } else if (
              result.status ===
              "재확인 필요"
            ) {
              acc.review += 1;
            } else {
              acc.error += 1;
            }

            return acc;
          },
          {
            total: 0,
            normal: 0,
            review: 0,
            error: 0,
          }
        );

      setVerificationRows(results);
      setVerificationSummary(summary);
      setSelectedVerification(null);
      setDetailApplicantNo("");
      setDetailSearchMessage("");
      setIsVerified(true);
    } catch (error) {
      console.error(
        "전체 검증 오류:",
        error
      );

      alert(
        "전체 검증 중 오류가 발생했습니다."
      );
    } finally {
      setIsVerifying(false);
    }
  }

  /* =========================================================
     수험생 상세 조회
     ========================================================= */

  function handleApplicantSearch() {
    const applicantNo =
      detailApplicantNo.trim();

    if (!applicantNo) {
      setSelectedVerification(null);

      setDetailSearchMessage(
        "수험번호를 입력해주세요."
      );

      return;
    }

    const result =
      verificationRows.find(
        (row) =>
          row.applicantNo ===
          applicantNo
      );

    if (!result) {
      setSelectedVerification(null);

      setDetailSearchMessage(
        `${applicantNo} 수험번호의 검증 결과를 찾을 수 없습니다.`
      );

      return;
    }

    setSelectedVerification(result);
    setDetailSearchMessage("");
  }

  /* =========================================================
     Excel 검증 보고서 다운로드
     ========================================================= */

  function handleDownloadVerification() {
    if (
      verificationRows.length === 0
    ) {
      alert(
        "다운로드할 검증 결과가 없습니다."
      );

      return;
    }

    const workbook =
      XLSX.utils.book_new();

    const universityName =
      selectedUniversity
        ? getUniversityName(
            selectedUniversity
          )
        : "대학";

    const agreementRate =
      verificationSummary.total === 0
        ? 0
        : (
            verificationSummary.normal /
            verificationSummary.total
          ) * 100;

    /* Sheet 01: 검증요약 */
    const summaryData = [
      {
        대학: universityName,
        업로드파일수:
          selectedFiles.length,
        전체지원자:
          verificationSummary.total,
        정상:
          verificationSummary.normal,
        재확인필요:
          verificationSummary.review,
        오류:
          verificationSummary.error,
        정상비율:
          `${agreementRate.toFixed(2)}%`,
      },
    ];

    const summarySheet =
      XLSX.utils.json_to_sheet(
        summaryData
      );

    summarySheet["!autofilter"] = {
      ref: summarySheet["!ref"] ?? "A1:G2",
    };

    summarySheet["!cols"] = [
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      summarySheet,
      "검증요약"
    );

    /* Sheet 02: 전체검증결과 */
    const resultData =
      verificationRows.map(
        (row) => ({
          수험번호:
            row.applicantNo,
          검증상태:
            row.status,
          검증사유:
            row.reason ?? "",
          대학제공값:
            row.originalScore ?? "",
          재계산값:
            row.calculatedScore ?? "",
          차이:
            row.difference ?? "",
        })
      );

    const resultSheet =
      XLSX.utils.json_to_sheet(
        resultData
      );

    resultSheet["!autofilter"] = {
      ref:
        resultSheet["!ref"] ??
        "A1:F1",
    };

    resultSheet["!cols"] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 16 },
      { wch: 14 },
    ];

    XLSX.utils.book_append_sheet(
      workbook,
      resultSheet,
      "전체검증결과"
    );

    /* Sheet 03: 성적산출근거 */
    const evidenceData =
      excelRows.map(
        ({ sourceFile, ...row }) => ({
          ...row,
          원본파일: sourceFile,
        })
      );

    const evidenceSheet =
      XLSX.utils.json_to_sheet(
        evidenceData
      );

    evidenceSheet["!autofilter"] = {
      ref:
        evidenceSheet["!ref"] ??
        "A1:A1",
    };

    XLSX.utils.book_append_sheet(
      workbook,
      evidenceSheet,
      "성적산출근거"
    );

    XLSX.writeFile(
      workbook,
      `${universityName}_성적검증결과.xlsx`
    );
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

                {universityDataValidation && (
                  <div
                    className={`university-validation-card ${
                      universityDataValidation.isValid
                        ? "valid"
                        : "invalid"
                    }`}
                  >
                    <div className="university-validation-header">
                      <div>
                        <span>데이터 적합성 검사</span>
                        <strong>
                          {universityDataValidation.universityName}
                        </strong>
                      </div>

                      <span
                        className={`validation-status ${
                          universityDataValidation.isValid
                            ? "valid"
                            : "invalid"
                        }`}
                      >
                        {universityDataValidation.isValid
                          ? "검증 가능"
                          : "구조 불일치"}
                      </span>
                    </div>

                    <div className="validation-info-grid">
                      <ValidationInfo
                        label="데이터 행"
                        value={`${totalRows.toLocaleString()}건`}
                        valid={totalRows > 0}
                      />

                      <ValidationInfo
                        label="필수 데이터"
                        value={`${universityDataValidation.matchedRequiredColumns.length} / ${universityDataValidation.totalRequiredColumns}`}
                        valid={
                          universityDataValidation.missingRequiredColumns.length === 0
                        }
                      />

                      <ValidationInfo
                        label="파일명 참고"
                        value={
                          universityDataValidation.fileNameMatched
                            ? "대학명 확인"
                            : "일치 정보 없음"
                        }
                        valid={universityDataValidation.fileNameMatched}
                      />

                      <ValidationInfo
                        label="구조 적합도"
                        value={`${universityDataValidation.score}%`}
                        valid={universityDataValidation.isValid}
                      />
                    </div>

                    <div className="validation-message">
                      {universityDataValidation.message}
                    </div>

                    {universityDataValidation.missingRequiredColumns.length > 0 && (
                      <div className="missing-columns">
                        <strong>누락된 필수 데이터</strong>
                        <div>
                          {universityDataValidation.missingRequiredColumns.map((column) => (
                            <span key={column}>{column}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

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
                  disabled={
                    !universityDataValidation?.isValid ||
                    isVerifying
                  }
                >
                  {isVerifying
                    ? "검증 중..."
                    : "전체 검증 시작"}
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
                  데이터 적합성 검사가 통과되면
                  선택한 대학의 SQL 검증 로직을
                  실행할 수 있습니다.
                </p>

              </div>

            ) : (

              <>

                <div className="verification-result-grid">

                  <ResultCard
                    label="전체 지원자"
                    value={
                      verificationSummary.total.toLocaleString()
                    }
                  />

                  <ResultCard
                    label="정상"
                    value={
                      verificationSummary.normal.toLocaleString()
                    }
                    status="success"
                  />

                  <ResultCard
                    label="재확인 필요"
                    value={
                      verificationSummary.review.toLocaleString()
                    }
                    status="warning"
                  />

                  <ResultCard
                    label="오류"
                    value={
                      verificationSummary.error.toLocaleString()
                    }
                    status="error"
                  />

                </div>

                <div className="notice-box">

                  <div>

                    <strong>
                      1차 검증 결과 생성 완료
                    </strong>

                    <p>
                      현재는 업로드된 결과 파일의
                      검증상태와 점수 컬럼을 기준으로
                      결과를 집계합니다. 대학별 산출 근거는
                      선택한 대학 전용 화면으로 표시됩니다.
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
                  value={detailApplicantNo}
                  onChange={(event) =>
                    setDetailApplicantNo(
                      event.target.value
                    )
                  }
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter"
                    ) {
                      handleApplicantSearch();
                    }
                  }}
                  placeholder="예: 26087000073"
                />

              </div>

              <button
                type="button"
                className="primary-button"
                onClick={
                  handleApplicantSearch
                }
              >
                조회
              </button>

            </div>

            {detailSearchMessage && (
              <div className="applicant-search-message">
                {detailSearchMessage}
              </div>
            )}

            {selectedVerification && (
              <div className="applicant-detail-result">
                <div className="applicant-detail-header">
                  <div>
                    <span>조회 수험번호</span>

                    <strong>
                      {selectedVerification.applicantNo}
                    </strong>
                  </div>

                  <span
                    className={`detail-status-badge ${
                      selectedVerification.status === "정상"
                        ? "success"
                        : selectedVerification.status === "오류"
                        ? "error"
                        : "warning"
                    }`}
                  >
                    {selectedVerification.status}
                  </span>
                </div>

                <div className="applicant-detail-summary">
                  <DetailSummaryItem
                    label="수험번호"
                    value={
                      selectedVerification.applicantNo
                    }
                  />

                  <DetailSummaryItem
                    label="검증 상태"
                    value={
                      selectedVerification.status
                    }
                  />

                  <DetailSummaryItem
                    label="대학 제공값"
                    value={
                      formatNullableNumber(
                        selectedVerification.originalScore
                      )
                    }
                  />

                  <DetailSummaryItem
                    label="재계산값"
                    value={
                      formatNullableNumber(
                        selectedVerification.calculatedScore
                      )
                    }
                  />

                  <DetailSummaryItem
                    label="차이"
                    value={
                      formatNullableNumber(
                        selectedVerification.difference
                      )
                    }
                  />

                  <DetailSummaryItem
                    label="검증 사유"
                    value={
                      selectedVerification.reason ??
                      "-"
                    }
                  />
                </div>

                <div className="applicant-original-data">
                  <div className="applicant-original-title">
                    <strong>
                      수험생 원본 데이터
                    </strong>

                    <p>
                      업로드 파일에서 해당 수험번호와
                      일치한 원본 행입니다.
                    </p>
                  </div>

                  <div className="data-table-wrapper">
                    <table className="student-data-table">
                      <thead>
                        <tr>
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
                        <tr>
                          {visibleColumns.map(
                            (column) => (
                              <td
                                key={column}
                                title={
                                  selectedVerification.raw[column] ===
                                    undefined ||
                                  selectedVerification.raw[column] ===
                                    null
                                    ? ""
                                    : String(
                                        selectedVerification.raw[column]
                                      )
                                }
                              >
                                {displayValue(
                                  selectedVerification.raw[column]
                                )}
                              </td>
                            )
                          )}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

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
                    선택한 대학의 성적 산출 기준에 따라
                    반영 과정과 최종 계산 근거를
                    확인하는 영역입니다.
                  </p>

                </div>

              </div>

              {selectedVerification &&
              selectedUniversity ? (
                <UniversityEvidence
                  university={
                    selectedUniversity
                  }
                  row={
                    selectedVerification.raw
                  }
                  status={
                    selectedVerification.status
                  }
                />
              ) : (
                <div className="empty-state evidence-empty">
                  <strong>
                    수험번호를 조회해주세요.
                  </strong>

                  <p>
                    조회 후 선택한 대학의 성적 산출 방식에
                    맞는 검증 근거가 표시됩니다.
                  </p>
                </div>
              )}

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
                onClick={
                  handleDownloadVerification
                }
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

function toNullableNumber(
  value: unknown
): number | null {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue =
    Number(
      String(value).replace(
        /,/g,
        ""
      )
    );

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : null;
}

function formatNullableNumber(
  value: number | null | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(
        undefined,
        {
          maximumFractionDigits: 6,
        }
      );
}

/* =========================================================
   Detail Summary
   ========================================================= */

function DetailSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="detail-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* =========================================================
   Validation Info
   ========================================================= */

function ValidationInfo({
  label,
  value,
  valid,
}: {
  label: string;
  value: string;
  valid: boolean;
}) {
  return (
    <div className="validation-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{valid ? "✓" : "!"}</small>
    </div>
  );
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