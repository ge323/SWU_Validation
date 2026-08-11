import type { ExcelRow } from "../../lib/excel/parser";

import type { UniversityCode } from "./UniversitySelector";

import {
  universityProfiles,
  type UniversityProfile,
} from "./profiles";

/* =========================================================
   대학별 비교 결과
   ========================================================= */

export type UniversityMatchResult = {
  code: UniversityCode;

  name: string;

  score: number;

  requiredMatched: number;

  requiredTotal: number;

  signatureMatched: number;

  signatureTotal: number;

  optionalMatched: number;

  optionalTotal: number;

  fileNameMatched: boolean;
};

/* =========================================================
   최종 데이터 검증 결과
   ========================================================= */

export type UniversityDataValidationResult = {
  universityCode: UniversityCode;

  universityName: string;

  /*
   * 실제 성적 검증 진행 가능 여부
   */
  isValid: boolean;

  /*
   * 선택한 대학과의 구조 적합도
   */
  score: number;

  totalRequiredColumns: number;

  matchedRequiredColumns: string[];

  missingRequiredColumns: string[];

  matchedSignatureColumns: string[];

  missingSignatureColumns: string[];

  matchedOptionalColumns: string[];

  fileNameMatched: boolean;

  detectedColumns: string[];

  /*
   * 데이터 구조상 가장 유사한 대학
   */
  detectedUniversityCode:
    | UniversityCode
    | null;

  detectedUniversityName:
    | string
    | null;

  universityMatches: UniversityMatchResult[];

  message: string;
};

/* =========================================================
   대학 데이터 검증
   ========================================================= */

export function validateUniversityData(
  selectedUniversityCode: UniversityCode,
  rows: ExcelRow[],
  columns: string[],
  files: File[]
): UniversityDataValidationResult {
  /*
   * sourceFile은 parser에서 추가한 내부 컬럼이므로
   * 대학 판별에서는 제외한다.
   */
  const detectedColumns = columns.filter(
    (column) => column !== "sourceFile"
  );

  /*
   * 비교용 컬럼명 정규화
   */
  const normalizedColumns =
    detectedColumns.map(normalizeText);

  /* =======================================================
     모든 대학과 비교
     ======================================================= */

  const universityMatches =
    Object.values(universityProfiles).map(
      (profile) =>
        calculateUniversityMatch(
          profile,
          normalizedColumns,
          files
        )
    );

  /*
   * 점수가 높은 대학 순으로 정렬
   */
  universityMatches.sort(
    (a, b) => b.score - a.score
  );

  const bestMatch =
    universityMatches[0] ?? null;

  /* =======================================================
     사용자가 선택한 대학
     ======================================================= */

  const selectedProfile =
    universityProfiles[
      selectedUniversityCode
    ];

  const selectedMatch =
    universityMatches.find(
      (match) =>
        match.code ===
        selectedUniversityCode
    );

  if (!selectedMatch) {
    throw new Error(
      "선택 대학 검증 프로필을 찾을 수 없습니다."
    );
  }

  /* =======================================================
     선택 대학 필수 컬럼 검사
     ======================================================= */

  const matchedRequiredColumns =
    selectedProfile.requiredColumns.filter(
      (column) =>
        hasColumn(
          column,
          selectedProfile,
          normalizedColumns
        )
    );

  const missingRequiredColumns =
    selectedProfile.requiredColumns.filter(
      (column) =>
        !hasColumn(
          column,
          selectedProfile,
          normalizedColumns
        )
    );

  /* =======================================================
     선택 대학 고유 컬럼 검사
     ======================================================= */

  const matchedSignatureColumns =
    selectedProfile.signatureColumns.filter(
      (column) =>
        hasColumn(
          column,
          selectedProfile,
          normalizedColumns
        )
    );

  const missingSignatureColumns =
    selectedProfile.signatureColumns.filter(
      (column) =>
        !hasColumn(
          column,
          selectedProfile,
          normalizedColumns
        )
    );

  /* =======================================================
     선택 대학 보조 컬럼 검사
     ======================================================= */

  const matchedOptionalColumns =
    (
      selectedProfile.optionalColumns ??
      []
    ).filter(
      (column) =>
        hasColumn(
          column,
          selectedProfile,
          normalizedColumns
        )
    );

  /* =======================================================
     데이터 존재 여부
     ======================================================= */

  const hasRows =
    rows.length > 0;

  /* =======================================================
     필수 컬럼 검사
     ======================================================= */

  const requiredPassed =
    missingRequiredColumns.length === 0;

  /* =======================================================
     대학 고유 컬럼 검사
     ======================================================= */

  const signatureTotal =
    selectedProfile.signatureColumns.length;

  const signatureMatchRate =
    signatureTotal === 0
      ? 1
      : matchedSignatureColumns.length /
        signatureTotal;

  /*
   * 고유 컬럼의 50% 이상 일치
   *
   * 너무 높게 잡으면 동일 대학에서도
   * 파일 종류가 다른 경우 실패할 수 있으므로
   * 우선 50%로 사용한다.
   */
  const signaturePassed =
    signatureMatchRate >= 0.5;

  /* =======================================================
     자동 대학 판별
     ======================================================= */

  /*
   * signature가 정의되지 않은 대학은
   * 아직 자동 판별 근거가 부족하다.
   */
  const canIdentifyUniversity =
    selectedProfile.signatureColumns.length >
    0;

  const selectedIsBestMatch =
    !canIdentifyUniversity ||
    bestMatch?.code ===
      selectedUniversityCode;

  /* =======================================================
     구조 적합도
     ======================================================= */

  const scorePassed =
    selectedMatch.score >= 50;

  /* =======================================================
     최종 검증 가능 여부
     ======================================================= */

  const isValid =
    hasRows &&
    requiredPassed &&
    signaturePassed &&
    selectedIsBestMatch &&
    scorePassed;

  /* =======================================================
     사용자 안내 메시지
     ======================================================= */

  let message = "";

  if (!hasRows) {
    message =
      "업로드된 데이터가 없습니다.";
  } else if (!requiredPassed) {
    message =
      `${selectedProfile.name} 검증에 필요한 ` +
      `기본 데이터 항목이 부족합니다.`;
  } else if (!signaturePassed) {
    message =
      `${selectedProfile.name} 데이터임을 확인할 수 있는 ` +
      `고유 성적 산출 항목이 충분하지 않습니다.`;
  } else if (
    canIdentifyUniversity &&
    bestMatch &&
    bestMatch.code !==
      selectedUniversityCode
  ) {
    message =
      `선택한 대학은 ${selectedProfile.name}이지만, ` +
      `업로드 데이터는 ${bestMatch.name} 형식과 ` +
      `더 유사합니다.`;
  } else if (!scorePassed) {
    message =
      `${selectedProfile.name} 데이터 구조와의 ` +
      `적합도가 낮습니다.`;
  } else {
    message =
      `${selectedProfile.name} 검증에 필요한 ` +
      `데이터 구조가 확인되었습니다.`;
  }

  /* =======================================================
     결과 반환
     ======================================================= */

  return {
    universityCode:
      selectedUniversityCode,

    universityName:
      selectedProfile.name,

    isValid,

    score:
      selectedMatch.score,

    totalRequiredColumns:
      selectedProfile.requiredColumns.length,

    matchedRequiredColumns,

    missingRequiredColumns,

    matchedSignatureColumns,

    missingSignatureColumns,

    matchedOptionalColumns,

    fileNameMatched:
      selectedMatch.fileNameMatched,

    detectedColumns,

    detectedUniversityCode:
      bestMatch?.code ?? null,

    detectedUniversityName:
      bestMatch?.name ?? null,

    universityMatches,

    message,
  };
}

/* =========================================================
   대학별 적합도 계산
   ========================================================= */

function calculateUniversityMatch(
  profile: UniversityProfile,
  normalizedColumns: string[],
  files: File[]
): UniversityMatchResult {
  /* =======================================================
     필수 컬럼
     ======================================================= */

  const requiredMatched =
    profile.requiredColumns.filter(
      (column) =>
        hasColumn(
          column,
          profile,
          normalizedColumns
        )
    ).length;

  /* =======================================================
     대학 고유 컬럼
     ======================================================= */

  const signatureMatched =
    profile.signatureColumns.filter(
      (column) =>
        hasColumn(
          column,
          profile,
          normalizedColumns
        )
    ).length;

  /* =======================================================
     보조 컬럼
     ======================================================= */

  const optionalColumns =
    profile.optionalColumns ?? [];

  const optionalMatched =
    optionalColumns.filter(
      (column) =>
        hasColumn(
          column,
          profile,
          normalizedColumns
        )
    ).length;

  /* =======================================================
     파일명 검사
     ======================================================= */

  const fileNameMatched =
    checkFileName(
      profile,
      files
    );

  /* =======================================================
     비율 계산
     ======================================================= */

  const requiredRate =
    profile.requiredColumns.length === 0
      ? 1
      : requiredMatched /
        profile.requiredColumns.length;

  const signatureRate =
    profile.signatureColumns.length === 0
      ? 0
      : signatureMatched /
        profile.signatureColumns.length;

  const optionalRate =
    optionalColumns.length === 0
      ? 0
      : optionalMatched /
        optionalColumns.length;

  /* =======================================================
     적합도 계산

     필수 데이터       35%
     대학 고유 데이터  50%
     선택 데이터       14%
     파일명             1%

     파일명은 사용자가 임의로 변경할 수 있으므로
     판별 근거로 거의 사용하지 않는다.
     ======================================================= */

  const score = Math.round(
    (
      requiredRate * 0.35 +
      signatureRate * 0.5 +
      optionalRate * 0.14 +
      (fileNameMatched ? 0.01 : 0)
    ) * 100
  );

  return {
    code:
      profile.code,

    name:
      profile.name,

    score,

    requiredMatched,

    requiredTotal:
      profile.requiredColumns.length,

    signatureMatched,

    signatureTotal:
      profile.signatureColumns.length,

    optionalMatched,

    optionalTotal:
      optionalColumns.length,

    fileNameMatched,
  };
}

/* =========================================================
   컬럼 존재 여부 확인

   실제 컬럼명 + alias를 모두 검사한다.
   ========================================================= */

function hasColumn(
  column: string,
  profile: UniversityProfile,
  normalizedColumns: string[]
): boolean {
  /*
   * 기본 컬럼명
   */
  const candidates = [
    column,

    /*
     * 해당 컬럼에 등록된 alias
     */
    ...(profile.aliases?.[column] ?? []),
  ];

  return candidates.some(
    (candidate) =>
      normalizedColumns.includes(
        normalizeText(candidate)
      )
  );
}

/* =========================================================
   파일명 검사
   ========================================================= */

function checkFileName(
  profile: UniversityProfile,
  files: File[]
): boolean {
  const hints =
    profile.fileNameHints ?? [];

  if (hints.length === 0) {
    return false;
  }

  return files.some((file) => {
    const normalizedFileName =
      normalizeText(file.name);

    return hints.some(
      (hint) =>
        normalizedFileName.includes(
          normalizeText(hint)
        )
    );
  });
}

/* =========================================================
   문자열 정규화

   다음 차이는 무시한다.

   "수험 번호"
   "수험번호"
   "수험_번호"
   "수험-번호"

   모두 같은 값으로 비교한다.
   ========================================================= */

function normalizeText(
  value: string
): string {
  return String(value)
    .replace(/\u00a0/g, "")
    .replace(/\s+/g, "")
    .replace(/_/g, "")
    .replace(/-/g, "")
    .toLowerCase()
    .trim();
}