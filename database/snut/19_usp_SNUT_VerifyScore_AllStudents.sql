USE [SNUT_Validation];
GO

/* ============================================================
   파일명: 17_usp_SNUT_VerifyScore_AllStudents.sql

   목적:
   - 전체 지원자의 정량평가 교과점수를 한 결과표로 조회한다.
   - 기존 dbo.usp_SNUT_VerifyScore는 학생 1명의 상세 검증용으로 유지한다.
   - 본 프로시저는 전체 학생의 요약 점수와 검증상태를 조회하는 용도이다.

   대상 전형:
   1. 고교추천전형
   2. 특성화고졸재직자전형
   3. 논술전형
   4. 실기전형

   유의사항:
   - 논술고사점수와 실기점수는 별도 점수 테이블이 확인되지 않아
     이 프로시저에서는 교과점수까지만 계산한다.
   - 비교내신, 검정고시, 국외고, 평어 및 계열석차백분율 대상자는
     '상세검증필요'로 표시하고 기존 1인 상세 프로시저로 확인한다.
   - 전문교과 판별은 현재 확보된 컬럼만으로 완전히 확정할 수 없으므로,
     실제 전문교과 구분 컬럼이 있다면 아래 전문교과 조건을 교체해야 한다.
   ============================================================ */
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_VerifyScore_AllStudents
    @전형명검색 nvarchar(200) = NULL,
    @수험번호검색 nvarchar(50) = NULL,
    @오류학생만 bit = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DROP TABLE IF EXISTS #지원자;
    DROP TABLE IF EXISTS #과목판정;
    DROP TABLE IF EXISTS #진로순위;
    DROP TABLE IF EXISTS #최종과목;
    DROP TABLE IF EXISTS #자격집계;
    DROP TABLE IF EXISTS #점수집계;

    /* ------------------------------------------------------------
       1. 대상 지원자
       ------------------------------------------------------------ */
    SELECT DISTINCT
        CONVERT(nvarchar(20), A.입학연도) AS 입학연도,
        CONVERT(nvarchar(50), A.모집시기) AS 모집시기,
        CONVERT(nvarchar(50), A.수험번호) AS 수험번호,
        CONVERT(nvarchar(100), A.전형코드) AS 전형코드,
        A.전형명,
        A.계열명,
        CONVERT(nvarchar(100), A.모집단위코드) AS 모집단위코드,
        A.모집단위명,
        CASE
            WHEN A.전형명 LIKE N'%고교추천%' THEN N'고교추천'
            WHEN A.전형명 LIKE N'%특성화고%재직자%' THEN N'재직자'
            WHEN A.전형명 LIKE N'%논술%' THEN N'논술'
            WHEN A.전형명 LIKE N'%실기%' THEN N'실기'
            ELSE N'대상외'
        END AS 전형유형
    INTO #지원자
    FROM dbo.vwApplyInfo AS A
    WHERE A.수험번호 IS NOT NULL
      AND (
            A.전형명 LIKE N'%고교추천%'
         OR A.전형명 LIKE N'%특성화고%재직자%'
         OR A.전형명 LIKE N'%논술%'
         OR A.전형명 LIKE N'%실기%'
      )
      AND (@전형명검색 IS NULL OR A.전형명 LIKE N'%' + @전형명검색 + N'%')
      AND (@수험번호검색 IS NULL OR CONVERT(nvarchar(50), A.수험번호) = @수험번호검색);

    /* ------------------------------------------------------------
       2. 과목별 반영교과, 점수구분, 필수값 및 환산점수 판정
       ------------------------------------------------------------ */
    ;WITH B AS
    (
        SELECT
            A.입학연도,
            A.모집시기,
            A.수험번호,
            A.전형코드,
            A.전형명,
            A.계열명,
            A.모집단위코드,
            A.모집단위명,
            A.전형유형,

            /* HsbSubjectScore에서 실제 계산에 필요한 컬럼만 명시한다.
               S.*를 사용하면 A와 S에 공통으로 존재하는 입학연도, 수험번호 등의
               컬럼명이 중복되어 CTE 생성 오류(메시지 8156)가 발생할 수 있다. */
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
            S.재적수,
            S.석차등급,
            S.성취도,
            S.과목구분_02_진로교과,

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
        FROM #지원자 AS A
        INNER JOIN dbo.HsbSubjectScore AS S
            ON S.수험번호 = A.수험번호
        WHERE
               (A.전형유형 IN (N'고교추천', N'논술', N'실기')
                AND (S.학년 IN (1,2) OR (S.학년 = 3 AND S.학기 = 1)))
            OR (A.전형유형 = N'재직자' AND S.학년 IN (1,2))
    ),
    C AS
    (
        SELECT
            B.*,
            CASE
                WHEN 전형유형 = N'고교추천'
                 AND 모집단위명 = N'건축학부(건축학전공)'
                 AND 반영교과 IN (N'국어',N'영어',N'수학',N'과학',N'사회',N'한국사') THEN 1
                WHEN 전형유형 = N'고교추천'
                 AND 계열명 = N'자연'
                 AND 모집단위명 <> N'건축학부(건축학전공)'
                 AND 반영교과 IN (N'국어',N'영어',N'수학',N'과학') THEN 1
                WHEN 전형유형 = N'고교추천'
                 AND 계열명 = N'인문'
                 AND 반영교과 IN (N'국어',N'영어',N'수학',N'사회',N'한국사') THEN 1
                WHEN 전형유형 = N'재직자' THEN 1
                WHEN 전형유형 = N'논술'
                 AND 반영교과 IN (N'국어',N'영어',N'수학',N'과학') THEN 1
                WHEN 전형유형 = N'실기'
                 AND 반영교과 IN (N'국어',N'영어',N'사회',N'한국사') THEN 1
                ELSE 0
            END AS 반영교과여부,
            CASE
                WHEN 석차등급숫자 BETWEEN 1 AND 9 THEN N'석차등급'
                WHEN 전형유형 IN (N'고교추천', N'재직자')
                 AND 과목구분_02_진로교과 = 2
                 AND 성취도정리 IN (N'A',N'B',N'C') THEN N'진로선택'
                /* TODO: 실제 전문교과 구분 컬럼이 있으면 이 조건을 반드시 교체 */
                WHEN 전형유형 = N'재직자'
                 AND ISNULL(과목구분_02_진로교과, 0) <> 2
                 AND 성취도정리 IN (N'A',N'B',N'C',N'D',N'E') THEN N'전문교과'
                ELSE N'미반영'
            END AS 점수구분
        FROM B
    ),
    D AS
    (
        SELECT
            C.*,
            CASE
                WHEN 전형유형 = N'논술' THEN
                    CASE 석차등급숫자
                        WHEN 1 THEN 300 WHEN 2 THEN 295 WHEN 3 THEN 290
                        WHEN 4 THEN 280 WHEN 5 THEN 270 WHEN 6 THEN 260
                        WHEN 7 THEN 220 WHEN 8 THEN 170 WHEN 9 THEN 0
                    END
                WHEN 점수구분 = N'석차등급' THEN
                    CASE 석차등급숫자
                        WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980
                        WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800
                        WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0
                    END
                WHEN 점수구분 = N'진로선택' THEN
                    CASE 성취도정리
                        WHEN N'A' THEN 1000 WHEN N'B' THEN 980 WHEN N'C' THEN 800
                    END
                WHEN 점수구분 = N'전문교과' THEN
                    CASE 성취도정리
                        WHEN N'A' THEN 1000 WHEN N'B' THEN 990 WHEN N'C' THEN 980
                        WHEN N'D' THEN 970 WHEN N'E' THEN 800
                    END
            END AS 과목반영점수,
            CASE
                WHEN 반영교과여부 = 0 THEN N'전형별 미반영 교과'
                WHEN ISNULL(이수단위, 0) <= 0 THEN N'이수단위 없음'
                WHEN 점수구분 = N'석차등급'
                 AND (원점수 IS NULL OR 평균 IS NULL OR 표준편차 IS NULL OR ISNULL(재적수,0) <= 0)
                    THEN N'석차등급 과목 필수값 누락'
                WHEN 점수구분 IN (N'진로선택', N'전문교과')
                 AND (원점수 IS NULL OR 평균 IS NULL OR ISNULL(재적수,0) <= 0)
                    THEN N'성취도 과목 필수값 누락'
                WHEN 점수구분 = N'미반영' THEN N'점수산출 조건 불충족'
                ELSE N'반영후보'
            END AS 반영판정
        FROM C
    )
    SELECT *
    INTO #과목판정
    FROM D;

    /* ------------------------------------------------------------
       3. 진로선택 상위 3과목 순위
       ------------------------------------------------------------ */
    SELECT
        P.*,
        CASE
            WHEN P.점수구분 = N'진로선택'
             AND P.반영판정 = N'반영후보'
            THEN ROW_NUMBER() OVER
            (
                PARTITION BY P.수험번호, P.전형유형, P.점수구분
                ORDER BY P.과목반영점수 DESC,
                         P.이수단위 DESC,
                         P.원점수 DESC,
                         P.학년,
                         P.학기,
                         P.과목코드
            )
        END AS 진로선택순위
    INTO #진로순위
    FROM #과목판정 AS P;

    /* ------------------------------------------------------------
       4. 최종 반영 여부
       ------------------------------------------------------------ */
    SELECT
        R.*,
        CASE
            WHEN R.반영판정 <> N'반영후보' THEN N'미반영'
            WHEN R.점수구분 IN (N'석차등급', N'전문교과') THEN N'최종반영'
            WHEN R.점수구분 = N'진로선택' AND R.진로선택순위 <= 3 THEN N'최종반영'
            WHEN R.점수구분 = N'진로선택' THEN N'상위 3과목 제외'
            ELSE N'미반영'
        END AS 최종반영여부
    INTO #최종과목
    FROM #진로순위 AS R;

    /* ------------------------------------------------------------
       5. 고교추천 지원자격용 집계
       - 3개 학기 이상
       - 계열별 반영교과 80단위 이상
       - 진로선택은 상위 3과목이 아니라 성적산출 가능한 전체 이수단위 포함
       ------------------------------------------------------------ */
    SELECT
        A.수험번호,
        COUNT(DISTINCT CASE
            WHEN F.반영교과여부 = 1
             AND F.반영판정 = N'반영후보'
             AND F.점수구분 IN (N'석차등급', N'진로선택')
             AND ISNULL(F.이수단위, 0) > 0
            THEN CONCAT(F.학년, N'-', F.학기)
        END) AS 반영교과학기수,
        SUM(CASE
            WHEN F.반영교과여부 = 1
             AND F.반영판정 = N'반영후보'
             AND F.점수구분 IN (N'석차등급', N'진로선택')
             AND ISNULL(F.이수단위, 0) > 0
            THEN CONVERT(decimal(18,4), F.이수단위)
            ELSE 0
        END) AS 자격판정이수단위합
    INTO #자격집계
    FROM #지원자 AS A
    LEFT JOIN #최종과목 AS F
        ON F.수험번호 = A.수험번호
       AND F.전형유형 = N'고교추천'
    GROUP BY A.수험번호;

    /* ------------------------------------------------------------
       6. 최종 반영과목 점수 집계
       ------------------------------------------------------------ */
    SELECT
        F.수험번호,
        COUNT(*) AS 최종반영과목수,
        SUM(CONVERT(decimal(18,4), F.이수단위)) AS 최종반영이수단위합,
        SUM(CONVERT(decimal(18,4), F.과목반영점수)
            * CONVERT(decimal(18,4), F.이수단위)) AS 가중점수합,
        CAST
        (
            SUM(CONVERT(decimal(18,4), F.과목반영점수)
                * CONVERT(decimal(18,4), F.이수단위))
            / NULLIF(SUM(CONVERT(decimal(18,4), F.이수단위)), 0)
            AS decimal(18,6)
        ) AS 교과점수원값,
        CAST
        (
            ROUND
            (
                SUM(CONVERT(decimal(18,4), F.과목반영점수)
                    * CONVERT(decimal(18,4), F.이수단위))
                / NULLIF(SUM(CONVERT(decimal(18,4), F.이수단위)), 0),
                2
            )
            AS decimal(18,2)
        ) AS 최종교과점수,
        SUM(CASE WHEN F.반영교과 = N'국어'
                 THEN CONVERT(decimal(18,4), F.과목반영점수) * CONVERT(decimal(18,4), F.이수단위) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN F.반영교과 = N'국어' THEN CONVERT(decimal(18,4), F.이수단위) ELSE 0 END), 0) AS 국어교과점수,
        SUM(CASE WHEN F.반영교과 = N'영어'
                 THEN CONVERT(decimal(18,4), F.과목반영점수) * CONVERT(decimal(18,4), F.이수단위) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN F.반영교과 = N'영어' THEN CONVERT(decimal(18,4), F.이수단위) ELSE 0 END), 0) AS 영어교과점수,
        SUM(CASE WHEN F.반영교과 = N'수학'
                 THEN CONVERT(decimal(18,4), F.과목반영점수) * CONVERT(decimal(18,4), F.이수단위) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN F.반영교과 = N'수학' THEN CONVERT(decimal(18,4), F.이수단위) ELSE 0 END), 0) AS 수학교과점수,
        SUM(CASE WHEN F.반영교과 = N'과학'
                 THEN CONVERT(decimal(18,4), F.과목반영점수) * CONVERT(decimal(18,4), F.이수단위) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN F.반영교과 = N'과학' THEN CONVERT(decimal(18,4), F.이수단위) ELSE 0 END), 0) AS 과학교과점수,
        SUM(CASE WHEN F.반영교과 = N'사회'
                 THEN CONVERT(decimal(18,4), F.과목반영점수) * CONVERT(decimal(18,4), F.이수단위) ELSE 0 END)
        / NULLIF(SUM(CASE WHEN F.반영교과 = N'사회' THEN CONVERT(decimal(18,4), F.이수단위) ELSE 0 END), 0) AS 사회교과점수
    INTO #점수집계
    FROM #최종과목 AS F
    WHERE F.최종반영여부 = N'최종반영'
      AND F.과목반영점수 IS NOT NULL
      AND ISNULL(F.이수단위, 0) > 0
    GROUP BY F.수험번호;

    /* ------------------------------------------------------------
       7. 전체 학생 최종 결과
       ------------------------------------------------------------ */
    ;WITH 결과 AS
    (
        SELECT
            A.입학연도,
            A.모집시기,
            A.수험번호,
            A.전형코드,
            A.전형명,
            A.전형유형,
            A.계열명,
            A.모집단위코드,
            A.모집단위명,
            ISNULL(Q.반영교과학기수, 0) AS 반영교과학기수,
            ISNULL(Q.자격판정이수단위합, 0) AS 자격판정이수단위합,
            CASE
                WHEN A.전형유형 <> N'고교추천' THEN N'해당 없음 또는 별도 서류 확인'
                WHEN ISNULL(Q.반영교과학기수, 0) < 3 THEN N'부적격: 반영 교과 3개 학기 미만'
                WHEN ISNULL(Q.자격판정이수단위합, 0) < 80 THEN N'부적격: 반영 교과 80단위 미만'
                ELSE N'지원자격 충족'
            END AS 지원자격판정,
            ISNULL(S.최종반영과목수, 0) AS 최종반영과목수,
            ISNULL(S.최종반영이수단위합, 0) AS 최종반영이수단위합,
            S.가중점수합,
            S.교과점수원값,
            S.최종교과점수,
            CAST(S.국어교과점수 AS decimal(18,6)) AS 국어교과점수,
            CAST(S.영어교과점수 AS decimal(18,6)) AS 영어교과점수,
            CAST(S.수학교과점수 AS decimal(18,6)) AS 수학교과점수,
            CAST(S.과학교과점수 AS decimal(18,6)) AS 과학교과점수,
            CAST(S.사회교과점수 AS decimal(18,6)) AS 사회교과점수,
            CASE
                WHEN NOT EXISTS
                (
                    SELECT 1
                    FROM dbo.HsbSubjectScore AS H
                    WHERE H.수험번호 = A.수험번호
                ) THEN N'오류'
                WHEN ISNULL(S.최종반영과목수, 0) = 0 THEN N'상세검증필요'
                WHEN EXISTS
                (
                    SELECT 1
                    FROM #최종과목 AS E
                    WHERE E.수험번호 = A.수험번호
                      AND E.반영교과여부 = 1
                      AND E.반영판정 LIKE N'%필수값 누락%'
                ) THEN N'경고'
                ELSE N'정상'
            END AS 검증상태,
            CASE
                WHEN NOT EXISTS
                (
                    SELECT 1
                    FROM dbo.HsbSubjectScore AS H
                    WHERE H.수험번호 = A.수험번호
                ) THEN N'학생부 성적 데이터 없음'
                WHEN ISNULL(S.최종반영과목수, 0) = 0 THEN N'정상내신 산출 불가 또는 비교내신 대상 가능성 확인'
                WHEN EXISTS
                (
                    SELECT 1
                    FROM #최종과목 AS E
                    WHERE E.수험번호 = A.수험번호
                      AND E.반영교과여부 = 1
                      AND E.반영판정 LIKE N'%필수값 누락%'
                ) THEN N'일부 반영교과의 필수 성적값이 누락되어 제외됨'
                ELSE N'정상 산출'
            END AS 검증메시지
        FROM #지원자 AS A
        LEFT JOIN #자격집계 AS Q
            ON Q.수험번호 = A.수험번호
        LEFT JOIN #점수집계 AS S
            ON S.수험번호 = A.수험번호
    )
    SELECT *
    FROM 결과
    WHERE @오류학생만 = 0
       OR 검증상태 IN (N'오류', N'경고', N'상세검증필요')
    ORDER BY
        CASE 검증상태
            WHEN N'오류' THEN 1
            WHEN N'상세검증필요' THEN 2
            WHEN N'경고' THEN 3
            ELSE 4
        END,
        전형명,
        모집단위명,
        수험번호;
END;
GO

/* ============================================================
   실행 예시
   ============================================================ */

-- 1. 정량평가 대상 전체 학생 조회
-- EXEC dbo.usp_SNUT_VerifyScore_AllStudents;

-- 2. 고교추천전형만 조회
-- EXEC dbo.usp_SNUT_VerifyScore_AllStudents
--     @전형명검색 = N'고교추천';

-- 3. 논술전형만 조회
-- EXEC dbo.usp_SNUT_VerifyScore_AllStudents
--     @전형명검색 = N'논술';

-- 4. 오류·경고·상세검증 필요 학생만 조회
-- EXEC dbo.usp_SNUT_VerifyScore_AllStudents
--     @오류학생만 = 1;

-- 5. 특정 학생의 전체요약 조회
-- EXEC dbo.usp_SNUT_VerifyScore_AllStudents
--     @수험번호검색 = N'26100100001';

-- 6. 요약에서 이상 학생 확인 후 기존 상세 프로시저 실행
-- EXEC dbo.usp_SNUT_VerifyScore
--     @수험번호 = N'26100100001';