USE [SNUT_Validation];
GO
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_Verify_ComparativeRecord
 @수험번호 nvarchar(50),
 @비교유형 nvarchar(20), -- 재직자 / 실기 / 논술
 @논술석차백분율 decimal(9,4)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 IF @비교유형 NOT IN(N'재직자',N'실기',N'논술') THROW 50015,N'비교유형은 재직자, 실기, 논술 중 하나여야 합니다.',1;
 IF @비교유형=N'논술'
 BEGIN
  DECLARE @점수 decimal(18,2)=CASE WHEN @논술석차백분율 BETWEEN 0 AND 4 THEN 300 WHEN @논술석차백분율<=11 THEN 295 WHEN @논술석차백분율<=23 THEN 290 WHEN @논술석차백분율<=40 THEN 280 WHEN @논술석차백분율<=60 THEN 270 WHEN @논술석차백분율<=77 THEN 260 WHEN @논술석차백분율<=89 THEN 220 WHEN @논술석차백분율<=96 THEN 170 WHEN @논술석차백분율<=100 THEN 0 END;
  SELECT N'비교내신' 결과유형,@수험번호 수험번호,NULL 전형코드,N'논술전형' 전형명,NULL 계열명,NULL 모집단위코드,NULL 모집단위명,NULL 반영교과학기수,NULL 자격판정이수단위합,N'해당 없음' 지원자격판정,0 최종반영과목수,NULL 최종반영이수단위합,NULL 교과점수원값,@점수 최종교과점수,@점수 비교내신점수,N'논술 석차백분율 비교평가' 산출방식;
  RETURN;
 END;
 DROP TABLE IF EXISTS #C;
 ;WITH X AS(
  SELECT S.*,CASE WHEN ISNULL(S.재적수,0)>0 AND S.석차 IS NOT NULL THEN CONVERT(decimal(9,4),S.석차)*100.0/S.재적수 END 석차백분율
  FROM dbo.HsbSubjectScore S WHERE S.수험번호=@수험번호
 ), Y AS(
  SELECT *,CASE WHEN 석차백분율 BETWEEN 0 AND 4 THEN 1000 WHEN 석차백분율<=11 THEN 990 WHEN 석차백분율<=23 THEN 980 WHEN 석차백분율<=40 THEN 970 WHEN 석차백분율<=60 THEN 960 WHEN 석차백분율<=77 THEN 800 WHEN 석차백분율<=89 THEN 500 WHEN 석차백분율<=96 THEN 250 WHEN 석차백분율<=100 THEN 0 END 비교점수
  FROM X
 ) SELECT * INTO #C FROM Y WHERE 비교점수 IS NOT NULL AND ISNULL(이수단위,0)>0;
 DECLARE @최종 decimal(18,2)=(SELECT CAST(ROUND(SUM(CONVERT(decimal(18,4),비교점수)*CONVERT(decimal(18,4),이수단위))/NULLIF(SUM(CONVERT(decimal(18,4),이수단위)),0),2) AS decimal(18,2)) FROM #C);
 SELECT N'비교내신' 결과유형,@수험번호 수험번호,MAX(A.전형코드) 전형코드,MAX(A.전형명) 전형명,MAX(A.계열명) 계열명,MAX(A.모집단위코드) 모집단위코드,MAX(A.모집단위명) 모집단위명,NULL 반영교과학기수,NULL 자격판정이수단위합,N'지원자격 별도 확인' 지원자격판정,COUNT(*) 최종반영과목수,SUM(CONVERT(decimal(18,4),C.이수단위)) 최종반영이수단위합,NULL 교과점수원값,@최종 최종교과점수,@최종 비교내신점수,N'과목 석차백분율 비교평가' 산출방식
 FROM #C C LEFT JOIN dbo.vwApplyInfo A ON A.수험번호=@수험번호;
 SELECT 수험번호,학년,학기,편제명,교과명,과목명,이수단위,석차,재적수,석차백분율,비교점수 과목반영점수,N'최종반영' 최종반영여부 FROM #C ORDER BY 학년,학기,과목명;
END;
GO
