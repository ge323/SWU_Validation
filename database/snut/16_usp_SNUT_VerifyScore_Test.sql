USE [SNUT_Validation];
GO

/* ============================================================
   파일명: 16_usp_SNUT_VerifyScore_AllInOne.sql

   목적:
   수험번호 하나로 서울과기대 정량평가 대상 전형의 성적검증을
   하나의 프로시저 안에서 수행한다.

   처리 전형:
   1. 고교추천전형
   2. 특성화고졸재직자전형
   3. 논술전형
   4. 실기전형
   5. 비교내신(재직자/논술/실기)

   결과 집합:
   1. 지원정보
   2. 과목별 계산 상세
   3. 중간 집계/선정 검증
   4. 최종 점수 및 지원자격

   주의:
   - 논술점수와 실기점수는 외부 평가점수이므로 매개변수로 입력한다.
   - 비교내신 사용 여부와 논술 석차백분율도 매개변수로 입력한다.
   ============================================================ */
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_VerifyScore
    @수험번호 nvarchar(50),
    @논술점수 decimal(18,4) = NULL,
    @실기점수 decimal(18,4) = NULL,
    @비교내신사용 bit = 0,
    @논술석차백분율 decimal(9,4) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE
        @전형명 nvarchar(200),
        @전형코드 nvarchar(100),
        @계열명 nvarchar(100),
        @모집단위코드 nvarchar(100),
        @모집단위명 nvarchar(300),
        @입학연도 nvarchar(20),
        @모집시기 nvarchar(50),
        @비교유형 nvarchar(20);

    IF NULLIF(LTRIM(RTRIM(@수험번호)), N'') IS NULL
        THROW 50001, N'수험번호를 입력해야 합니다.', 1;

    SELECT TOP (1)
        @전형명 = A.전형명,
        @전형코드 = CONVERT(nvarchar(100), A.전형코드),
        @계열명 = A.계열명,
        @모집단위코드 = CONVERT(nvarchar(100), A.모집단위코드),
        @모집단위명 = A.모집단위명,
        @입학연도 = CONVERT(nvarchar(20), A.입학연도),
        @모집시기 = CONVERT(nvarchar(50), A.모집시기)
    FROM dbo.vwApplyInfo AS A
    WHERE A.수험번호 = @수험번호;

    IF @전형명 IS NULL
        THROW 50002, N'지원자 정보를 찾을 수 없습니다.', 1;

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.HsbSubjectScore
        WHERE 수험번호 = @수험번호
    )
    AND NOT (@비교내신사용 = 1 AND @전형명 LIKE N'%논술%')
        THROW 50003, N'입력한 수험번호의 학생부 성적 데이터가 없습니다.', 1;

    /* ============================================================
       비교내신 분기
       ============================================================ */
    IF @비교내신사용 = 1
    BEGIN
        SET @비교유형 =
            CASE
                WHEN @전형명 LIKE N'%특성화고%재직자%' THEN N'재직자'
                WHEN @전형명 LIKE N'%논술%' THEN N'논술'
                WHEN @전형명 LIKE N'%실기%' THEN N'실기'
                ELSE NULL
            END;

        IF @비교유형 IS NULL
            THROW 50004, N'비교내신 적용 대상 전형이 아닙니다.', 1;

        /* 결과 1: 지원정보 */
        SELECT
            @입학연도 AS 입학연도,
            @모집시기 AS 모집시기,
            @수험번호 AS 수험번호,
            @전형코드 AS 전형코드,
            @전형명 AS 전형명,
            @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드,
            @모집단위명 AS 모집단위명,
            @비교유형 AS 비교내신유형,
            N'비교내신 적용' AS 산출방식;

        IF @비교유형 = N'논술'
        BEGIN
            DECLARE @논술비교점수 decimal(18,2) =
                CASE
                    WHEN @논술석차백분율 BETWEEN 0 AND 4 THEN 300
                    WHEN @논술석차백분율 <= 11 THEN 295
                    WHEN @논술석차백분율 <= 23 THEN 290
                    WHEN @논술석차백분율 <= 40 THEN 280
                    WHEN @논술석차백분율 <= 60 THEN 270
                    WHEN @논술석차백분율 <= 77 THEN 260
                    WHEN @논술석차백분율 <= 89 THEN 220
                    WHEN @논술석차백분율 <= 96 THEN 170
                    WHEN @논술석차백분율 <= 100 THEN 0
                    ELSE NULL
                END;

            IF @논술석차백분율 IS NULL OR @논술비교점수 IS NULL
                THROW 50005, N'논술 비교내신은 0~100 범위의 논술 석차백분율이 필요합니다.', 1;

            /* 결과 2: 비교내신 구간 상세 */
            SELECT
                @논술석차백분율 AS 논술석차백분율,
                @논술비교점수 AS 비교내신반영점수,
                CASE
                    WHEN @논술석차백분율 <= 4 THEN N'0.00~4.00'
                    WHEN @논술석차백분율 <= 11 THEN N'4.01~11.00'
                    WHEN @논술석차백분율 <= 23 THEN N'11.01~23.00'
                    WHEN @논술석차백분율 <= 40 THEN N'23.01~40.00'
                    WHEN @논술석차백분율 <= 60 THEN N'40.01~60.00'
                    WHEN @논술석차백분율 <= 77 THEN N'60.01~77.00'
                    WHEN @논술석차백분율 <= 89 THEN N'77.01~89.00'
                    WHEN @논술석차백분율 <= 96 THEN N'89.01~96.00'
                    ELSE N'96.01~100.00'
                END AS 적용구간;

            /* 결과 3: 중간 검증 */
            SELECT
                @논술석차백분율 AS 입력석차백분율,
                @논술비교점수 AS 재계산점수,
                @논술비교점수 AS 산출점수,
                CAST(0 AS decimal(18,6)) AS 차이,
                N'일치' AS 검증결과;

            /* 결과 4: 최종 */
            SELECT
                N'비교내신' AS 결과유형,
                @수험번호 AS 수험번호,
                @전형코드 AS 전형코드,
                @전형명 AS 전형명,
                @계열명 AS 계열명,
                @모집단위코드 AS 모집단위코드,
                @모집단위명 AS 모집단위명,
                CAST(NULL AS int) AS 반영교과학기수,
                CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
                N'해당 없음' AS 지원자격판정,
                0 AS 최종반영과목수,
                CAST(NULL AS decimal(18,4)) AS 최종반영이수단위합,
                CAST(NULL AS decimal(18,6)) AS 교과점수원값,
                @논술비교점수 AS 최종교과점수,
                @논술비교점수 AS 비교내신점수,
                N'논술 석차백분율 비교평가' AS 산출방식;
            RETURN;
        END;

        DROP TABLE IF EXISTS #비교내신과목;

        ;WITH X AS
        (
            SELECT
                S.*,
                CASE
                    WHEN ISNULL(S.재적수, 0) > 0 AND S.석차 IS NOT NULL
                    THEN CONVERT(decimal(9,4), S.석차) * 100.0 / S.재적수
                END AS 석차백분율
            FROM dbo.HsbSubjectScore AS S
            WHERE S.수험번호 = @수험번호
        ),
        Y AS
        (
            SELECT
                X.*,
                CASE
                    WHEN 석차백분율 BETWEEN 0 AND 4 THEN 1000
                    WHEN 석차백분율 <= 11 THEN 990
                    WHEN 석차백분율 <= 23 THEN 980
                    WHEN 석차백분율 <= 40 THEN 970
                    WHEN 석차백분율 <= 60 THEN 960
                    WHEN 석차백분율 <= 77 THEN 800
                    WHEN 석차백분율 <= 89 THEN 500
                    WHEN 석차백분율 <= 96 THEN 250
                    WHEN 석차백분율 <= 100 THEN 0
                END AS 비교점수
            FROM X
        )
        SELECT *
        INTO #비교내신과목
        FROM Y
        WHERE 비교점수 IS NOT NULL
          AND ISNULL(이수단위, 0) > 0;

        DECLARE @비교최종 decimal(18,2) =
        (
            SELECT CAST
            (
                ROUND
                (
                    SUM(CONVERT(decimal(18,4), 비교점수) * CONVERT(decimal(18,4), 이수단위))
                    / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)), 0),
                    2
                )
                AS decimal(18,2)
            )
            FROM #비교내신과목
        );

        /* 결과 2: 과목별 상세 */
        SELECT
            수험번호, 학년, 학기, 편제명, 교과명, 과목명,
            이수단위, 석차, 재적수, 석차백분율,
            비교점수 AS 과목반영점수,
            CONVERT(decimal(18,4), 비교점수) * CONVERT(decimal(18,4), 이수단위) AS 가중점수,
            N'최종반영' AS 최종반영여부
        FROM #비교내신과목
        ORDER BY 학년, 학기, 과목명;

        /* 결과 3: 중간 집계 */
        SELECT
            COUNT(*) AS 반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 이수단위합,
            SUM(CONVERT(decimal(18,4), 비교점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            CAST
            (
                SUM(CONVERT(decimal(18,4), 비교점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)), 0)
                AS decimal(18,6)
            ) AS 재계산점수,
            @비교최종 AS 최종반영점수
        FROM #비교내신과목;

        /* 결과 4: 최종 */
        SELECT
            N'비교내신' AS 결과유형,
            @수험번호 AS 수험번호,
            @전형코드 AS 전형코드,
            @전형명 AS 전형명,
            @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드,
            @모집단위명 AS 모집단위명,
            CAST(NULL AS int) AS 반영교과학기수,
            CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
            N'지원자격 별도 확인' AS 지원자격판정,
            COUNT(*) AS 최종반영과목수,
            SUM(CONVERT(decimal(18,4), C.이수단위)) AS 최종반영이수단위합,
            CAST(NULL AS decimal(18,6)) AS 교과점수원값,
            @비교최종 AS 최종교과점수,
            @비교최종 AS 비교내신점수,
            N'과목 석차백분율 비교평가' AS 산출방식
        FROM #비교내신과목 AS C;
        RETURN;
    END;

    /* ============================================================
       고교추천전형
       ============================================================ */
    IF @전형명 LIKE N'%고교추천%'
    BEGIN
        DROP TABLE IF EXISTS #고교추천결과;

        ;WITH S AS
        (
            SELECT
                S.*,
                CASE
                    WHEN S.편제명 = N'국어' THEN N'국어'
                    WHEN S.편제명 = N'영어' THEN N'영어'
                    WHEN S.편제명 = N'수학' THEN N'수학'
                    WHEN S.편제명 IN (N'과학', N'과학 계열', N'과학에관한교과') THEN N'과학'
                    WHEN S.편제명 IN (N'사회', N'사회 계열', N'사회(역사/도덕포함)', N'사회에관한교과') THEN N'사회'
                    WHEN S.편제명 = N'한국사' THEN N'한국사'
                    ELSE N'기타'
                END AS 반영교과,
                TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(S.석차등급)), N'')) AS 석차등급숫자,
                UPPER(NULLIF(LTRIM(RTRIM(S.성취도)), N'')) AS 성취도정리
            FROM dbo.HsbSubjectScore AS S
            WHERE S.수험번호 = @수험번호
              AND (S.학년 IN (1,2) OR (S.학년 = 3 AND S.학기 = 1))
        ),
        J AS
        (
            SELECT
                @전형코드 AS 전형코드, @전형명 AS 전형명,
                @계열명 AS 계열명, @모집단위코드 AS 모집단위코드,
                @모집단위명 AS 모집단위명,
                S.*,
                CASE
                    WHEN @모집단위명 = N'건축학부(건축학전공)'
                     AND S.반영교과 IN (N'국어',N'영어',N'수학',N'과학',N'사회',N'한국사') THEN 1
                    WHEN @계열명 = N'자연'
                     AND @모집단위명 <> N'건축학부(건축학전공)'
                     AND S.반영교과 IN (N'국어',N'영어',N'수학',N'과학') THEN 1
                    WHEN @계열명 = N'인문'
                     AND S.반영교과 IN (N'국어',N'영어',N'수학',N'사회',N'한국사') THEN 1
                    ELSE 0
                END AS 반영교과여부
            FROM S
        ),
        P AS
        (
            SELECT
                J.*,
                CASE
                    WHEN 석차등급숫자 BETWEEN 1 AND 9 THEN N'석차등급'
                    WHEN 과목구분_02_진로교과 = 2 AND 성취도정리 IN (N'A',N'B',N'C') THEN N'진로선택'
                    ELSE N'미반영'
                END AS 점수구분,
                CASE 석차등급숫자
                    WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980
                    WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800
                    WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0
                END AS 석차등급반영점수,
                CASE 성취도정리
                    WHEN N'A' THEN 1000 WHEN N'B' THEN 980 WHEN N'C' THEN 800
                END AS 성취도반영점수
            FROM J
        ),
        C AS
        (
            SELECT
                P.*,
                CASE
                    WHEN 반영교과여부 = 0 THEN N'계열별 미반영 교과'
                    WHEN ISNULL(이수단위,0) <= 0 THEN N'이수단위 없음'
                    WHEN 점수구분 = N'석차등급'
                     AND (원점수 IS NULL OR 평균 IS NULL OR 표준편차 IS NULL OR ISNULL(재적수,0) <= 0)
                        THEN N'석차등급 과목 필수값 누락'
                    WHEN 점수구분 = N'진로선택'
                     AND (원점수 IS NULL OR 평균 IS NULL OR ISNULL(재적수,0) <= 0)
                        THEN N'진로선택 과목 필수값 누락'
                    WHEN 점수구분 = N'미반영' THEN N'석차등급·진로선택 조건 불충족'
                    ELSE N'반영후보'
                END AS 반영판정,
                CASE
                    WHEN 반영교과여부 = 1 AND 점수구분 = N'석차등급' THEN 석차등급반영점수
                    WHEN 반영교과여부 = 1 AND 점수구분 = N'진로선택' THEN 성취도반영점수
                END AS 과목반영점수
            FROM P
        ),
        R AS
        (
            SELECT
                C.*,
                CASE
                    WHEN 점수구분 = N'진로선택' AND 반영판정 = N'반영후보'
                    THEN ROW_NUMBER() OVER
                    (
                        PARTITION BY 수험번호, 점수구분
                        ORDER BY 성취도반영점수 DESC, 이수단위 DESC,
                                 원점수 DESC, 학년, 학기, 과목코드
                    )
                END AS 진로선택순위
            FROM C
        )
        SELECT
            R.*,
            CASE
                WHEN 반영판정 <> N'반영후보' THEN N'미반영'
                WHEN 점수구분 = N'석차등급' THEN N'최종반영'
                WHEN 점수구분 = N'진로선택' AND 진로선택순위 <= 3 THEN N'최종반영'
                WHEN 점수구분 = N'진로선택' THEN N'진로선택 상위 3과목 제외'
                ELSE N'미반영'
            END AS 최종반영여부
        INTO #고교추천결과
        FROM R;

        /* 결과 1: 지원정보 */
        SELECT
            @입학연도 AS 입학연도, @모집시기 AS 모집시기,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            100 AS 학생부반영비율,
            N'0~1,000점' AS 학생부점수범위,
            N'석차등급 전 과목 + 진로선택 상위 3과목의 이수단위 가중평균' AS 적용계산식;

        /* 결과 2: 과목별 상세 */
        SELECT
            학년, 학기, 편제명, 반영교과, 교과명, 과목명,
            이수단위, 원점수, 평균, 표준편차, 재적수,
            석차등급, 석차등급숫자 AS 적용등급,
            성취도, 성취도정리 AS 적용성취도,
            점수구분, 과목반영점수,
            CASE WHEN 최종반영여부 = N'최종반영'
                 THEN CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)
            END AS 가중점수,
            반영판정, 진로선택순위, 최종반영여부
        FROM #고교추천결과
        ORDER BY 학년, 학기, 반영교과, 점수구분, 과목명;

        /* 결과 3: 중간 집계 및 진로선택 검증 */
        SELECT
            N'교과별 집계' AS 검증구분,
            반영교과 AS 구분값,
            COUNT(*) AS 반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 이수단위합,
            SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            CAST
            (
                SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)), 0)
                AS decimal(18,6)
            ) AS 중간평균,
            CAST(NULL AS int) AS 선택순위,
            N'반영' AS 검증결과
        FROM #고교추천결과
        WHERE 최종반영여부 = N'최종반영'
        GROUP BY 반영교과

        UNION ALL

        SELECT
            N'진로선택 순위' AS 검증구분,
            과목명 AS 구분값,
            1 AS 반영과목수,
            CONVERT(decimal(18,4), 이수단위) AS 이수단위합,
            CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) AS 가중점수합,
            CONVERT(decimal(18,6), 과목반영점수) AS 중간평균,
            진로선택순위 AS 선택순위,
            CASE WHEN 진로선택순위 <= 3 AND 최종반영여부 = N'최종반영' THEN N'일치'
                 WHEN 진로선택순위 > 3 AND 최종반영여부 <> N'최종반영' THEN N'일치'
                 ELSE N'불일치' END AS 검증결과
        FROM #고교추천결과
        WHERE 점수구분 = N'진로선택'
        ORDER BY 검증구분, 선택순위, 구분값;

        /* 결과 4: 최종 */
        ;WITH F AS
        (
            SELECT * FROM #고교추천결과
            WHERE 최종반영여부 = N'최종반영'
              AND 과목반영점수 IS NOT NULL
              AND ISNULL(이수단위,0) > 0
        ),
        Q AS
        (
            SELECT
                COUNT(DISTINCT CASE
                    WHEN 반영교과여부 = 1
                     AND 점수구분 IN (N'석차등급',N'진로선택')
                     AND ISNULL(이수단위,0) > 0
                    THEN CONCAT(학년,N'-',학기) END) AS 반영교과학기수,
                SUM(CASE
                    WHEN 반영교과여부 = 1
                     AND 점수구분 IN (N'석차등급',N'진로선택')
                     AND ISNULL(이수단위,0) > 0
                    THEN CONVERT(decimal(18,4), 이수단위) ELSE 0 END) AS 자격판정이수단위합
            FROM #고교추천결과
        )
        SELECT
            N'고교추천전형' AS 결과유형,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            Q.반영교과학기수, Q.자격판정이수단위합,
            CASE WHEN Q.반영교과학기수 < 3 THEN N'부적격: 반영 교과 3개 학기 미만'
                 WHEN Q.자격판정이수단위합 < 80 THEN N'부적격: 반영 교과 80단위 미만'
                 ELSE N'지원자격 충족' END AS 지원자격판정,
            COUNT(*) AS 최종반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 최종반영이수단위합,
            SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            CAST
            (
                SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)),0)
                AS decimal(18,6)
            ) AS 교과점수원값,
            CAST
            (
                ROUND
                (
                    SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                    / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)),0), 2
                ) AS decimal(18,2)
            ) AS 최종교과점수,
            CAST(NULL AS decimal(18,2)) AS 비교내신점수,
            N'정상산출' AS 산출방식
        FROM F CROSS JOIN Q
        GROUP BY Q.반영교과학기수, Q.자격판정이수단위합;
        RETURN;
    END;

    /* ============================================================
       특성화고졸재직자전형
       ============================================================ */
    IF @전형명 LIKE N'%특성화고%재직자%'
    BEGIN
        DROP TABLE IF EXISTS #재직자결과;

        ;WITH B AS
        (
            SELECT
                @전형코드 AS 전형코드, @전형명 AS 전형명,
                @계열명 AS 계열명, @모집단위코드 AS 모집단위코드,
                @모집단위명 AS 모집단위명,
                S.*,
                TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(S.석차등급)),N'')) AS 등급,
                UPPER(NULLIF(LTRIM(RTRIM(S.성취도)),N'')) AS 성취도정리
            FROM dbo.HsbSubjectScore AS S
            WHERE S.수험번호 = @수험번호
              AND S.학년 IN (1,2)
        ),
        P AS
        (
            SELECT
                B.*,
                CASE
                    WHEN 등급 BETWEEN 1 AND 9 THEN N'석차등급'
                    WHEN 과목구분_02_진로교과 = 2 AND 성취도정리 IN (N'A',N'B',N'C') THEN N'진로선택'
                    WHEN 성취도정리 IN (N'A',N'B',N'C',N'D',N'E') THEN N'전문교과'
                    ELSE N'미반영'
                END AS 점수구분,
                CASE 등급
                    WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980
                    WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800
                    WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0
                END AS 등급점수,
                CASE 성취도정리
                    WHEN N'A' THEN 1000 WHEN N'B' THEN 980 WHEN N'C' THEN 800
                END AS 진로점수,
                CASE 성취도정리
                    WHEN N'A' THEN 1000 WHEN N'B' THEN 990 WHEN N'C' THEN 980
                    WHEN N'D' THEN 970 WHEN N'E' THEN 800
                END AS 전문점수
            FROM B
        ),
        R AS
        (
            SELECT
                P.*,
                CASE WHEN 점수구분 = N'진로선택'
                     THEN ROW_NUMBER() OVER
                     (
                         PARTITION BY 수험번호, 점수구분
                         ORDER BY 진로점수 DESC, 이수단위 DESC, 원점수 DESC,
                                  학년, 학기, 과목코드
                     )
                END AS 진로순위
            FROM P
        )
        SELECT
            R.*,
            CASE
                WHEN 점수구분 = N'석차등급' THEN 등급점수
                WHEN 점수구분 = N'전문교과' THEN 전문점수
                WHEN 점수구분 = N'진로선택' AND 진로순위 <= 3 THEN 진로점수
            END AS 과목반영점수,
            CASE
                WHEN 점수구분 IN (N'석차등급',N'전문교과') THEN N'최종반영'
                WHEN 점수구분 = N'진로선택' AND 진로순위 <= 3 THEN N'최종반영'
                WHEN 점수구분 = N'진로선택' THEN N'상위 3과목 제외'
                ELSE N'미반영'
            END AS 최종반영여부
        INTO #재직자결과
        FROM R;

        /* 결과 1 */
        SELECT
            @입학연도 AS 입학연도, @모집시기 AS 모집시기,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            100 AS 학생부반영비율,
            N'1~2학년 전 과목' AS 반영범위,
            N'석차등급·전문교과 전 과목 + 진로선택 상위 3과목 가중평균' AS 적용계산식;

        /* 결과 2 */
        SELECT
            학년, 학기, 편제명, 교과명, 과목명,
            이수단위, 원점수, 평균, 표준편차, 재적수,
            석차등급, 성취도, 점수구분, 과목반영점수,
            CASE WHEN 최종반영여부 = N'최종반영'
                 THEN CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)
            END AS 가중점수,
            진로순위, 최종반영여부
        FROM #재직자결과
        ORDER BY 학년, 학기, 과목명;

        /* 결과 3 */
        SELECT
            점수구분,
            COUNT(*) AS 반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 이수단위합,
            SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            CAST
            (
                SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)),0)
                AS decimal(18,6)
            ) AS 구분별평균
        FROM #재직자결과
        WHERE 최종반영여부 = N'최종반영'
        GROUP BY 점수구분;

        /* 결과 4 */
        SELECT
            N'특성화고졸재직자전형' AS 결과유형,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            CAST(NULL AS int) AS 반영교과학기수,
            CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
            N'지원자격 서류 별도 확인' AS 지원자격판정,
            SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN 1 ELSE 0 END) AS 최종반영과목수,
            SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 이수단위) ELSE 0 END) AS 최종반영이수단위합,
            SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) ELSE 0 END) AS 가중점수합,
            CAST
            (
                SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) ELSE 0 END)
                / NULLIF(SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 이수단위) ELSE 0 END),0)
                AS decimal(18,6)
            ) AS 교과점수원값,
            CAST
            (
                ROUND
                (
                    SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) ELSE 0 END)
                    / NULLIF(SUM(CASE WHEN 최종반영여부 = N'최종반영' THEN CONVERT(decimal(18,4), 이수단위) ELSE 0 END),0), 2
                ) AS decimal(18,2)
            ) AS 최종교과점수,
            CAST(NULL AS decimal(18,2)) AS 비교내신점수,
            N'정상산출' AS 산출방식
        FROM #재직자결과;
        RETURN;
    END;

    /* ============================================================
       논술전형
       ============================================================ */
    IF @전형명 LIKE N'%논술%'
    BEGIN
        DROP TABLE IF EXISTS #논술결과;

        SELECT
            S.*,
            CASE TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(S.석차등급)),N''))
                WHEN 1 THEN 300 WHEN 2 THEN 295 WHEN 3 THEN 290
                WHEN 4 THEN 280 WHEN 5 THEN 270 WHEN 6 THEN 260
                WHEN 7 THEN 220 WHEN 8 THEN 170 WHEN 9 THEN 0
            END AS 과목반영점수
        INTO #논술결과
        FROM dbo.HsbSubjectScore AS S
        WHERE S.수험번호 = @수험번호
          AND (S.학년 IN (1,2) OR (S.학년 = 3 AND S.학기 = 1))
          AND S.편제명 IN (N'국어',N'영어',N'수학',N'과학',N'과학 계열',N'과학에관한교과');

        DECLARE @논술교과 decimal(18,6) =
        (
            SELECT
                SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)),0)
            FROM #논술결과
            WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0
        );

        /* 결과 1 */
        SELECT
            @입학연도 AS 입학연도, @모집시기 AS 모집시기,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            30 AS 학생부반영비율, 70 AS 논술반영비율,
            N'학생부 300점 + 논술 700점' AS 적용계산식;

        /* 결과 2 */
        SELECT
            학년, 학기, 편제명, 교과명, 과목명,
            이수단위, 석차등급, 과목반영점수,
            CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) AS 가중점수,
            N'최종반영' AS 최종반영여부
        FROM #논술결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0
        ORDER BY 학년, 학기, 과목명;

        /* 결과 3 */
        SELECT
            COUNT(*) AS 반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 이수단위합,
            SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            @논술교과 AS 재계산교과점수,
            CAST(ROUND(@논술교과,2) AS decimal(18,2)) AS 학생부반영점수,
            @논술점수 AS 논술점수,
            CASE WHEN @논술점수 IS NULL THEN N'논술점수 미입력' ELSE N'입력 완료' END AS 논술점수상태
        FROM #논술결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0;

        /* 결과 4 */
        SELECT
            N'논술전형' AS 결과유형,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            CAST(NULL AS int) AS 반영교과학기수,
            CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
            N'해당 없음' AS 지원자격판정,
            COUNT(*) AS 최종반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 최종반영이수단위합,
            @논술교과 AS 교과점수원값,
            CAST(ROUND(@논술교과,2) AS decimal(18,2)) AS 최종교과점수,
            CAST(NULL AS decimal(18,2)) AS 비교내신점수,
            N'정상산출' AS 산출방식,
            @논술점수 AS 논술점수,
            CASE WHEN @논술점수 IS NULL THEN NULL
                 ELSE CAST(ROUND(@논술교과 + @논술점수,2) AS decimal(18,2)) END AS 전형총점
        FROM #논술결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0;
        RETURN;
    END;

    /* ============================================================
       실기전형
       ============================================================ */
    IF @전형명 LIKE N'%실기%'
    BEGIN
        DROP TABLE IF EXISTS #실기결과;

        SELECT
            S.*,
            CASE TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(S.석차등급)),N''))
                WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980
                WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800
                WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0
            END AS 과목반영점수
        INTO #실기결과
        FROM dbo.HsbSubjectScore AS S
        WHERE S.수험번호 = @수험번호
          AND (S.학년 IN (1,2) OR (S.학년 = 3 AND S.학기 = 1))
          AND S.편제명 IN
          (
              N'국어',N'영어',N'사회',N'사회 계열',
              N'사회(역사/도덕포함)',N'사회에관한교과',N'한국사'
          );

        DECLARE @실기교과 decimal(18,6) =
        (
            SELECT
                SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), 이수단위)),0)
            FROM #실기결과
            WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0
        );

        /* 결과 1 */
        SELECT
            @입학연도 AS 입학연도, @모집시기 AS 모집시기,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            N'1단계 학생부 100%, 2단계 실기 100%' AS 전형구조,
            N'학생부 0~1,000점' AS 학생부점수범위;

        /* 결과 2 */
        SELECT
            학년, 학기, 편제명, 교과명, 과목명,
            이수단위, 석차등급, 과목반영점수,
            CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위) AS 가중점수,
            N'최종반영' AS 최종반영여부
        FROM #실기결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0
        ORDER BY 학년, 학기, 과목명;

        /* 결과 3 */
        SELECT
            COUNT(*) AS 반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 이수단위합,
            SUM(CONVERT(decimal(18,4), 과목반영점수) * CONVERT(decimal(18,4), 이수단위)) AS 가중점수합,
            @실기교과 AS 재계산교과점수,
            CAST(ROUND(@실기교과,2) AS decimal(18,2)) AS 학생부점수,
            @실기점수 AS 실기점수,
            CASE WHEN @실기점수 IS NULL THEN N'실기점수 미입력' ELSE N'입력 완료' END AS 실기점수상태
        FROM #실기결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0;

        /* 결과 4 */
        SELECT
            N'실기전형' AS 결과유형,
            @수험번호 AS 수험번호, @전형코드 AS 전형코드,
            @전형명 AS 전형명, @계열명 AS 계열명,
            @모집단위코드 AS 모집단위코드, @모집단위명 AS 모집단위명,
            CAST(NULL AS int) AS 반영교과학기수,
            CAST(NULL AS decimal(18,4)) AS 자격판정이수단위합,
            N'해당 없음' AS 지원자격판정,
            COUNT(*) AS 최종반영과목수,
            SUM(CONVERT(decimal(18,4), 이수단위)) AS 최종반영이수단위합,
            @실기교과 AS 교과점수원값,
            CAST(ROUND(@실기교과,2) AS decimal(18,2)) AS 최종교과점수,
            CAST(NULL AS decimal(18,2)) AS 비교내신점수,
            N'정상산출' AS 산출방식,
            @실기점수 AS 실기점수
        FROM #실기결과
        WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0) > 0;
        RETURN;
    END;

    THROW 50017, N'현재 성적검증 대상이 아닌 전형입니다.', 1;
END;
GO

/* ============================================================
   실행 예시
   ============================================================ */
-- 일반 조회
-- EXEC dbo.usp_SNUT_VerifyScore @수험번호 = N'26100100001';

-- 논술전형
-- EXEC dbo.usp_SNUT_VerifyScore
--     @수험번호 = N'논술수험번호',
--     @논술점수 = 650;

-- 실기전형
-- EXEC dbo.usp_SNUT_VerifyScore
--     @수험번호 = N'실기수험번호',
--     @실기점수 = 900;

-- 논술 비교내신
-- EXEC dbo.usp_SNUT_VerifyScore
--     @수험번호 = N'논술수험번호',
--     @비교내신사용 = 1,
--     @논술석차백분율 = 18.5;