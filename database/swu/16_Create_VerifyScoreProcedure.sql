USE [SWU_Validation];
GO

CREATE OR ALTER PROCEDURE dbo.usp_VerifyScore
    @수험번호 nvarchar(50)
AS
BEGIN
    SET NOCOUNT ON;

    /* ===========================================================
       파일명: 16_Create_VerifyScoreProcedure.sql

       목적:
       특정 수험번호의 학생부 계산 과정 전체를 자동 검증한다.

       검증 단계
       1. 지원정보 확인
       2. 과목별 계산값 확인
       3. 학기별 합계 검증
       4. 학기평균 검증
       5. 우수학기 선정 검증
       6. 우수학기 평균 검증
       7. 최종 학생부 점수 검증

       추가 표시 정보
       - 학생부 반영비율
       - 학생부 점수범위
       - 적용 계산식

       주의:
       아래 반영비율 정보는 지원정보 화면에 표시하기 위한 값이다.
       최종 점수 재계산 공식은 기존 1000점 기준 공식을 유지한다.
       =========================================================== */

    IF NOT EXISTS
    (
        SELECT 1
        FROM dbo.HsbSubjectScore
        WHERE 수험번호 = @수험번호
    )
    BEGIN
        THROW 50001,
              N'입력한 수험번호의 학생부 성적 데이터가 없습니다.',
              1;
    END;

    /* ===========================================================
       결과 1: 지원정보
       =========================================================== */

    SELECT TOP (1)
        A.입학연도,
        A.모집시기,
        A.모집시기명,
        A.수험번호,
        A.전형코드,
        A.전형명,
        A.모집단위코드,
        A.모집단위명,

        CASE
            WHEN A.모집단위명 LIKE N'연기예술과%'
              OR A.모집단위명 LIKE N'실용음악과%'
                THEN 20
            ELSE 100
        END AS 학생부반영비율,

        CASE
            WHEN A.모집단위명 LIKE N'연기예술과%'
              OR A.모집단위명 LIKE N'실용음악과%'
                THEN N'120 ~ 200점'
            ELSE N'920 ~ 1000점'
        END AS 학생부점수범위,

        CASE
            WHEN A.모집단위명 LIKE N'연기예술과%'
              OR A.모집단위명 LIKE N'실용음악과%'
                THEN N'학생부 20% 반영'
            ELSE N'학생부 100% 반영'
        END AS 적용계산식

    FROM dbo.vwApplyInfo AS A
    WHERE A.수험번호 = @수험번호;

    /* ===========================================================
       결과 2: 과목별 계산값 확인
       =========================================================== */

    SELECT
        S.입학연도,
        S.모집시기,
        S.수험번호,
        S.학년,
        S.학기,
        S.교과명,
        S.과목명,
        S.이수단위값 AS 이수단위,
        S.석차등급,
        S.Z점수,
        S.적용등급,

        CAST
        (
            CASE
                WHEN S.적용등급 IS NOT NULL
                 AND S.이수단위값 > 0
                    THEN S.적용등급 * S.이수단위값
                ELSE NULL
            END
            AS decimal(18,6)
        ) AS 계산된_과목별등급가중값,

        S.등급산출방법,
        S.반영여부

    FROM dbo.vw_SubjectGrade AS S
    WHERE S.수험번호 = @수험번호
    ORDER BY S.학년, S.학기, S.과목명;

    /* ===========================================================
       결과 3: 학기별 집계 검증
       =========================================================== */

    ;WITH SubjectSummary AS
    (
        SELECT
            입학연도,
            모집시기,
            수험번호,
            학년,
            학기,

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
            ) AS 과목합계_이수단위,

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
            ) AS 과목합계_등급가중값

        FROM dbo.vw_SubjectGrade
        WHERE 수험번호 = @수험번호
        GROUP BY 입학연도, 모집시기, 수험번호, 학년, 학기
    )

    SELECT
        R.입학연도,
        R.모집시기,
        R.수험번호,
        R.학년,
        R.학기,
        R.반영과목수,
        R.제외과목수,
        S.과목합계_이수단위,
        R.총이수단위,
        S.과목합계_등급가중값,
        R.등급가중합,
        R.학기평균등급,

        CAST
        (
            R.등급가중합 / NULLIF(R.총이수단위, 0)
            AS decimal(18,6)
        ) AS 재계산_학기평균등급,

        CASE
            WHEN ABS(ISNULL(S.과목합계_이수단위, 0) - ISNULL(R.총이수단위, 0)) < 0.000001
                THEN N'일치'
            ELSE N'불일치'
        END AS 이수단위검증,

        CASE
            WHEN ABS(ISNULL(S.과목합계_등급가중값, 0) - ISNULL(R.등급가중합, 0)) < 0.000001
                THEN N'일치'
            ELSE N'불일치'
        END AS 등급가중합검증,

        CASE
            WHEN R.총이수단위 IS NULL OR R.총이수단위 = 0
                THEN N'검증 제외'
            WHEN ABS
            (
                R.학기평균등급
                - (R.등급가중합 / NULLIF(R.총이수단위, 0))
            ) < 0.000001
                THEN N'일치'
            ELSE N'불일치'
        END AS 학기평균검증

    FROM dbo.vw_RankedSemester AS R
    LEFT JOIN SubjectSummary AS S
        ON R.입학연도 = S.입학연도
       AND R.모집시기 = S.모집시기
       AND R.수험번호 = S.수험번호
       AND R.학년 = S.학년
       AND R.학기 = S.학기
    WHERE R.수험번호 = @수험번호
    ORDER BY R.학년, R.학기;

    /* ===========================================================
       결과 4: 우수학기 선정 검증
       =========================================================== */

    ;WITH ExpectedRanking AS
    (
        SELECT
            입학연도,
            모집시기,
            수험번호,
            학년,
            학기,
            최종학기등급,

            ROW_NUMBER() OVER
            (
                PARTITION BY 입학연도, 모집시기, 수험번호
                ORDER BY 최종학기등급 ASC, 학년 ASC, 학기 ASC
            ) AS 기대순위

        FROM dbo.vw_CompletedSemesterGrade
        WHERE 수험번호 = @수험번호
    )

    SELECT
        R.입학연도,
        R.모집시기,
        R.수험번호,
        R.학년,
        R.학기,
        R.최종학기등급,
        R.우수학기순위,
        E.기대순위,

        CASE
            WHEN R.우수학기순위 = E.기대순위
                THEN N'일치'
            ELSE N'불일치'
        END AS 우수학기순위검증,

        CASE
            WHEN R.우수학기순위 = 1 THEN N'우수학기 1'
            WHEN R.우수학기순위 = 2 THEN N'우수학기 2'
            ELSE N'미반영'
        END AS 우수학기여부

    FROM dbo.vw_RankedSemester AS R
    INNER JOIN ExpectedRanking AS E
        ON R.입학연도 = E.입학연도
       AND R.모집시기 = E.모집시기
       AND R.수험번호 = E.수험번호
       AND R.학년 = E.학년
       AND R.학기 = E.학기
    WHERE R.수험번호 = @수험번호
    ORDER BY R.우수학기순위;

    /* ===========================================================
       결과 5: 최종 점수 검증

       현재 결과 5는 기존 1000점 기준 검증 공식을 유지한다.
       =========================================================== */

    SELECT
        F.입학연도,
        F.모집시기,
        F.수험번호,
        F.우수학기1_학년,
        F.우수학기1_학기,
        F.우수학기1_등급,
        F.우수학기2_학년,
        F.우수학기2_학기,
        F.우수학기2_등급,
        F.우수2개학기_평균등급,

        CAST
        (
            (F.우수학기1_등급 + F.우수학기2_등급) / 2.0
            AS decimal(18,6)
        ) AS 재계산_우수2개학기_평균등급,

        F.학생부점수_1000점,

        CAST
        (
            920 + 10 * (9 - F.우수2개학기_평균등급)
            AS decimal(18,6)
        ) AS 재계산_학생부점수_1000점,

        CAST(F.학생부점수_1000점 AS decimal(18,10)) AS 저장값_상세,

        CAST
        (
            920 + 10 * (9 - F.우수2개학기_평균등급)
            AS decimal(18,10)
        ) AS 재계산값_상세,

        CAST
        (
            ABS
            (
                F.학생부점수_1000점
                - (920 + 10 * (9 - F.우수2개학기_평균등급))
            )
            AS decimal(18,10)
        ) AS 최종점수차이_상세,

        CASE
            WHEN ABS
            (
                F.우수2개학기_평균등급
                - ((F.우수학기1_등급 + F.우수학기2_등급) / 2.0)
            ) < 0.000001
                THEN N'일치'
            ELSE N'불일치'
        END AS 우수학기평균검증,

        CASE
            WHEN F.학생부점수_1000점 IS NULL
              OR F.우수2개학기_평균등급 IS NULL
                THEN N'검증 제외'
            WHEN ABS
            (
                F.학생부점수_1000점
                - (920 + 10 * (9 - F.우수2개학기_평균등급))
            ) < 0.000001
                THEN N'일치'
            ELSE N'불일치'
        END AS 최종점수검증

    FROM dbo.vw_FinalScore AS F
    WHERE F.수험번호 = @수험번호;

END;
GO