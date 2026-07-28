USE [SNUT_Validation];
GO

CREATE OR ALTER PROCEDURE dbo.usp_SNUT_Verify_Essay
    @수험번호 nvarchar(50),
    @논술점수 decimal(18,4) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.vwApplyInfo
        WHERE 수험번호 = @수험번호
          AND 전형명 = N'논술전형'
    )
        THROW 50013, N'논술전형 지원자를 찾을 수 없습니다.', 1;

    IF @논술점수 IS NOT NULL
       AND (@논술점수 < 0 OR @논술점수 > 700)
        THROW 50014, N'논술점수는 0~700점 범위여야 합니다.', 1;

    DROP TABLE IF EXISTS #R;

    SELECT
        A.전형코드,
        A.전형명,
        A.계열명,
        A.모집단위코드,
        A.모집단위명,

        S.수험번호,
        S.학년,
        S.학기,
        S.편제명,
        S.교과명,
        S.과목명,
        S.과목코드,
        S.이수단위,
        S.원점수,
        S.평균,
        S.표준편차,
        S.석차,
        S.재적수,
        S.석차등급,
        S.성취도,

        TRY_CONVERT
        (
            int,
            NULLIF(LTRIM(RTRIM(S.석차등급)), N'')
        ) AS 적용등급,

        CASE TRY_CONVERT
        (
            int,
            NULLIF(LTRIM(RTRIM(S.석차등급)), N'')
        )
            WHEN 1 THEN 300
            WHEN 2 THEN 295
            WHEN 3 THEN 290
            WHEN 4 THEN 280
            WHEN 5 THEN 270
            WHEN 6 THEN 260
            WHEN 7 THEN 220
            WHEN 8 THEN 170
            WHEN 9 THEN 0
        END AS 과목반영점수,

        CASE
            WHEN ISNULL(S.이수단위, 0) <= 0
                THEN N'이수단위 없음'

            WHEN TRY_CONVERT
                 (
                     int,
                     NULLIF(LTRIM(RTRIM(S.석차등급)), N'')
                 ) NOT BETWEEN 1 AND 9
                THEN N'석차등급 없음'

            WHEN S.원점수 IS NULL
              OR S.평균 IS NULL
              OR S.표준편차 IS NULL
              OR ISNULL(S.재적수, 0) <= 0
                THEN N'필수 성적값 누락'

            ELSE N'반영후보'
        END AS 반영판정
    INTO #R
    FROM dbo.vwApplyInfo AS A
    INNER JOIN dbo.HsbSubjectScore AS S
        ON A.수험번호 = S.수험번호
    WHERE A.수험번호 = @수험번호
      AND A.전형명 = N'논술전형'
      AND
      (
          S.학년 IN (1, 2)
          OR (S.학년 = 3 AND S.학기 = 1)
      )
      AND S.편제명 IN
      (
          N'국어',
          N'영어',
          N'수학',
          N'과학',
          N'과학 계열',
          N'과학에관한교과'
      );

    IF NOT EXISTS
    (
        SELECT 1
        FROM #R
        WHERE 과목반영점수 IS NOT NULL
          AND 반영판정 = N'반영후보'
          AND ISNULL(이수단위, 0) > 0
    )
        THROW 50015, N'논술전형에 반영 가능한 교과 성적이 없습니다.', 1;

    DECLARE @교과 decimal(18,6);

    SELECT
        @교과 =
            SUM
            (
                CONVERT(decimal(18,4), 과목반영점수)
                * CONVERT(decimal(18,4), 이수단위)
            )
            / NULLIF
            (
                SUM(CONVERT(decimal(18,4), 이수단위)),
                0
            )
    FROM #R
    WHERE 과목반영점수 IS NOT NULL
      AND 반영판정 = N'반영후보'
      AND ISNULL(이수단위, 0) > 0;

    /* 결과 1: 최종 결과 */
    SELECT
        N'논술전형' AS 결과유형,
        MAX(수험번호) AS 수험번호,
        MAX(전형코드) AS 전형코드,
        MAX(전형명) AS 전형명,
        MAX(계열명) AS 계열명,
        MAX(모집단위코드) AS 모집단위코드,
        MAX(모집단위명) AS 모집단위명,

        CAST(NULL AS int) AS 반영교과학기수,
        CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
        N'해당 없음' AS 지원자격판정,

        COUNT(*) AS 최종반영과목수,
        SUM(CONVERT(decimal(18,4), 이수단위))
            AS 최종반영이수단위합,

        SUM
        (
            CONVERT(decimal(18,4), 과목반영점수)
            * CONVERT(decimal(18,4), 이수단위)
        ) AS 가중점수합,

        @교과 AS 교과점수원값,

        CAST
        (
            ROUND(@교과, 2)
            AS decimal(18,2)
        ) AS 최종교과점수,

        CAST(NULL AS decimal(18,2)) AS 비교내신점수,
        N'정상산출' AS 산출방식,

        @논술점수 AS 논술점수,

        CASE
            WHEN @논술점수 IS NULL
                THEN NULL
            ELSE CAST
            (
                ROUND(@교과 + @논술점수, 2)
                AS decimal(18,2)
            )
        END AS 전형총점
    FROM #R
    WHERE 과목반영점수 IS NOT NULL
      AND 반영판정 = N'반영후보'
      AND ISNULL(이수단위, 0) > 0;

    /* 결과 2: 과목별 상세 */
    SELECT
        수험번호,
        학년,
        학기,
        편제명,
        교과명,
        과목명,
        과목코드,
        이수단위,
        원점수,
        평균,
        표준편차,
        석차,
        재적수,
        석차등급,
        성취도,
        적용등급,
        과목반영점수,

        CASE
            WHEN 과목반영점수 IS NOT NULL
             AND 반영판정 = N'반영후보'
             AND ISNULL(이수단위, 0) > 0
            THEN
                CONVERT(decimal(18,4), 과목반영점수)
                * CONVERT(decimal(18,4), 이수단위)
        END AS 가중점수,

        반영판정,

        CASE
            WHEN 과목반영점수 IS NOT NULL
             AND 반영판정 = N'반영후보'
             AND ISNULL(이수단위, 0) > 0
                THEN N'최종반영'
            ELSE N'미반영'
        END AS 최종반영여부
    FROM #R
    ORDER BY 학년, 학기, 과목명;
END;
GO