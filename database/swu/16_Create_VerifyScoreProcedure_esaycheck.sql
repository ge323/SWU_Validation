SELECT
    수험번호,
    학년,
    학기,
    교과명,
    과목명,
    편제명
FROM dbo.HsbSubjectScore
WHERE 수험번호 = N'01510001'
ORDER BY 학년, 학기, 과목명;