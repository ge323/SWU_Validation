USE [SWU_Validation];
GO

/* ===========================================================
   파일명: 18_Verify_Score_Subquery.sql

   목적:
   특정 수험번호를 직접 입력하여
   학생부 성적 계산 과정 중 필요한 부분만 조회·검증한다.

   검증 방법:
   - 수험번호 하드코딩
   - CTE 및 프로시저 사용하지 않음
   - 스칼라 서브쿼리와 FROM절 서브쿼리 사용
   - 필요한 결과만 개별적으로 실행 가능
   =========================================================== */


DECLARE @수험번호 nvarchar(50) = N'01510001';


/* ===========================================================
   1. 지원자 기본정보 확인
   =========================================================== */

SELECT
    A.입학연도,
    A.모집시기,
    A.수험번호

FROM dbo.vwApplyInfo AS A

WHERE A.수험번호 = @수험번호;
GO


/* ===========================================================
   2. 과목별 적용등급 및 가중값 확인

   과목별 등급가중값
   = 적용등급 × 이수단위값
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    S.입학연도,
    S.모집시기,
    S.수험번호,

    S.학년,
    S.학기,

    S.편제명,
    S.교과명,
    S.과목명,

    S.이수단위값 AS 이수단위,
    S.석차등급,
    S.Z점수,
    S.적용등급,

    CAST
    (
        S.적용등급 * S.이수단위값
        AS decimal(18,6)
    ) AS 계산된_과목별등급가중값,

    S.등급산출방법,
    S.반영여부

FROM dbo.vw_SubjectGrade AS S

WHERE S.수험번호 = @수험번호

ORDER BY
    S.학년,
    S.학기,
    S.과목명;
GO


/* ===========================================================
   3. 특정 학기의 과목만 확인

   아래 학년, 학기 값을 변경하여
   확인하려는 학기만 조회한다.
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';
DECLARE @학년 int = 1;
DECLARE @학기 int = 1;

SELECT
    S.수험번호,
    S.학년,
    S.학기,

    S.편제명,
    S.교과명,
    S.과목명,

    S.이수단위값,
    S.적용등급,

    CAST
    (
        S.적용등급 * S.이수단위값
        AS decimal(18,6)
    ) AS 계산된_등급가중값

FROM dbo.vw_SubjectGrade AS S

WHERE S.수험번호 = @수험번호
  AND S.학년 = @학년
  AND S.학기 = @학기
  AND S.적용등급 IS NOT NULL
  AND S.이수단위값 > 0

ORDER BY
    S.과목명;
GO


/* ===========================================================
   4. 학기별 총이수단위 검증

   vw_RankedSemester의 총이수단위와
   과목별 이수단위 합계를 비교한다.

   SELECT절 안의 SELECT가 스칼라 서브쿼리이다.
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    R.입학연도,
    R.모집시기,
    R.수험번호,

    R.학년,
    R.학기,

    R.총이수단위 AS 저장된_총이수단위,

    CAST
    (
        (
            SELECT
                SUM(S.이수단위값)

            FROM dbo.vw_SubjectGrade AS S

            WHERE S.입학연도 = R.입학연도
              AND S.모집시기 = R.모집시기
              AND S.수험번호 = R.수험번호
              AND S.학년 = R.학년
              AND S.학기 = R.학기
              AND S.적용등급 IS NOT NULL
              AND S.이수단위값 > 0
        )
        AS decimal(18,6)
    ) AS 재계산_총이수단위,

    CASE
        WHEN ABS
        (
            ISNULL(R.총이수단위, 0)
            -
            ISNULL
            (
                (
                    SELECT
                        SUM(S.이수단위값)

                    FROM dbo.vw_SubjectGrade AS S

                    WHERE S.입학연도 = R.입학연도
                      AND S.모집시기 = R.모집시기
                      AND S.수험번호 = R.수험번호
                      AND S.학년 = R.학년
                      AND S.학기 = R.학기
                      AND S.적용등급 IS NOT NULL
                      AND S.이수단위값 > 0
                ),
                0
            )
        ) < 0.000001
            THEN N'일치'

        ELSE N'불일치'
    END AS 총이수단위검증

FROM dbo.vw_RankedSemester AS R

WHERE R.수험번호 = @수험번호

ORDER BY
    R.학년,
    R.학기;
GO


/* ===========================================================
   5. 학기별 등급가중합 검증

   등급가중합
   = SUM(적용등급 × 이수단위값)
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    R.입학연도,
    R.모집시기,
    R.수험번호,

    R.학년,
    R.학기,

    R.등급가중합 AS 저장된_등급가중합,

    CAST
    (
        (
            SELECT
                SUM(S.적용등급 * S.이수단위값)

            FROM dbo.vw_SubjectGrade AS S

            WHERE S.입학연도 = R.입학연도
              AND S.모집시기 = R.모집시기
              AND S.수험번호 = R.수험번호
              AND S.학년 = R.학년
              AND S.학기 = R.학기
              AND S.적용등급 IS NOT NULL
              AND S.이수단위값 > 0
        )
        AS decimal(18,6)
    ) AS 재계산_등급가중합,

    CASE
        WHEN ABS
        (
            ISNULL(R.등급가중합, 0)
            -
            ISNULL
            (
                (
                    SELECT
                        SUM(S.적용등급 * S.이수단위값)

                    FROM dbo.vw_SubjectGrade AS S

                    WHERE S.입학연도 = R.입학연도
                      AND S.모집시기 = R.모집시기
                      AND S.수험번호 = R.수험번호
                      AND S.학년 = R.학년
                      AND S.학기 = R.학기
                      AND S.적용등급 IS NOT NULL
                      AND S.이수단위값 > 0
                ),
                0
            )
        ) < 0.000001
            THEN N'일치'

        ELSE N'불일치'
    END AS 등급가중합검증

FROM dbo.vw_RankedSemester AS R

WHERE R.수험번호 = @수험번호

ORDER BY
    R.학년,
    R.학기;
GO


/* ===========================================================
   6. 학기평균등급 검증

   학기평균등급
   = 과목별 등급가중합 ÷ 과목별 이수단위 합계

   모든 계산을 원본 과목 데이터에서 다시 수행한다.
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    R.입학연도,
    R.모집시기,
    R.수험번호,

    R.학년,
    R.학기,

    R.학기평균등급 AS 저장된_학기평균등급,

    CAST
    (
        (
            SELECT
                SUM(S.적용등급 * S.이수단위값)

            FROM dbo.vw_SubjectGrade AS S

            WHERE S.입학연도 = R.입학연도
              AND S.모집시기 = R.모집시기
              AND S.수험번호 = R.수험번호
              AND S.학년 = R.학년
              AND S.학기 = R.학기
              AND S.적용등급 IS NOT NULL
              AND S.이수단위값 > 0
        )
        /
        NULLIF
        (
            (
                SELECT
                    SUM(S.이수단위값)

                FROM dbo.vw_SubjectGrade AS S

                WHERE S.입학연도 = R.입학연도
                  AND S.모집시기 = R.모집시기
                  AND S.수험번호 = R.수험번호
                  AND S.학년 = R.학년
                  AND S.학기 = R.학기
                  AND S.적용등급 IS NOT NULL
                  AND S.이수단위값 > 0
            ),
            0
        )
        AS decimal(18,6)
    ) AS 재계산_학기평균등급,

    CASE
        WHEN ABS
        (
            R.학기평균등급
            -
            (
                (
                    SELECT
                        SUM(S.적용등급 * S.이수단위값)

                    FROM dbo.vw_SubjectGrade AS S

                    WHERE S.입학연도 = R.입학연도
                      AND S.모집시기 = R.모집시기
                      AND S.수험번호 = R.수험번호
                      AND S.학년 = R.학년
                      AND S.학기 = R.학기
                      AND S.적용등급 IS NOT NULL
                      AND S.이수단위값 > 0
                )
                /
                NULLIF
                (
                    (
                        SELECT
                            SUM(S.이수단위값)

                        FROM dbo.vw_SubjectGrade AS S

                        WHERE S.입학연도 = R.입학연도
                          AND S.모집시기 = R.모집시기
                          AND S.수험번호 = R.수험번호
                          AND S.학년 = R.학년
                          AND S.학기 = R.학기
                          AND S.적용등급 IS NOT NULL
                          AND S.이수단위값 > 0
                    ),
                    0
                )
            )
        ) < 0.000001
            THEN N'일치'

        ELSE N'불일치'
    END AS 학기평균검증

FROM dbo.vw_RankedSemester AS R

WHERE R.수험번호 = @수험번호

ORDER BY
    R.학년,
    R.학기;
GO


/* ===========================================================
   7. 우수학기 2개 직접 조회

   FROM절 안의 SELECT가 서브쿼리이다.
   이 형태를 파생 테이블이라고도 한다.
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    A.입학연도,
    A.모집시기,
    A.수험번호,

    A.학년,
    A.학기,
    A.최종학기등급,

    A.계산된_우수학기순위

FROM
(
    SELECT
        C.입학연도,
        C.모집시기,
        C.수험번호,

        C.학년,
        C.학기,
        C.최종학기등급,

        ROW_NUMBER() OVER
        (
            PARTITION BY
                C.입학연도,
                C.모집시기,
                C.수험번호

            ORDER BY
                C.최종학기등급 ASC,
                C.학년 ASC,
                C.학기 ASC
        ) AS 계산된_우수학기순위

    FROM dbo.vw_CompletedSemesterGrade AS C

    WHERE C.수험번호 = @수험번호
) AS A

WHERE A.계산된_우수학기순위 <= 2

ORDER BY
    A.계산된_우수학기순위;
GO


/* ===========================================================
   8. 저장된 우수학기 순위와 재계산 순위 비교
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    R.입학연도,
    R.모집시기,
    R.수험번호,

    R.학년,
    R.학기,
    R.최종학기등급,

    R.우수학기순위 AS 저장된_우수학기순위,
    A.계산된_우수학기순위,

    CASE
        WHEN R.우수학기순위 = A.계산된_우수학기순위
            THEN N'일치'

        ELSE N'불일치'
    END AS 우수학기순위검증

FROM dbo.vw_RankedSemester AS R

INNER JOIN
(
    SELECT
        C.입학연도,
        C.모집시기,
        C.수험번호,

        C.학년,
        C.학기,

        ROW_NUMBER() OVER
        (
            PARTITION BY
                C.입학연도,
                C.모집시기,
                C.수험번호

            ORDER BY
                C.최종학기등급 ASC,
                C.학년 ASC,
                C.학기 ASC
        ) AS 계산된_우수학기순위

    FROM dbo.vw_CompletedSemesterGrade AS C

    WHERE C.수험번호 = @수험번호
) AS A
    ON R.입학연도 = A.입학연도
   AND R.모집시기 = A.모집시기
   AND R.수험번호 = A.수험번호
   AND R.학년 = A.학년
   AND R.학기 = A.학기

WHERE R.수험번호 = @수험번호

ORDER BY
    A.계산된_우수학기순위;
GO


/* ===========================================================
   9. 우수 2개 학기 평균 재계산

   우수2개학기 평균등급
   = 우수학기 2개의 최종학기등급 평균
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    F.입학연도,
    F.모집시기,
    F.수험번호,

    F.우수2개학기_평균등급 AS 저장된_우수2개학기_평균등급,

    CAST
    (
        (
            SELECT
                AVG(CAST(A.최종학기등급 AS decimal(18,6)))

            FROM
            (
                SELECT TOP (2)
                    C.최종학기등급

                FROM dbo.vw_CompletedSemesterGrade AS C

                WHERE C.입학연도 = F.입학연도
                  AND C.모집시기 = F.모집시기
                  AND C.수험번호 = F.수험번호

                ORDER BY
                    C.최종학기등급 ASC,
                    C.학년 ASC,
                    C.학기 ASC
            ) AS A
        )
        AS decimal(18,6)
    ) AS 재계산_우수2개학기_평균등급

FROM dbo.vw_FinalScore AS F

WHERE F.수험번호 = @수험번호;
GO


/* ===========================================================
   10. 최종 학생부점수 재계산

   학생부점수
   = 920 + 10 × (9 - 우수2개학기 평균등급)
   =========================================================== */

DECLARE @수험번호 nvarchar(50) = N'01510001';

SELECT
    F.입학연도,
    F.모집시기,
    F.수험번호,

    F.우수2개학기_평균등급,
    F.학생부점수_1000점 AS 저장된_학생부점수,

    CAST
    (
        920
        + 10
        *
        (
            9
            -
            (
                SELECT
                    AVG(CAST(A.최종학기등급 AS decimal(18,6)))

                FROM
                (
                    SELECT TOP (2)
                        C.최종학기등급

                    FROM dbo.vw_CompletedSemesterGrade AS C

                    WHERE C.입학연도 = F.입학연도
                      AND C.모집시기 = F.모집시기
                      AND C.수험번호 = F.수험번호

                    ORDER BY
                        C.최종학기등급 ASC,
                        C.학년 ASC,
                        C.학기 ASC
                ) AS A
            )
        )
        AS decimal(18,6)
    ) AS 재계산_학생부점수,

    CASE
        WHEN ABS
        (
            F.학생부점수_1000점
            -
            (
                920
                + 10
                *
                (
                    9
                    -
                    (
                        SELECT
                            AVG
                            (
                                CAST
                                (
                                    A.최종학기등급
                                    AS decimal(18,6)
                                )
                            )

                        FROM
                        (
                            SELECT TOP (2)
                                C.최종학기등급

                            FROM dbo.vw_CompletedSemesterGrade AS C

                            WHERE C.입학연도 = F.입학연도
                              AND C.모집시기 = F.모집시기
                              AND C.수험번호 = F.수험번호

                            ORDER BY
                                C.최종학기등급 ASC,
                                C.학년 ASC,
                                C.학기 ASC
                        ) AS A
                    )
                )
            )
        ) < 0.000001
            THEN N'일치'

        ELSE N'불일치'
    END AS 최종점수검증

FROM dbo.vw_FinalScore AS F

WHERE F.수험번호 = @수험번호;
GO