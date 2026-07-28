USE [SNUT_Validation];
GO
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_Verify_EmployedGraduate
    @수험번호 nvarchar(50)
AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.vwApplyInfo WHERE 수험번호=@수험번호 AND 전형명 LIKE N'%특성화고%재직자%') THROW 50012,N'특성화고졸재직자전형 지원자를 찾을 수 없습니다.',1;
 DROP TABLE IF EXISTS #R;
 ;WITH B AS(
  SELECT A.전형코드,A.전형명,A.계열명,A.모집단위코드,A.모집단위명,S.*,
   TRY_CONVERT(int,NULLIF(LTRIM(RTRIM(S.석차등급)),N'')) 등급,
   UPPER(NULLIF(LTRIM(RTRIM(S.성취도)),N'')) 성취도정리
  FROM dbo.vwApplyInfo A JOIN dbo.HsbSubjectScore S ON A.수험번호=S.수험번호
  WHERE A.수험번호=@수험번호 AND A.전형명 LIKE N'%특성화고%재직자%' AND S.학년 IN(1,2)
 ), P AS(
  SELECT *,CASE WHEN 등급 BETWEEN 1 AND 9 THEN N'석차등급' WHEN 과목구분_02_진로교과=2 AND 성취도정리 IN(N'A',N'B',N'C') THEN N'진로선택' WHEN 성취도정리 IN(N'A',N'B',N'C',N'D',N'E') THEN N'전문교과' ELSE N'미반영' END 점수구분,
   CASE 등급 WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980 WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800 WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0 END 등급점수,
   CASE 성취도정리 WHEN N'A' THEN 1000 WHEN N'B' THEN 980 WHEN N'C' THEN 800 END 진로점수,
   CASE 성취도정리 WHEN N'A' THEN 1000 WHEN N'B' THEN 990 WHEN N'C' THEN 980 WHEN N'D' THEN 970 WHEN N'E' THEN 800 END 전문점수
  FROM B
 ), R AS(
  SELECT *,CASE WHEN 점수구분=N'진로선택' THEN ROW_NUMBER() OVER(PARTITION BY 수험번호,점수구분 ORDER BY 진로점수 DESC,이수단위 DESC,원점수 DESC,학년,학기,과목코드) END 진로순위
  FROM P
 )
 SELECT *,CASE WHEN 점수구분=N'석차등급' THEN 등급점수 WHEN 점수구분=N'전문교과' THEN 전문점수 WHEN 점수구분=N'진로선택' AND 진로순위<=3 THEN 진로점수 END 과목반영점수,
   CASE WHEN 점수구분 IN(N'석차등급',N'전문교과') THEN N'최종반영' WHEN 점수구분=N'진로선택' AND 진로순위<=3 THEN N'최종반영' WHEN 점수구분=N'진로선택' THEN N'상위 3과목 제외' ELSE N'미반영' END 최종반영여부
 INTO #R FROM R;
 SELECT N'특성화고졸재직자전형' 결과유형,MAX(수험번호) 수험번호,MAX(전형코드) 전형코드,MAX(전형명) 전형명,MAX(계열명) 계열명,MAX(모집단위코드) 모집단위코드,MAX(모집단위명) 모집단위명,
  CAST(NULL AS int) 반영교과학기수,CAST(NULL AS decimal(18,4)) 자격판정이수단위합,N'지원자격 서류 별도 확인' 지원자격판정,
  SUM(CASE WHEN 최종반영여부=N'최종반영' THEN 1 ELSE 0 END) 최종반영과목수,
  SUM(CASE WHEN 최종반영여부=N'최종반영' THEN CONVERT(decimal(18,4),이수단위) ELSE 0 END) 최종반영이수단위합,
  CAST(SUM(CASE WHEN 최종반영여부=N'최종반영' THEN CONVERT(decimal(18,4),과목반영점수)*CONVERT(decimal(18,4),이수단위) ELSE 0 END)/NULLIF(SUM(CASE WHEN 최종반영여부=N'최종반영' THEN CONVERT(decimal(18,4),이수단위) ELSE 0 END),0) AS decimal(18,6)) 교과점수원값,
  CAST(ROUND(SUM(CASE WHEN 최종반영여부=N'최종반영' THEN CONVERT(decimal(18,4),과목반영점수)*CONVERT(decimal(18,4),이수단위) ELSE 0 END)/NULLIF(SUM(CASE WHEN 최종반영여부=N'최종반영' THEN CONVERT(decimal(18,4),이수단위) ELSE 0 END),0),2) AS decimal(18,2)) 최종교과점수,
  CAST(NULL AS decimal(18,2)) 비교내신점수,N'정상산출' 산출방식
 FROM #R;
 SELECT 수험번호,학년,학기,편제명,교과명,과목명,이수단위,석차등급,성취도,점수구분,과목반영점수,진로순위,최종반영여부 FROM #R ORDER BY 학년,학기,과목명;
END;
GO
