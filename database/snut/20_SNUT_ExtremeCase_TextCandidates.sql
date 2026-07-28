USE [SNUT_Validation];
GO

/* =====================================================================
   파일명: 20_SNUT_ExtremeCase_TestCandidates.sql

   목적
   - 서울과기대 성적검증 프로시저의 분기·예외 검증에 사용할
     극단 케이스 지원자를 자동으로 찾는다.
   - 데이터는 수정하지 않고 조회만 수행한다.
   ===================================================================== */

SET NOCOUNT ON;

DROP TABLE IF EXISTS #지원자;
DROP TABLE IF EXISTS #과목;
DROP TABLE IF EXISTS #후보;

SELECT DISTINCT
    CONVERT(nvarchar(50), A.수험번호) AS 수험번호,
    A.전형명,
    A.계열명,
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
WHERE A.수험번호 IS NOT NULL;

SELECT
    A.수험번호,
    A.전형명,
    A.전형유형,
    A.계열명,
    A.모집단위명,
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
    S.과목구분_02_진로교과,
    TRY_CONVERT(int, NULLIF(LTRIM(RTRIM(S.석차등급)), N'')) AS 석차등급숫자,
    UPPER(NULLIF(LTRIM(RTRIM(S.성취도)), N'')) AS 성취도정리
INTO #과목
FROM #지원자 AS A
LEFT JOIN dbo.HsbSubjectScore AS S
    ON CONVERT(nvarchar(50), S.수험번호) = A.수험번호;

CREATE TABLE #후보
(
    우선순위 int NOT NULL,
    케이스코드 nvarchar(50) NOT NULL,
    케이스명 nvarchar(200) NOT NULL,
    수험번호 nvarchar(50) NULL,
    전형명 nvarchar(200) NULL,
    계열명 nvarchar(100) NULL,
    모집단위명 nvarchar(300) NULL,
    확인값1 nvarchar(300) NULL,
    확인값2 nvarchar(300) NULL,
    확인방법 nvarchar(1000) NULL
);

/* 1. 전형별 정상 후보 */
;WITH X AS
(
    SELECT
        A.*,
        COUNT(S.수험번호) AS 학생부과목수,
        ROW_NUMBER() OVER
        (
            PARTITION BY A.전형유형
            ORDER BY COUNT(S.수험번호) DESC, A.수험번호
        ) AS rn
    FROM #지원자 AS A
    LEFT JOIN dbo.HsbSubjectScore AS S
        ON CONVERT(nvarchar(50), S.수험번호) = A.수험번호
    WHERE A.전형유형 IN (N'고교추천',N'재직자',N'논술',N'실기')
    GROUP BY A.수험번호, A.전형명, A.계열명, A.모집단위명, A.전형유형
)
INSERT INTO #후보
SELECT
    CASE 전형유형
        WHEN N'고교추천' THEN 10
        WHEN N'재직자' THEN 20
        WHEN N'논술' THEN 30
        WHEN N'실기' THEN 40
    END,
    CONCAT(N'NORMAL_', 전형유형),
    CONCAT(전형유형, N' 정상 데이터'),
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'학생부 과목 수=', 학생부과목수),
    NULL,
    N'반영과목수·이수단위합·가중점수합·최종교과점수를 웹과 비교'
FROM X
WHERE rn = 1 AND 학생부과목수 > 0;

/* 2. 학생부 데이터 없음 */
;WITH X AS
(
    SELECT
        A.*,
        ROW_NUMBER() OVER (ORDER BY A.수험번호) AS rn
    FROM #지원자 AS A
    WHERE A.전형유형 IN (N'고교추천',N'재직자',N'논술',N'실기')
      AND NOT EXISTS
      (
          SELECT 1
          FROM dbo.HsbSubjectScore AS S
          WHERE CONVERT(nvarchar(50), S.수험번호) = A.수험번호
      )
)
INSERT INTO #후보
SELECT
    50, N'NO_HSB_DATA', N'학생부 데이터 없음',
    수험번호, 전형명, 계열명, 모집단위명,
    N'HsbSubjectScore 0건', NULL,
    N'웹과 프로시저가 학생부 데이터 없음 오류를 반환하는지 확인'
FROM X
WHERE rn <= 3;

/* 3. 석차등급 필수값 누락 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE
            WHEN P.석차등급숫자 BETWEEN 1 AND 9
             AND (
                    P.원점수 IS NULL
                 OR P.평균 IS NULL
                 OR P.표준편차 IS NULL
                 OR ISNULL(P.재적수,0) <= 0
             )
            THEN 1 ELSE 0
        END) AS 누락과목수,
        ROW_NUMBER() OVER
        (
            ORDER BY SUM(CASE
                WHEN P.석차등급숫자 BETWEEN 1 AND 9
                 AND (
                        P.원점수 IS NULL
                     OR P.평균 IS NULL
                     OR P.표준편차 IS NULL
                     OR ISNULL(P.재적수,0) <= 0
                 )
                THEN 1 ELSE 0
            END) DESC, P.수험번호
        ) AS rn
    FROM #과목 AS P
    WHERE P.전형유형 IN (N'고교추천',N'재직자',N'논술',N'실기')
    GROUP BY P.수험번호
    HAVING SUM(CASE
        WHEN P.석차등급숫자 BETWEEN 1 AND 9
         AND (
                P.원점수 IS NULL
             OR P.평균 IS NULL
             OR P.표준편차 IS NULL
             OR ISNULL(P.재적수,0) <= 0
         )
        THEN 1 ELSE 0
    END) > 0
)
INSERT INTO #후보
SELECT
    60, N'MISSING_GRADE_FIELDS', N'석차등급 과목 필수값 누락',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'누락 과목 수=', 누락과목수),
    N'원점수/평균/표준편차/재적수',
    N'누락 과목이 미반영되고 경고 사유가 표시되는지 확인'
FROM X
WHERE rn <= 5;

/* 4. 진로선택 과목 수 경계 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE
            WHEN P.과목구분_02_진로교과 = 2
             AND P.성취도정리 IN (N'A',N'B',N'C')
             AND ISNULL(P.이수단위,0) > 0
             AND P.원점수 IS NOT NULL
             AND P.평균 IS NOT NULL
             AND ISNULL(P.재적수,0) > 0
            THEN 1 ELSE 0
        END) AS 유효진로과목수
    FROM #과목 AS P
    WHERE P.전형유형 IN (N'고교추천',N'재직자')
    GROUP BY P.수험번호
)
INSERT INTO #후보
SELECT TOP (1)
    70, N'CAREER_OVER_3', N'진로선택 4과목 이상',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'유효 진로선택=', 유효진로과목수, N'과목'),
    N'상위 3과목만 반영',
    N'선정순위 1~3만 최종반영되고 4위 이하가 제외되는지 확인'
FROM X
WHERE 유효진로과목수 >= 4
ORDER BY 유효진로과목수 DESC, 수험번호;

;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE
            WHEN P.과목구분_02_진로교과 = 2
             AND P.성취도정리 IN (N'A',N'B',N'C')
             AND ISNULL(P.이수단위,0) > 0
             AND P.원점수 IS NOT NULL
             AND P.평균 IS NOT NULL
             AND ISNULL(P.재적수,0) > 0
            THEN 1 ELSE 0
        END) AS 유효진로과목수
    FROM #과목 AS P
    WHERE P.전형유형 IN (N'고교추천',N'재직자')
    GROUP BY P.수험번호
)
INSERT INTO #후보
SELECT TOP (1)
    80, N'CAREER_EXACT_3', N'진로선택 정확히 3과목',
    수험번호, 전형명, 계열명, 모집단위명,
    N'유효 진로선택=3과목',
    N'3과목 모두 반영',
    N'진로선택 세 과목이 모두 최종반영되는지 확인'
FROM X
WHERE 유효진로과목수 = 3
ORDER BY 수험번호;

/* 5. 건축학부 별도 분기 */
INSERT INTO #후보
SELECT TOP (3)
    90, N'ARCHITECTURE_BRANCH', N'건축학부 별도 반영교과',
    수험번호, 전형명, 계열명, 모집단위명,
    N'국어·영어·수학·과학·사회·한국사',
    NULL,
    N'자연계열임에도 사회·한국사가 함께 반영되는지 확인'
FROM #지원자
WHERE 전형유형 = N'고교추천'
  AND 모집단위명 = N'건축학부(건축학전공)'
ORDER BY 수험번호;

/* 6. 고교추천 3개 학기 미만 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        COUNT(DISTINCT CASE
            WHEN P.학년 IN (1,2) OR (P.학년 = 3 AND P.학기 = 1)
            THEN CONCAT(P.학년,N'-',P.학기)
        END) AS 학기수
    FROM #과목 AS P
    WHERE P.전형유형 = N'고교추천'
    GROUP BY P.수험번호
)
INSERT INTO #후보
SELECT TOP (3)
    100, N'RECOMMEND_UNDER_3_SEMESTERS', N'고교추천 3개 학기 미만 후보',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'학생부 학기 수=',학기수),
    NULL,
    N'최종 결과가 3개 학기 미만 부적격인지 확인'
FROM X
WHERE 학기수 < 3
ORDER BY 학기수, 수험번호;

/* 7. 고교추천 80단위 경계 후보 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE
            WHEN ISNULL(P.이수단위,0) > 0
             AND (
                   P.석차등급숫자 BETWEEN 1 AND 9
                OR (
                     P.과목구분_02_진로교과 = 2
                     AND P.성취도정리 IN (N'A',N'B',N'C')
                   )
             )
            THEN CONVERT(decimal(18,4),P.이수단위)
            ELSE 0
        END) AS 산출가능이수단위참고
    FROM #과목 AS P
    WHERE P.전형유형 = N'고교추천'
    GROUP BY P.수험번호
)
INSERT INTO #후보
SELECT TOP (5)
    110, N'RECOMMEND_NEAR_80_UNITS', N'고교추천 80단위 경계 후보',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'산출가능 이수단위 참고=',산출가능이수단위참고),
    N'75~85단위 후보',
    N'프로시저의 실제 자격판정이수단위합과 지원자격판정을 확인'
FROM X
WHERE 산출가능이수단위참고 BETWEEN 75 AND 85
ORDER BY ABS(산출가능이수단위참고 - 80), 수험번호;

/* 8. 재직자 3학년 데이터 존재 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE WHEN P.학년 = 3 THEN 1 ELSE 0 END) AS 삼학년과목수,
        ROW_NUMBER() OVER
        (
            ORDER BY SUM(CASE WHEN P.학년 = 3 THEN 1 ELSE 0 END) DESC,
                     P.수험번호
        ) AS rn
    FROM #과목 AS P
    WHERE P.전형유형 = N'재직자'
    GROUP BY P.수험번호
    HAVING SUM(CASE WHEN P.학년 = 3 THEN 1 ELSE 0 END) > 0
)
INSERT INTO #후보
SELECT
    120, N'EMPLOYEE_HAS_GRADE3', N'재직자 3학년 데이터 존재',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'3학년 과목 수=',삼학년과목수),
    N'1·2학년만 반영',
    N'3학년 과목이 최종 점수에서 제외되는지 확인'
FROM X
WHERE rn <= 5;

/* 9. 전문교과 추정 후보 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        SUM(CASE
            WHEN ISNULL(P.과목구분_02_진로교과,0) <> 2
             AND P.성취도정리 IN (N'A',N'B',N'C',N'D',N'E')
             AND P.석차등급숫자 IS NULL
            THEN 1 ELSE 0
        END) AS 전문교과추정수,
        ROW_NUMBER() OVER
        (
            ORDER BY SUM(CASE
                WHEN ISNULL(P.과목구분_02_진로교과,0) <> 2
                 AND P.성취도정리 IN (N'A',N'B',N'C',N'D',N'E')
                 AND P.석차등급숫자 IS NULL
                THEN 1 ELSE 0
            END) DESC, P.수험번호
        ) AS rn
    FROM #과목 AS P
    WHERE P.전형유형 = N'재직자'
    GROUP BY P.수험번호
    HAVING SUM(CASE
        WHEN ISNULL(P.과목구분_02_진로교과,0) <> 2
         AND P.성취도정리 IN (N'A',N'B',N'C',N'D',N'E')
         AND P.석차등급숫자 IS NULL
        THEN 1 ELSE 0
    END) > 0
)
INSERT INTO #후보
SELECT
    130, N'EMPLOYEE_PRO_SUBJECT_ESTIMATE', N'재직자 전문교과 추정 후보',
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'전문교과 추정 과목=',전문교과추정수),
    N'전문교과 전용 구분 컬럼 확인 필요',
    N'A/B/C/D/E 환산점수가 1000/990/980/970/800인지 확인'
FROM X
WHERE rn <= 5;

/* 10. 상위·하위 등급 극단값 */
;WITH X AS
(
    SELECT
        P.수험번호,
        MAX(P.전형명) AS 전형명,
        MAX(P.계열명) AS 계열명,
        MAX(P.모집단위명) AS 모집단위명,
        AVG(CONVERT(decimal(18,6),P.석차등급숫자)) AS 평균석차등급,
        ROW_NUMBER() OVER
        (
            ORDER BY AVG(CONVERT(decimal(18,6),P.석차등급숫자)),
                     P.수험번호
        ) AS high_rn,
        ROW_NUMBER() OVER
        (
            ORDER BY AVG(CONVERT(decimal(18,6),P.석차등급숫자)) DESC,
                     P.수험번호
        ) AS low_rn
    FROM #과목 AS P
    WHERE P.전형유형 IN (N'고교추천',N'재직자',N'논술',N'실기')
      AND P.석차등급숫자 BETWEEN 1 AND 9
    GROUP BY P.수험번호
)
INSERT INTO #후보
SELECT
    CASE WHEN high_rn <= 3 THEN 140 ELSE 150 END,
    CASE WHEN high_rn <= 3 THEN N'HIGH_SCORE_EXTREME' ELSE N'LOW_SCORE_EXTREME' END,
    CASE WHEN high_rn <= 3 THEN N'상위등급 극단값 후보' ELSE N'하위등급 극단값 후보' END,
    수험번호, 전형명, 계열명, 모집단위명,
    CONCAT(N'평균 석차등급 참고=',평균석차등급),
    NULL,
    CASE WHEN high_rn <= 3
         THEN N'1등급 환산과 최고점 근처 계산을 확인'
         ELSE N'8·9등급 환산과 0점 포함 계산을 확인'
    END
FROM X
WHERE high_rn <= 3 OR low_rn <= 3;

/* 11. 정량평가 대상 외 전형 */
;WITH X AS
(
    SELECT
        A.*,
        ROW_NUMBER() OVER
        (
            PARTITION BY A.전형명
            ORDER BY A.수험번호
        ) AS rn
    FROM #지원자 AS A
    WHERE A.전형유형 = N'대상외'
)
INSERT INTO #후보
SELECT TOP (10)
    160, N'UNSUPPORTED_ADMISSION', N'정량평가 대상 외 전형',
    수험번호, 전형명, 계열명, 모집단위명,
    N'지원정보만 표시',
    N'성적 계산 결과 없음',
    N'웹에서 정량평가 대상 아님 안내가 나오는지 확인'
FROM X
WHERE rn = 1
ORDER BY 전형명;

/* 결과 1: 후보 목록 */
SELECT
    우선순위,
    케이스코드,
    케이스명,
    수험번호,
    전형명,
    계열명,
    모집단위명,
    확인값1,
    확인값2,
    확인방법
FROM #후보
ORDER BY 우선순위, 수험번호;

/* 결과 2: 실행문 자동 생성 */
SELECT
    케이스코드,
    케이스명,
    수험번호,
    N'EXEC dbo.usp_SNUT_VerifyScore @수험번호 = N''' +
    REPLACE(수험번호, N'''', N'''''') +
    N''';' AS 실행SQL
FROM #후보
WHERE 수험번호 IS NOT NULL
ORDER BY 우선순위, 수험번호;

/* 결과 3: 웹과 SSMS 비교 체크리스트 */
SELECT N'반영과목수' AS 비교항목,
       N'웹 최종 카드' AS 웹확인위치,
       N'최종 결과의 최종반영과목수' AS SQL확인위치,
       N'완전 일치' AS 기대결과
UNION ALL
SELECT N'이수단위합', N'웹 최종 카드',
       N'최종 결과의 최종반영이수단위합', N'완전 일치'
UNION ALL
SELECT N'가중점수합', N'웹 중간 집계',
       N'중간 집계 또는 최종 결과의 가중점수합', N'완전 일치'
UNION ALL
SELECT N'교과점수원값', N'웹 최종 카드',
       N'최종 결과의 교과점수원값', N'소수점 전체 일치'
UNION ALL
SELECT N'최종교과점수', N'웹 최종 교과점수',
       N'최종 결과의 최종교과점수', N'소수점 둘째 자리 일치'
UNION ALL
SELECT N'과목별 반영 여부', N'웹 과목별 상세',
       N'과목별 상세의 최종반영여부', N'모든 과목 일치'
UNION ALL
SELECT N'진로선택 순위', N'웹 중간 집계',
       N'진로선택순위 및 최종반영여부', N'상위 3과목만 반영'
UNION ALL
SELECT N'지원자격', N'웹 지원자격 판정',
       N'최종 결과의 지원자격판정', N'문구와 판정 일치';
GO