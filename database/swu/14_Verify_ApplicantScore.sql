USE [SWU_Validation];
GO

SET NOCOUNT ON;
GO

/* ===========================================================
   파일명: 13_Get_Applicant_AdmissionScore.sql

   목적:
   수험번호를 입력하면 지원한 전형과 모집단위에 맞는
   최종 학생부 환산점수와 환산 과정을 조회한다.
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'53510004';


/* 필수 View 확인 */
IF OBJECT_ID(N'dbo.vw_ApplicantFinalScore') IS NULL
BEGIN
    THROW 50001,
          N'dbo.vw_ApplicantFinalScore가 없습니다. 먼저 12_Create_ApplicantFinalScore.sql을 실행하세요.',
          1;
END;


/* 수험번호 존재 여부 확인 */
IF NOT EXISTS
(
    SELECT 1
    FROM dbo.vw_ApplicantFinalScore
    WHERE 수험번호 = @수험번호
)
BEGIN
    THROW 50002,
          N'입력한 수험번호의 지원정보가 없습니다.',
          1;
END;


/* ===========================================================
   지원자·전형규칙·최종환산점수 조회
   =========================================================== */

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

    /* 전형별 환산 과정 */
    환산전학생부점수,
    학생부환산차감점수,
    최종학생부환산점수,

    학생부환산방법,

    CONCAT
    (
        N'(',
        CONVERT(nvarchar(50), 우수학기1_등급),
        N' + ',
        CONVERT(nvarchar(50), 우수학기2_등급),
        N') ÷ 2 = ',
        CONVERT(nvarchar(50), 우수2개학기_평균등급)
    ) AS 우수학기평균계산식,

    CONCAT
    (
        N'920 + 10 × (9 - ',
        CONVERT(nvarchar(50), 우수2개학기_평균등급),
        N') = ',
        CONVERT(nvarchar(50), 공통학생부점수_1000점)
    ) AS 공통학생부점수계산식,

    최종학생부환산계산식,
    최종환산검증결과,
    적용규칙비고

FROM dbo.vw_ApplicantFinalScore

WHERE 수험번호 = @수험번호

ORDER BY
    모집시기,
    전형코드,
    모집단위코드;
GO