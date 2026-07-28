USE [SWU_Validation];
GO

SET NOCOUNT ON;
GO

/* ===========================================================
   파일명: 10_Calculate_Score.sql

   목적:
   학생부 성적 계산 과정의 중간값을 View로 생성한다.

   생성 View
   1. vw_SubjectGrade
      - 과목별 원본값
      - Z점수
      - 적용등급
      - 반영 여부

   2. vw_SemesterGrade
      - 학기별 반영과목 수
      - 이수단위 합
      - 등급가중합
      - 학기평균등급

   3. vw_CompletedSemesterGrade
      - 반영 대상 5개 학기
      - 미산출 학기 9등급 처리

   4. vw_RankedSemester
      - 학기별 우수 순위
      - 우수 2개 학기 선정

   5. vw_FinalScore
      - 우수 2개 학기 평균
      - 학생부 1,000점 환산점수
   =========================================================== */


/* ===========================================================
   필수 테이블 확인
   =========================================================== */

IF OBJECT_ID(N'dbo.HsbSubjectScore', N'U') IS NULL
BEGIN
    THROW 50001,
          N'dbo.HsbSubjectScore 테이블이 존재하지 않습니다.',
          1;
END;
GO


/* ===========================================================
   1. 과목별 적용등급 View

   적용 우선순위
   1) 석차등급이 1~9이면 직접 반영
   2) 석차등급이 없으면 Z점수로 환산
   3) 둘 다 불가능하면 반영 제외

   Z점수
   = (원점수 - 평균) / 표준편차
   =========================================================== */

CREATE OR ALTER VIEW dbo.vw_SubjectGrade
AS

SELECT
    H.입학연도,
    H.모집시기,
    H.수험번호,

    TRY_CONVERT(int, H.학년) AS 학년,
    TRY_CONVERT(int, H.학기) AS 학기,

    H.편제코드,
    H.편제명,

    H.교과코드,
    H.교과명,

    H.과목코드,
    H.과목명,

    H.이수단위,
    H.석차,
    H.재적수,
    H.동석차,
    H.석차등급,

    H.원점수,
    H.평균,
    H.표준편차,

    /* 숫자 변환값 */
    C.이수단위값,
    C.석차등급값,
    C.원점수값,
    C.평균값,
    C.표준편차값,

    /* Z점수 계산 */
    CAST
    (
        CASE
            WHEN C.원점수값 IS NOT NULL
             AND C.평균값 IS NOT NULL
             AND C.표준편차값 > 0
            THEN
                (C.원점수값 - C.평균값)
                / C.표준편차값

            ELSE NULL
        END
        AS decimal(18,6)
    ) AS Z점수,

    /* 실제 성적 계산에 사용할 등급 */
    CAST
    (
        CASE
            /* 석차등급이 있으면 직접 사용 */
            WHEN C.석차등급값 BETWEEN 1 AND 9
                THEN C.석차등급값

            /* 석차등급이 없으면 Z점수 환산 */
            WHEN C.원점수값 IS NOT NULL
             AND C.평균값 IS NOT NULL
             AND C.표준편차값 > 0
            THEN
                CASE
                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= 1.750
                        THEN 1

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= 1.230
                        THEN 2

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= 0.740
                        THEN 3

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= 0.250
                        THEN 4

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= -0.250
                        THEN 5

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= -0.740
                        THEN 6

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= -1.230
                        THEN 7

                    WHEN
                        (C.원점수값 - C.평균값)
                        / C.표준편차값 >= -1.750
                        THEN 8

                    ELSE 9
                END

            ELSE NULL
        END
        AS decimal(18,6)
    ) AS 적용등급,

    /* 어떤 방식으로 등급이 산출됐는지 표시 */
    CASE
        WHEN C.석차등급값 BETWEEN 1 AND 9
            THEN N'석차등급 직접 반영'

        WHEN C.원점수값 IS NOT NULL
         AND C.평균값 IS NOT NULL
         AND C.표준편차값 > 0
            THEN N'Z점수 환산'

        ELSE N'등급 산출 불가'
    END AS 등급산출방법,

    /* 최종 과목 반영 여부 */
    CASE
        WHEN C.이수단위값 IS NULL
            THEN N'반영 제외: 이수단위 변환 불가'

        WHEN C.이수단위값 <= 0
            THEN N'반영 제외: 이수단위 0 이하'

        WHEN C.석차등급값 BETWEEN 1 AND 9
            THEN N'반영'

        WHEN C.원점수값 IS NOT NULL
         AND C.평균값 IS NOT NULL
         AND C.표준편차값 > 0
            THEN N'반영'

        ELSE N'반영 제외: 등급 산출 불가'
    END AS 반영여부

FROM dbo.HsbSubjectScore AS H

CROSS APPLY
(
    SELECT
        TRY_CONVERT(decimal(18,6), H.이수단위)
            AS 이수단위값,

        TRY_CONVERT(decimal(18,6), H.석차등급)
            AS 석차등급값,

        TRY_CONVERT(decimal(18,6), H.원점수)
            AS 원점수값,

        TRY_CONVERT(decimal(18,6), H.평균)
            AS 평균값,

        TRY_CONVERT(decimal(18,6), H.표준편차)
            AS 표준편차값
) AS C

/* 수시 학생부 반영 대상 5개 학기 */
WHERE
       (
           TRY_CONVERT(int, H.학년) = 1
           AND TRY_CONVERT(int, H.학기) IN (1, 2)
       )

    OR (
           TRY_CONVERT(int, H.학년) = 2
           AND TRY_CONVERT(int, H.학기) IN (1, 2)
       )

    OR (
           TRY_CONVERT(int, H.학년) = 3
           AND TRY_CONVERT(int, H.학기) = 1
       );
GO


/* ===========================================================
   2. 학기별 평균등급 View

   등급가중합
   = SUM(이수단위 × 적용등급)

   학기평균등급
   = 등급가중합 / 총이수단위
   =========================================================== */

CREATE OR ALTER VIEW dbo.vw_SemesterGrade
AS

SELECT
    입학연도,
    모집시기,
    수험번호,
    학년,
    학기,

    /* 해당 학기의 전체 과목 수 */
    COUNT(*) AS 전체과목수,

    /* 실제 계산에 반영된 과목 수 */
    SUM
    (
        CASE
            WHEN 적용등급 IS NOT NULL
             AND 이수단위값 > 0
            THEN 1

            ELSE 0
        END
    ) AS 반영과목수,

    /* 제외된 과목 수 */
    SUM
    (
        CASE
            WHEN 적용등급 IS NULL
              OR 이수단위값 IS NULL
              OR 이수단위값 <= 0
            THEN 1

            ELSE 0
        END
    ) AS 제외과목수,

    /* 반영 이수단위 합계 */
    CAST
    (
        SUM
        (
            CASE
                WHEN 적용등급 IS NOT NULL
                 AND 이수단위값 > 0
                THEN 이수단위값

                ELSE 0
            END
        )
        AS decimal(18,6)
    ) AS 총이수단위,

    /* 등급 × 이수단위의 합계 */
    CAST
    (
        SUM
        (
            CASE
                WHEN 적용등급 IS NOT NULL
                 AND 이수단위값 > 0
                THEN 적용등급 * 이수단위값

                ELSE 0
            END
        )
        AS decimal(18,6)
    ) AS 등급가중합,

    /* 학기 평균등급 */
    CAST
    (
        SUM
        (
            CASE
                WHEN 적용등급 IS NOT NULL
                 AND 이수단위값 > 0
                THEN 적용등급 * 이수단위값

                ELSE 0
            END
        )
        /
        NULLIF
        (
            SUM
            (
                CASE
                    WHEN 적용등급 IS NOT NULL
                     AND 이수단위값 > 0
                    THEN 이수단위값

                    ELSE 0
                END
            ),
            0
        )
        AS decimal(18,6)
    ) AS 학기평균등급

FROM dbo.vw_SubjectGrade

GROUP BY
    입학연도,
    모집시기,
    수험번호,
    학년,
    학기;
GO


/* ===========================================================
   3. 반영 대상 5개 학기 완성 View

   대상 학기
   - 1학년 1학기
   - 1학년 2학기
   - 2학년 1학기
   - 2학년 2학기
   - 3학년 1학기

   학기평균등급을 산출할 수 없는 학기는
   최종학기등급을 9등급으로 처리한다.
   =========================================================== */

CREATE OR ALTER VIEW dbo.vw_CompletedSemesterGrade
AS

WITH Applicant AS
(
    SELECT DISTINCT
        입학연도,
        모집시기,
        수험번호

    FROM dbo.HsbSubjectScore
),
RequiredSemester AS
(
    SELECT
        V.학년,
        V.학기

    FROM
    (
        VALUES
            (1, 1),
            (1, 2),
            (2, 1),
            (2, 2),
            (3, 1)
    ) AS V(학년, 학기)
)

SELECT
    A.입학연도,
    A.모집시기,
    A.수험번호,

    R.학년,
    R.학기,

    S.전체과목수,
    S.반영과목수,
    S.제외과목수,

    S.총이수단위,
    S.등급가중합,
    S.학기평균등급,

    /* 학기 산출이 불가능하면 9등급 */
    CAST
    (
        COALESCE(S.학기평균등급, 9)
        AS decimal(18,6)
    ) AS 최종학기등급,

    CASE
        WHEN S.학기평균등급 IS NULL
            THEN N'산출 불가 → 9등급 적용'

        ELSE N'정상 산출'
    END AS 학기처리결과

FROM Applicant AS A

CROSS JOIN RequiredSemester AS R

LEFT JOIN dbo.vw_SemesterGrade AS S
    ON A.입학연도 = S.입학연도
   AND A.모집시기 = S.모집시기
   AND A.수험번호 = S.수험번호
   AND R.학년 = S.학년
   AND R.학기 = S.학기;
GO


/* ===========================================================
   4. 우수학기 순위 View

   최종학기등급이 낮을수록 우수한 학기다.

   동점이면
   1. 학년이 빠른 학기
   2. 학기가 빠른 학기
   순으로 선정한다.
   =========================================================== */

CREATE OR ALTER VIEW dbo.vw_RankedSemester
AS

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
    학기처리결과,

    ROW_NUMBER() OVER
    (
        PARTITION BY
            입학연도,
            모집시기,
            수험번호

        ORDER BY
            최종학기등급 ASC,
            학년 ASC,
            학기 ASC
    ) AS 우수학기순위

FROM dbo.vw_CompletedSemesterGrade;
GO


/* ===========================================================
   5. 최종 학생부 점수 View

   우수 2개 학기 평균
   = (우수학기1 등급 + 우수학기2 등급) / 2

   학생부점수
   = 920 + 10 × (9 - 우수 2개 학기 평균등급)
   =========================================================== */

CREATE OR ALTER VIEW dbo.vw_FinalScore
AS

SELECT
    입학연도,
    모집시기,
    수험번호,

    /* 우수학기 1 */
    MAX
    (
        CASE
            WHEN 우수학기순위 = 1
            THEN 학년
        END
    ) AS 우수학기1_학년,

    MAX
    (
        CASE
            WHEN 우수학기순위 = 1
            THEN 학기
        END
    ) AS 우수학기1_학기,

    MAX
    (
        CASE
            WHEN 우수학기순위 = 1
            THEN 최종학기등급
        END
    ) AS 우수학기1_등급,

    /* 우수학기 2 */
    MAX
    (
        CASE
            WHEN 우수학기순위 = 2
            THEN 학년
        END
    ) AS 우수학기2_학년,

    MAX
    (
        CASE
            WHEN 우수학기순위 = 2
            THEN 학기
        END
    ) AS 우수학기2_학기,

    MAX
    (
        CASE
            WHEN 우수학기순위 = 2
            THEN 최종학기등급
        END
    ) AS 우수학기2_등급,

    /* 우수 2개 학기 평균등급 */
    CAST
    (
        AVG
        (
            CASE
                WHEN 우수학기순위 <= 2
                THEN 최종학기등급
            END
        )
        AS decimal(18,6)
    ) AS 우수2개학기_평균등급,

    /* 학생부 1,000점 환산점수 */
    CAST
    (
        920
        + 10
        *
        (
            9
            -
            AVG
            (
                CASE
                    WHEN 우수학기순위 <= 2
                    THEN 최종학기등급
                END
            )
        )
        AS decimal(18,6)
    ) AS 학생부점수_1000점

FROM dbo.vw_RankedSemester

GROUP BY
    입학연도,
    모집시기,
    수험번호;
GO


/* ===========================================================
   생성 결과 확인
   =========================================================== */

SELECT
    S.name AS 스키마명,
    V.name AS View명,
    V.create_date AS 생성일시,
    V.modify_date AS 수정일시

FROM sys.views AS V

INNER JOIN sys.schemas AS S
    ON V.schema_id = S.schema_id

WHERE V.name IN
(
    N'vw_SubjectGrade',
    N'vw_SemesterGrade',
    N'vw_CompletedSemesterGrade',
    N'vw_RankedSemester',
    N'vw_FinalScore'
)

ORDER BY
    CASE V.name
        WHEN N'vw_SubjectGrade' THEN 1
        WHEN N'vw_SemesterGrade' THEN 2
        WHEN N'vw_CompletedSemesterGrade' THEN 3
        WHEN N'vw_RankedSemester' THEN 4
        WHEN N'vw_FinalScore' THEN 5
        ELSE 6
    END;
GO