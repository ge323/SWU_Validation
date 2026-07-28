-- 04_Check_ImportedData.sql: 적재된 원천 데이터의 건수, 필수값, 중복 및 테이블 간 연결 상태를 점검한다.

USE [SWU_Validation];
GO

/* ===========================================================
   1. 테이블별 건수 확인
   =========================================================== */

SELECT 'CodeFormation' AS TableName, COUNT(*) AS TotalCount
FROM dbo.CodeFormation

UNION ALL

SELECT 'vwApplyInfo', COUNT(*)
FROM dbo.vwApplyInfo

UNION ALL

SELECT 'HsbSubjectScore', COUNT(*)
FROM dbo.HsbSubjectScore;
GO


/* ===========================================================
   2. 샘플 데이터 확인
   =========================================================== */

SELECT TOP (10) *
FROM dbo.CodeFormation;

SELECT TOP (10) *
FROM dbo.vwApplyInfo;

SELECT TOP (10) *
FROM dbo.HsbSubjectScore;
GO


/* ===========================================================
   3. 필수 컬럼 NULL 확인
   =========================================================== */

SELECT COUNT(*) AS NullCount
FROM dbo.vwApplyInfo
WHERE 수험번호 IS NULL;

SELECT COUNT(*) AS NullCount
FROM dbo.HsbSubjectScore
WHERE 수험번호 IS NULL;
GO


/* ===========================================================
   4. 지원자 ↔ 학생부 데이터 연결 확인
   =========================================================== */

SELECT
    COUNT(*) AS MatchCount
FROM dbo.vwApplyInfo A
INNER JOIN dbo.HsbSubjectScore B
    ON A.입학연도 = B.입학연도
   AND A.모집시기 = B.모집시기
   AND A.수험번호 = B.수험번호;
GO


/* ===========================================================
   5. CodeFormation 중복 확인
   =========================================================== */

SELECT
    입학연도,
    모집시기,
    편제코드,
    과목코드,
    COUNT(*) AS CNT
FROM dbo.CodeFormation
GROUP BY
    입학연도,
    모집시기,
    편제코드,
    과목코드
HAVING COUNT(*) > 1;
GO


/* ===========================================================
   6. 학생부 등급 값 확인
   =========================================================== */

SELECT
    석차등급,
    COUNT(*) AS CNT
FROM dbo.HsbSubjectScore
GROUP BY 석차등급
ORDER BY 석차등급;
GO