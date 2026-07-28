USE [SWU_Validation];
GO

SET NOCOUNT ON;
GO

/* ===========================================================
   파일명: 12_Create_ApplicantFinalScore.sql

   목적:
   지원자 정보 + 공통 학생부 점수 + 전형 규칙을 결합하여
   지원 전형과 모집단위에 맞는 최종 학생부 환산점수를 만든다.

   환산 방식
   - 1,000점 전형: 공통 학생부 점수 그대로 사용
   - 200점 전형:
       공통 학생부 점수 - (1,000 - 학생부최고점)
       예) 936.133340 - (1,000 - 200)
           = 136.133340
   =========================================================== */


/* 필수 객체 확인 */
IF OBJECT_ID(N'dbo.vwApplyInfo') IS NULL
BEGIN
    THROW 50001,
          N'dbo.vwApplyInfo 객체가 없습니다.',
          1;
END;

IF OBJECT_ID(N'dbo.vw_FinalScore') IS NULL
BEGIN
    THROW 50002,
          N'dbo.vw_FinalScore 객체가 없습니다. 먼저 10_Calculate_Score.sql을 실행하세요.',
          1;
END;

IF OBJECT_ID(N'dbo.AdmissionRule', N'U') IS NULL
BEGIN
    THROW 50003,
          N'dbo.AdmissionRule 테이블이 없습니다. 먼저 11_Create_AdmissionRule.sql을 실행하세요.',
          1;
END;
GO


CREATE OR ALTER VIEW dbo.vw_ApplicantFinalScore
AS

SELECT
    A.입학연도,
    A.모집시기,
    A.수험번호,

    A.전형코드,
    A.전형명,

    A.모집단위코드,
    A.모집단위명,

    /* 적용 규칙 */
    R.규칙ID,
    R.적용전형유형,
    R.학생부반영비율,
    R.실기반영비율,
    R.학생부최고점,
    R.학생부최저점,
    R.전형총점,
    R.적용우선순위,
    R.비고 AS 적용규칙비고,

    /* 우수학기 */
    F.우수학기1_학년,
    F.우수학기1_학기,
    F.우수학기1_등급,

    F.우수학기2_학년,
    F.우수학기2_학기,
    F.우수학기2_등급,

    F.우수2개학기_평균등급,

    /* 공통 1,000점 기준 점수 */
    F.학생부점수_1000점
        AS 공통학생부점수_1000점,

    /* 환산 전 점수 */
    F.학생부점수_1000점
        AS 환산전학생부점수,

    /* 전형 배점에 따라 차감되는 점수 */
    CAST
    (
        CASE
            WHEN R.학생부최고점 IS NULL
                THEN NULL

            WHEN R.학생부최고점 = 1000
                THEN 0

            ELSE 1000 - R.학생부최고점
        END
        AS decimal(18,6)
    ) AS 학생부환산차감점수,

    /* 전형별 최종 학생부 환산점수 */
    CAST
    (
        CASE
            WHEN F.학생부점수_1000점 IS NULL
                THEN NULL

            WHEN R.학생부최고점 IS NULL
                THEN NULL

            ELSE
                F.학생부점수_1000점
                - (1000 - R.학생부최고점)
        END
        AS decimal(18,6)
    ) AS 최종학생부환산점수,

    /* 사용자가 이해할 수 있는 환산 방법 설명 */
    CASE
        WHEN R.규칙ID IS NULL
            THEN N'적용 가능한 전형 규칙 없음'

        WHEN F.학생부점수_1000점 IS NULL
            THEN N'학생부 계산 결과 없음'

        WHEN R.학생부최고점 = 1000
            THEN N'공통 학생부 점수를 그대로 사용'

        ELSE CONCAT
        (
            N'공통 1,000점 기준 점수에서 ',
            CONVERT
            (
                nvarchar(50),
                CAST
                (
                    1000 - R.학생부최고점
                    AS decimal(18,6)
                )
            ),
            N'점을 차감'
        )
    END AS 학생부환산방법,

    /* 상세 환산 계산식 */
    CASE
        WHEN R.규칙ID IS NULL
            THEN N'전형 규칙 없음'

        WHEN F.학생부점수_1000점 IS NULL
            THEN N'학생부 계산 결과 없음'

        WHEN R.학생부최고점 = 1000
            THEN CONCAT
            (
                CONVERT
                (
                    nvarchar(50),
                    F.학생부점수_1000점
                ),
                N' = ',
                CONVERT
                (
                    nvarchar(50),
                    F.학생부점수_1000점
                )
            )

        ELSE CONCAT
        (
            CONVERT
            (
                nvarchar(50),
                F.학생부점수_1000점
            ),
            N' - (1,000 - ',
            CONVERT
            (
                nvarchar(50),
                R.학생부최고점
            ),
            N') = ',
            CONVERT
            (
                nvarchar(50),
                CAST
                (
                    F.학생부점수_1000점
                    - (1000 - R.학생부최고점)
                    AS decimal(18,6)
                )
            )
        )
    END AS 최종학생부환산계산식,

    /* 환산 검증 */
    CASE
        WHEN R.규칙ID IS NULL
            THEN N'전형 규칙 없음'

        WHEN F.수험번호 IS NULL
            THEN N'학생부 계산 결과 없음'

        WHEN
            F.학생부점수_1000점
            - (1000 - R.학생부최고점)
            BETWEEN R.학생부최저점
                AND R.학생부최고점
            THEN N'정상'

        ELSE N'환산점수 확인 필요'
    END AS 최종환산검증결과

FROM dbo.vwApplyInfo AS A

OUTER APPLY
(
    SELECT TOP (1)
        AR.규칙ID,
        AR.적용전형유형,
        AR.학생부반영비율,
        AR.실기반영비율,
        AR.학생부최고점,
        AR.학생부최저점,
        AR.전형총점,
        AR.적용우선순위,
        AR.비고

    FROM dbo.AdmissionRule AS AR

    WHERE AR.입학연도 =
              TRY_CONVERT(int, A.입학연도)

      AND AR.모집시기 =
              TRY_CONVERT(int, A.모집시기)

      AND AR.전형코드 =
              CONVERT(nvarchar(50), A.전형코드)

      AND AR.사용여부 = 1

      AND
      (
          AR.모집단위코드 =
              CONVERT(nvarchar(50), A.모집단위코드)

          OR AR.모집단위코드 IS NULL
      )

    ORDER BY
        CASE
            WHEN AR.모집단위코드 =
                 CONVERT(nvarchar(50), A.모집단위코드)
                THEN 0
            ELSE 1
        END,
        AR.적용우선순위,
        AR.규칙ID
) AS R

LEFT JOIN dbo.vw_FinalScore AS F
    ON A.입학연도 = F.입학연도
   AND A.모집시기 = F.모집시기
   AND A.수험번호 = F.수험번호;
GO


/* 생성 결과 확인 */
SELECT
    수험번호,
    전형명,
    모집단위명,
    학생부반영비율,
    학생부최고점,
    학생부최저점,
    환산전학생부점수,
    학생부환산차감점수,
    최종학생부환산점수,
    학생부환산방법,
    최종학생부환산계산식,
    최종환산검증결과

FROM dbo.vw_ApplicantFinalScore

ORDER BY
    모집시기,
    전형코드,
    모집단위코드,
    수험번호;
GO