import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getDbPool } from "@/lib/db";

export const dynamic = "force-dynamic";

type AdmissionType =
  | "고교추천"
  | "재직자"
  | "학생부종합"
  | "논술"
  | "실기"
  | "수시기타";

type Row = Record<string, unknown>;

type ApplicationRow = {
  입학연도: string | number | null;
  모집시기: string | number | null;
  수험번호: string;
  전형코드: string | number | null;
  전형명: string;
  계열명: string | null;
  모집단위코드: string | number | null;
  모집단위명: string | null;
};

type ApplicationMeta = {
  전형유형: string;
  학생부반영비율: number | null;
  논술반영비율?: number | null;
  실기반영비율?: number | null;
  학생부점수범위: string | null;
  적용계산식: string;
  평가방식: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, "")
    .replace(/[()（）_\-]/g, "")
    .toLowerCase();
}

function getAdmissionType(admissionName: unknown): AdmissionType {
  const name = normalizeText(admissionName);

  if (name.includes("고교추천")) return "고교추천";

  if (
    (name.includes("특성화고") || name.includes("특성화고등")) &&
    name.includes("재직자")
  ) {
    return "재직자";
  }

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

function getApplicationMeta(
  admissionType: AdmissionType,
  application: ApplicationRow
): ApplicationMeta {
  const admissionName = normalizeText(application.전형명);

  switch (admissionType) {
    case "고교추천": {
      const isArchitecture = normalizeText(application.모집단위명).includes(
        "건축학부건축학전공"
      );

      return {
        전형유형: "학생부교과",
        학생부반영비율: 100,
        학생부점수범위: "0~1,000점",
        적용계산식: isArchitecture
          ? "국어·영어·수학·과학·사회·한국사 석차등급 전 과목 + 진로선택 상위 3과목 가중평균"
          : "계열별 반영교과 석차등급 전 과목 + 진로선택 상위 3과목 가중평균",
        평가방식: "학생부 교과 100% 일괄합산",
      };
    }

    case "재직자":
      return {
        전형유형: "학생부교과",
        학생부반영비율: 100,
        학생부점수범위: "0~1,000점",
        적용계산식:
          "1·2학년 석차등급·전문교과 전 과목 + 진로선택 상위 3과목 가중평균",
        평가방식: "학생부 교과 100% 일괄합산",
      };

    case "학생부종합": {
      const isMilitary = admissionName.includes("군위탁");

      return {
        전형유형: "학생부종합",
        학생부반영비율: null,
        학생부점수범위: "검증용 학생부 환산점수",
        적용계산식:
          "학생부 과목별 환산점수 × 이수단위의 합 ÷ 반영 이수단위 합",
        평가방식: isMilitary
          ? "서류 70% + 면접 30% 일괄합산"
          : "1단계 서류 100%, 2단계 1단계 성적 70% + 면접 30%",
      };
    }

    case "논술":
      return {
        전형유형: "논술위주",
        학생부반영비율: 30,
        논술반영비율: 70,
        학생부점수범위: "0~300점",
        적용계산식: "학생부 교과 300점 + 논술 700점",
        평가방식: "학생부 교과 30% + 논술 70%",
      };

    case "실기":
      return {
        전형유형: "실기위주",
        학생부반영비율: 100,
        실기반영비율: 100,
        학생부점수범위: "1단계 교과점수 산출",
        적용계산식:
          "국어·영어·사회·한국사 반영교과의 이수단위 가중평균",
        평가방식: "1단계 학생부 교과 100%(8배수), 2단계 실기 100%",
      };

    case "수시기타":
      return {
        전형유형: "수시 기타",
        학생부반영비율: null,
        학생부점수범위: "검증용 학생부 환산점수",
        적용계산식:
          "학생부 과목별 환산점수 × 이수단위의 합 ÷ 반영 이수단위 합",
        평가방식: "수시 모집요강 또는 내부 전형코드 확인 필요",
      };
  }
}

function firstRow<T>(rows: T[] | undefined): T | null {
  return rows && rows.length > 0 ? rows[0] : null;
}

function hasColumn(row: Row, column: string): boolean {
  return Object.prototype.hasOwnProperty.call(row, column);
}

function hasAnyColumn(row: Row, columns: string[]): boolean {
  return columns.some((column) => hasColumn(row, column));
}

function emptyData() {
  return {
    application: null,
    subjects: [],
    summaries: [],
    finalResult: null,
  };
}

function parseNullableNumber(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBoolean(value: string | null): boolean {
  if (value === null) return false;
  return ["1", "true", "y", "yes"].includes(value.trim().toLowerCase());
}

function normalizeSubjectRow(row: Row): Row {
  return {
    ...row,
    최종반영여부: row.최종반영여부 ?? row.반영여부 ?? null,
    진로선택순위: row.진로선택순위 ?? row.진로순위 ?? null,
    저장과목반영점수:
      row.저장과목반영점수 ?? row.진학사과목반영점수 ?? null,
    재계산과목반영점수:
      row.재계산과목반영점수 ?? row.과목반영점수 ?? null,
    과목점수차이:
      row.과목점수차이 ??
      (typeof row.저장과목반영점수 === "number" &&
      typeof row.과목반영점수 === "number"
        ? row.과목반영점수 - row.저장과목반영점수
        : null),
  };
}

function normalizeSummaryRow(row: Row): Row {
  return {
    ...row,
    검증구분: row.검증구분 ?? row.결과구분 ?? null,
    구분값: row.구분값 ?? row.반영교과 ?? row.과목명 ?? null,
    중간평균:
      row.중간평균 ??
      row.구분별평균 ??
      row.교과별가중평균 ??
      row.재계산교과점수 ??
      row.재계산학생부점수 ??
      row.재계산점수 ??
      null,
    선택순위: row.선택순위 ?? row.진로선택순위 ?? null,
    검증결과:
      row.검증결과 ??
      row.점수검증결과 ??
      row.진로선택검증 ??
      row.최종점수검증 ??
      row.최종검증상태 ??
      null,
  };
}

function normalizeFinalResult(row: Row): Row {
  const rawScore =
    row.교과점수원값 ?? row.학생부교과점수_원값 ?? null;

  const roundedScore =
    row.최종교과점수 ??
    row.학생부교과점수_소수2자리 ??
    row.재계산학생부점수 ??
    null;

  return {
    ...row,
    교과점수원값: rawScore,
    최종교과점수: roundedScore,
    재계산학생부점수: row.재계산학생부점수 ?? roundedScore,
    진학사저장점수: row.진학사저장점수 ?? null,
    점수차이: row.점수차이 ?? null,
    점수검증결과: row.점수검증결과 ?? "저장점수 미입력",
    산출방식: row.산출방식 ?? row.검증상태 ?? "정상산출",
    비교내신점수: row.비교내신점수 ?? null,
  };
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const examNo = params.get("examNo")?.trim();

  if (!examNo) {
    return NextResponse.json(
      {
        message: "수험번호를 입력해주세요.",
        examNo: "",
        supported: false,
        admissionType: null,
        data: emptyData(),
      },
      { status: 400 }
    );
  }

  const essayScore = parseNullableNumber(params.get("essayScore"));
  const practicalScore = parseNullableNumber(params.get("practicalScore"));
  const storedScore = parseNullableNumber(params.get("storedScore"));
  const essayPercentile = parseNullableNumber(params.get("essayPercentile"));
  const tolerance = parseNullableNumber(params.get("tolerance")) ?? 0.01;
  const useComparativeRecord = parseBoolean(params.get("comparative"));

  if (tolerance < 0) {
    return NextResponse.json(
      {
        message: "점수 허용오차는 0 이상이어야 합니다.",
        examNo,
        supported: false,
        admissionType: null,
        data: emptyData(),
      },
      { status: 400 }
    );
  }

  try {
    const pool = await getDbPool();

    const applicationResult = await pool
      .request()
      .input("수험번호", sql.NVarChar(50), examNo)
      .query<ApplicationRow>(`
        SELECT TOP (1)
          CONVERT(nvarchar(20), 입학연도) AS 입학연도,
          CONVERT(nvarchar(50), 모집시기) AS 모집시기,
          CONVERT(nvarchar(50), 수험번호) AS 수험번호,
          CONVERT(nvarchar(100), 전형코드) AS 전형코드,
          전형명,
          계열명,
          CONVERT(nvarchar(100), 모집단위코드) AS 모집단위코드,
          모집단위명
        FROM dbo.vwApplyInfo
        WHERE CONVERT(nvarchar(50), 수험번호) = @수험번호;
      `);

    const rawApplication = firstRow(applicationResult.recordset);

    if (!rawApplication) {
      return NextResponse.json(
        {
          message: "지원자 정보를 찾을 수 없습니다.",
          examNo,
          supported: false,
          admissionType: null,
          data: emptyData(),
        },
        { status: 404 }
      );
    }

    const admissionType = getAdmissionType(rawApplication.전형명);
    const applicationMeta = getApplicationMeta(admissionType, rawApplication);

    /*
     * 최종 통합 프로시저는 수시 전형 구분과 관계없이 호출한다.
     * 학생부종합/기타 전형의 점수는 실제 선발 총점이 아니라
     * 학생부 계산 검증을 위한 환산점수로 반환된다.
     */
    const verifyResult = await pool
      .request()
      .input("수험번호", sql.NVarChar(50), examNo)
      .input("논술점수", sql.Decimal(18, 4), essayScore)
      .input("실기점수", sql.Decimal(18, 4), practicalScore)
      .input("비교내신사용", sql.Bit, useComparativeRecord)
      .input("논술석차백분율", sql.Decimal(9, 4), essayPercentile)
      .input("진학사저장점수", sql.Decimal(18, 6), storedScore)
      .input("점수허용오차", sql.Decimal(18, 6), tolerance)
      .execute("dbo.usp_SNUT_VerifyScore");

    const recordsets = (verifyResult.recordsets ?? []) as Row[][];

    let procedureApplication: Row | null = null;
    let qualificationResult: Row | null = null;
    let finalResult: Row | null = null;
    let subjects: Row[] = [];
    const summaries: Row[] = [];

    for (const rows of recordsets) {
      const row = firstRow(rows);
      if (!row) continue;

      const resultType = String(row.결과구분 ?? row.결과유형 ?? "");

      const isFinalResult =
        hasAnyColumn(row, [
          "점수검증결과",
          "진학사저장점수",
          "재계산학생부점수",
          "점수차이",
        ]) ||
        (
          hasColumn(row, "최종반영과목수") &&
          hasColumn(row, "최종반영이수단위합") &&
          hasAnyColumn(row, [
            "교과점수원값",
            "학생부교과점수_원값",
            "최종교과점수",
            "학생부교과점수_소수2자리",
          ])
        ) ||
        (
          resultType.includes("최종") &&
          hasAnyColumn(row, [
            "최종교과점수",
            "학생부교과점수_소수2자리",
            "재계산학생부점수",
          ])
        );

      /* 최종 결과는 지원자격 컬럼도 포함하므로 가장 먼저 판별한다. */
      if (isFinalResult) {
        finalResult = normalizeFinalResult(row);
        continue;
      }

      const isApplicationResult =
        resultType === "지원정보" ||
        (
          hasColumn(row, "입학연도") &&
          hasColumn(row, "수험번호") &&
          hasColumn(row, "전형명") &&
          !hasColumn(row, "과목명")
        );

      if (isApplicationResult && !procedureApplication) {
        procedureApplication = row;
        continue;
      }

      const isSubjectResult =
        resultType.includes("과목별") ||
        (
          hasAnyColumn(row, ["과목명", "학년", "학기"]) &&
          hasAnyColumn(row, [
            "과목반영점수",
            "재계산과목반영점수",
            "석차등급",
            "최종반영여부",
            "반영여부",
            "반영판정",
          ])
        );

      if (isSubjectResult) {
        subjects = rows.map(normalizeSubjectRow);
        continue;
      }

      const isQualificationResult =
        resultType === "지원자격 검증" ||
        (
          hasColumn(row, "반영교과학기수") &&
          hasColumn(row, "자격판정이수단위합") &&
          hasColumn(row, "지원자격판정")
        );

      if (isQualificationResult) {
        qualificationResult = row;
        continue;
      }

      const isSummaryResult =
        resultType.includes("중간") ||
        resultType.includes("교과별") ||
        resultType.includes("진로선택") ||
        hasAnyColumn(row, [
          "검증구분",
          "구분값",
          "점수구분",
          "선택순위",
          "진로선택순위",
          "교과별가중평균",
          "중간평균",
          "구분별평균",
          "재계산교과점수",
          "재계산점수",
        ]);

      if (isSummaryResult) {
        summaries.push(...rows.map(normalizeSummaryRow));
      }
    }

    if (finalResult && qualificationResult) {
      finalResult = {
        ...finalResult,
        반영교과학기수:
          qualificationResult.반영교과학기수 ??
          finalResult.반영교과학기수 ??
          null,
        자격판정이수단위합:
          qualificationResult.자격판정이수단위합 ??
          finalResult.자격판정이수단위합 ??
          null,
        지원자격판정:
          qualificationResult.지원자격판정 ??
          finalResult.지원자격판정 ??
          "해당 없음",
      };
    }

    const application = {
      ...rawApplication,
      ...(procedureApplication ?? {}),
      ...applicationMeta,
      모집시기명: String(
        procedureApplication?.모집시기 ?? rawApplication.모집시기 ?? ""
      ),
      검증점수구분:
        admissionType === "학생부종합" || admissionType === "수시기타"
          ? "검증용 학생부 환산점수(전형 최종점수 아님)"
          : "전형 기준 학생부 환산점수",
    };

    if (!finalResult) {
      return NextResponse.json(
        {
          message: "성적검증 프로시저에서 최종 결과를 찾지 못했습니다.",
          examNo,
          supported: true,
          admissionType,
          routeVersion: "SNUT_SCORE_VERIFY_V6",
          inputs: {
            storedScore,
            tolerance,
            essayScore,
            practicalScore,
            useComparativeRecord,
            essayPercentile,
          },
          data: {
            application,
            subjects,
            summaries,
            finalResult: null,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "성적 검증이 완료되었습니다.",
      examNo,
      supported: true,
      admissionType,
      routeVersion: "SNUT_SCORE_VERIFY_V6",
      inputs: {
        storedScore,
        tolerance,
        essayScore,
        practicalScore,
        useComparativeRecord,
        essayPercentile,
      },
      data: {
        application,
        subjects,
        summaries,
        finalResult,
      },
    });
  } catch (error) {
    console.error("[SNUT VERIFY ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "성적 검증 중 알 수 없는 오류가 발생했습니다.";

    return NextResponse.json(
      {
        message,
        examNo,
        supported: false,
        admissionType: null,
        routeVersion: "SNUT_SCORE_VERIFY_V6",
        data: emptyData(),
      },
      { status: 500 }
    );
  }
}