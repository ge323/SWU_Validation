import { NextRequest, NextResponse } from "next/server";
import { getDbPool, sql } from "@/lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    applicantNo: string;
  }>;
};

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { applicantNo: rawApplicantNo } = await context.params;
    const applicantNo = rawApplicantNo.trim();

    if (!applicantNo) {
      return NextResponse.json(
        {
          success: false,
          message: "수험번호를 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const pool = await getDbPool();

    /*
     * 서로 독립적인 조회이므로 병렬로 실행한다.
     * 각 쿼리는 별도의 Request 객체를 사용해야 한다.
     */
    const [summaryResult, semesterResult, subjectResult] =
      await Promise.all([
        /* 1. 지원자 및 최종 환산점수 */
        pool
          .request()
          .input(
            "applicantNo",
            sql.NVarChar(50),
            applicantNo,
          )
          .query(`
            SELECT
                입학연도,
                모집시기,
                수험번호,

                전형코드,
                전형명,
                모집단위코드,
                모집단위명,

                적용전형유형,
                학생부반영비율,
                실기반영비율,
                학생부최고점,
                학생부최저점,
                전형총점,

                우수학기1_학년,
                우수학기1_학기,
                우수학기1_등급,

                우수학기2_학년,
                우수학기2_학기,
                우수학기2_등급,

                우수2개학기_평균등급,

                공통학생부점수_1000점,
                환산전학생부점수,
                학생부환산차감점수,
                최종학생부환산점수,

                학생부환산방법,
                최종학생부환산계산식,
                최종환산검증결과,
                적용규칙비고

            FROM dbo.vw_ApplicantFinalScore

            WHERE 수험번호 = @applicantNo

            ORDER BY
                모집시기,
                전형코드,
                모집단위코드;
          `),

        /* 2. 학기별 계산 내역 */
        pool
          .request()
          .input(
            "applicantNo",
            sql.NVarChar(50),
            applicantNo,
          )
          .query(`
            SELECT
                입학연도,
                모집시기,
                수험번호,

                학년,
                학기,

                전체과목수,
                반영과목수,
                제외과목수,

                총이수단위,
                등급가중합,
                학기평균등급,
                최종학기등급,

                우수학기순위,

                CASE
                    WHEN 우수학기순위 = 1
                        THEN N'우수학기 1'

                    WHEN 우수학기순위 = 2
                        THEN N'우수학기 2'

                    ELSE N'최종점수 미반영'
                END AS 우수학기선정결과,

                학기처리결과,

                CONCAT
                (
                    CONVERT(nvarchar(50), 등급가중합),
                    N' ÷ ',
                    CONVERT(nvarchar(50), 총이수단위),
                    N' = ',
                    CONVERT(nvarchar(50), 학기평균등급)
                ) AS 학기평균계산식

            FROM dbo.vw_RankedSemester

            WHERE 수험번호 = @applicantNo

            ORDER BY
                학년,
                학기;
          `),

        /* 3. 과목별 계산 상세 */
        pool
          .request()
          .input(
            "applicantNo",
            sql.NVarChar(50),
            applicantNo,
          )
          .query(`
            SELECT
                S.입학연도,
                S.모집시기,
                S.수험번호,

                S.학년,
                S.학기,

                R.우수학기순위,

                CASE
                    WHEN R.우수학기순위 = 1
                        THEN N'우수학기 1'

                    WHEN R.우수학기순위 = 2
                        THEN N'우수학기 2'

                    ELSE N'우수학기 미선정'
                END AS 우수학기여부,

                S.편제코드,
                S.편제명,

                S.교과코드,
                S.교과명,

                S.과목코드,
                S.과목명,

                S.이수단위,
                S.이수단위값,

                S.석차,
                S.재적수,
                S.동석차,
                S.석차등급,
                S.석차등급값,

                S.원점수,
                S.평균,
                S.표준편차,

                S.Z점수,
                S.적용등급,

                CAST
                (
                    CASE
                        WHEN S.적용등급 IS NOT NULL
                         AND S.이수단위값 IS NOT NULL
                         AND S.이수단위값 > 0
                        THEN S.적용등급 * S.이수단위값

                        ELSE NULL
                    END
                    AS decimal(18,6)
                ) AS 과목별등급가중값,

                CASE
                    WHEN S.적용등급 IS NOT NULL
                     AND S.이수단위값 IS NOT NULL
                     AND S.이수단위값 > 0
                    THEN CONCAT
                    (
                        CONVERT
                        (
                            nvarchar(50),
                            S.적용등급
                        ),
                        N' × ',
                        CONVERT
                        (
                            nvarchar(50),
                            S.이수단위값
                        ),
                        N' = ',
                        CONVERT
                        (
                            nvarchar(50),
                            CAST
                            (
                                S.적용등급
                                * S.이수단위값
                                AS decimal(18,6)
                            )
                        )
                    )

                    ELSE N'계산 제외'
                END AS 과목별가중값계산식,

                S.등급산출방법,
                S.반영여부,

                CASE
                    WHEN S.이수단위값 IS NULL
                        THEN N'제외: 이수단위 변환 불가'

                    WHEN S.이수단위값 <= 0
                        THEN N'제외: 이수단위 0 이하'

                    WHEN S.적용등급 IS NULL
                        THEN N'제외: 적용등급 산출 불가'

                    ELSE N'정상 반영'
                END AS 과목검증상태,

                CASE
                    WHEN R.우수학기순위 <= 2
                     AND S.적용등급 IS NOT NULL
                     AND S.이수단위값 > 0
                        THEN N'최종점수 반영'

                    WHEN R.우수학기순위 > 2
                     AND S.적용등급 IS NOT NULL
                     AND S.이수단위값 > 0
                        THEN N'학기 계산 반영 / 최종점수 미반영'

                    ELSE N'과목 계산 제외'
                END AS 최종점수반영여부

            FROM dbo.vw_SubjectGrade AS S

            LEFT JOIN dbo.vw_RankedSemester AS R
                ON S.입학연도 = R.입학연도
               AND S.모집시기 = R.모집시기
               AND S.수험번호 = R.수험번호
               AND S.학년 = R.학년
               AND S.학기 = R.학기

            WHERE S.수험번호 = @applicantNo

            ORDER BY
                S.학년,
                S.학기,

                CASE
                    WHEN R.우수학기순위 <= 2
                     AND S.적용등급 IS NOT NULL
                     AND S.이수단위값 > 0
                        THEN 1

                    WHEN S.적용등급 IS NOT NULL
                     AND S.이수단위값 > 0
                        THEN 2

                    ELSE 3
                END,

                S.교과코드,
                S.과목코드;
          `),
      ]);

    const summary = summaryResult.recordset[0] ?? null;
    const semesters = semesterResult.recordset;
    const subjects = subjectResult.recordset;

    if (!summary) {
      return NextResponse.json(
        {
          success: false,
          message: "해당 수험번호의 지원정보가 없습니다.",
          summary: null,
          semesters: [],
          subjects: [],
        },
        { status: 404 },
      );
    }

    return new NextResponse(
  JSON.stringify(
    {
      success: true,
      summary,
      semesters,
      subjects,
      counts: {
        semesters: semesters.length,
        subjects: subjects.length,
        reflectedSubjects: subjects.filter(
          (subject) => subject["과목검증상태"] === "정상 반영"
        ).length,
        excludedSubjects: subjects.filter(
          (subject) => subject["과목검증상태"] !== "정상 반영"
        ).length,
      },
    },
    null,
    2
  ),
  {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  }
);
  } catch (error: unknown) {
    console.error("Applicant API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "성적 정보를 조회하는 중 오류가 발생했습니다.",
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}