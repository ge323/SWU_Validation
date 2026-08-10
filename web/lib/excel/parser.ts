import * as XLSX from "xlsx";

export type ExcelRow =
  Record<string, unknown> & {
    sourceFile: string;
  };

export type ExcelAnalysisResult = {
  rows: ExcelRow[];

  totalRows: number;

  totalApplicants: number;

  columns: string[];

  errorRows: number;
};

export async function parseExcelFiles(
  files: File[]
): Promise<ExcelAnalysisResult> {
  const mergedRows: ExcelRow[] = [];

  const allColumns =
    new Set<string>();

  for (const file of files) {
    try {
      const buffer =
        await file.arrayBuffer();

      const workbook =
        XLSX.read(buffer, {
          type: "array",
          cellDates: false,
        });

      const firstSheetName =
        workbook.SheetNames[0];

      if (!firstSheetName) {
        console.warn(
          `[데이터 파일] Sheet 없음: ${file.name}`
        );

        continue;
      }

      const worksheet =
        workbook.Sheets[firstSheetName];

      if (!worksheet) {
        console.warn(
          `[데이터 파일] Worksheet 없음: ${file.name}`
        );

        continue;
      }

      /*
       * CSV / XLS / XLSX 모두
       * 첫 번째 Sheet를 JSON 형태로 변환
       */
      const rawRows =
        XLSX.utils.sheet_to_json<
          Record<string, unknown>
        >(worksheet, {
          defval: null,
          raw: true,
        });

      console.group(
        `[파일 분석] ${file.name}`
      );

      console.log(
        "행 수:",
        rawRows.length
      );

      console.log(
        "Sheet:",
        firstSheetName
      );

      if (rawRows.length > 0) {
        console.log(
          "실제 컬럼:",
          Object.keys(rawRows[0])
        );

        console.log(
          "첫 번째 행:",
          rawRows[0]
        );
      }

      console.groupEnd();

      for (const rawRow of rawRows) {
        /*
         * 원본 컬럼명만 정리
         *
         * 학년 / 학기 / 과목명 등을
         * 임의로 추가하지 않는다.
         */
        const normalizedRow =
          normalizeColumnNames(
            rawRow
          );

        Object.keys(
          normalizedRow
        ).forEach(
          (column) => {
            allColumns.add(
              column
            );
          }
        );

        /*
         * sourceFile은 내부 추적용
         *
         * page.tsx에서는 화면에서
         * 숨기도록 처리하고 있음.
         */
        mergedRows.push({
          ...normalizedRow,
          sourceFile: file.name,
        });
      }
    } catch (error) {
      console.error(
        `[파일 분석 실패] ${file.name}`,
        error
      );
    }
  }

  /*
   * 수험번호 기준 지원자 수 계산
   */
  const applicantNumbers =
    new Set<string>();

  let errorRows = 0;

  for (const row of mergedRows) {
    const applicantNo =
      getApplicantNo(row);

    if (applicantNo) {
      applicantNumbers.add(
        applicantNo
      );
    } else {
      /*
       * 수험번호를 찾지 못한 행
       */
      errorRows += 1;
    }
  }

  /*
   * 내부 데이터에는 sourceFile이 있으므로
   * columns에도 넣어둔다.
   *
   * 화면에서는 page.tsx가 제외한다.
   */
  allColumns.add(
    "sourceFile"
  );

  console.group(
    "[전체 데이터 병합 결과]"
  );

  console.log(
    "전체 행 수:",
    mergedRows.length
  );

  console.log(
    "지원자 수:",
    applicantNumbers.size
  );

  console.log(
    "수험번호 없는 행:",
    errorRows
  );

  console.log(
    "최종 원본 컬럼:",
    [...allColumns]
  );

  if (mergedRows.length > 0) {
    console.log(
      "첫 번째 병합 행:",
      mergedRows[0]
    );
  }

  console.groupEnd();

  return {
    rows: mergedRows,

    totalRows:
      mergedRows.length,

    totalApplicants:
      applicantNumbers.size,

    columns:
      [...allColumns],

    errorRows,
  };
}

/* =========================================================
   컬럼명 정리
   ========================================================= */

function normalizeColumnNames(
  row: Record<string, unknown>
): Record<string, unknown> {
  const normalized:
    Record<string, unknown> = {};

  for (
    const [key, value]
    of Object.entries(row)
  ) {
    /*
     * Excel/CSV 컬럼명에 포함될 수 있는
     *
     * - 앞뒤 공백
     * - 줄바꿈
     * - NBSP
     *
     * 만 제거한다.
     *
     * 컬럼명을 다른 이름으로
     * 강제 변환하지 않는다.
     */

    const normalizedKey =
      String(key)
        .replace(/\u00a0/g, " ")
        .replace(/\r/g, "")
        .replace(/\n/g, " ")
        .trim();

    /*
     * 빈 컬럼명은 제외
     */
    if (
      normalizedKey === ""
    ) {
      continue;
    }

    normalized[
      normalizedKey
    ] = value;
  }

  return normalized;
}

/* =========================================================
   수험번호 찾기
   ========================================================= */

function getApplicantNo(
  row: Record<string, unknown>
): string | null {
  /*
   * 대학마다 수험번호 컬럼명이
   * 다를 가능성이 있으므로
   * 여기에서만 후보명을 허용한다.
   */

  const candidates = [
    "수험번호",
    "수험자번호",
    "지원자번호",
    "접수번호",
    "applicantNo",
  ];

  for (const key of candidates) {
    const value =
      row[key];

    if (
      value === undefined ||
      value === null
    ) {
      continue;
    }

    const normalized =
      String(value).trim();

    if (
      normalized !== ""
    ) {
      return normalized;
    }
  }

  return null;
}