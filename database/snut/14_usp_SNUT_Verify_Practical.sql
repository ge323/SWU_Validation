USE [SNUT_Validation];
GO
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_Verify_Practical
 @수험번호 nvarchar(50), @실기점수 decimal(18,4)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 IF NOT EXISTS(SELECT 1 FROM dbo.vwApplyInfo WHERE 수험번호=@수험번호 AND 전형명=N'실기전형') THROW 50014,N'실기전형 지원자를 찾을 수 없습니다.',1;
 DROP TABLE IF EXISTS #R;
 SELECT A.전형코드,A.전형명,A.계열명,A.모집단위코드,A.모집단위명,S.*,
  CASE TRY_CONVERT(int,NULLIF(LTRIM(RTRIM(S.석차등급)),N'')) WHEN 1 THEN 1000 WHEN 2 THEN 990 WHEN 3 THEN 980 WHEN 4 THEN 970 WHEN 5 THEN 960 WHEN 6 THEN 800 WHEN 7 THEN 500 WHEN 8 THEN 250 WHEN 9 THEN 0 END 과목반영점수
 INTO #R
 FROM dbo.vwApplyInfo A JOIN dbo.HsbSubjectScore S ON A.수험번호=S.수험번호
 WHERE A.수험번호=@수험번호 AND A.전형명=N'실기전형'
  AND (S.학년 IN(1,2) OR(S.학년=3 AND S.학기=1))
  AND S.편제명 IN(N'국어',N'영어',N'사회',N'사회 계열',N'사회(역사/도덕포함)',N'사회에관한교과',N'한국사');
 DECLARE @교과 decimal(18,6)=(SELECT SUM(CONVERT(decimal(18,4),과목반영점수)*CONVERT(decimal(18,4),이수단위))/NULLIF(SUM(CONVERT(decimal(18,4),이수단위)),0) FROM #R WHERE 과목반영점수 IS NOT NULL AND ISNULL(이수단위,0)>0);
 SELECT N'실기전형' 결과유형,MAX(수험번호) 수험번호,MAX(전형코드) 전형코드,MAX(전형명) 전형명,MAX(계열명) 계열명,MAX(모집단위코드) 모집단위코드,MAX(모집단위명) 모집단위명,
  CAST(NULL AS int) 반영교과학기수,CAST(NULL AS decimal(18,4)) 자격판정이수단위합,N'해당 없음' 지원자격판정,COUNT(*) 최종반영과목수,SUM(CONVERT(decimal(18,4),이수단위)) 최종반영이수단위합,
  @교과 교과점수원값,CAST(ROUND(@교과,2) AS decimal(18,2)) 최종교과점수,CAST(NULL AS decimal(18,2)) 비교내신점수,N'정상산출' 산출방식,@실기점수 실기점수
 FROM #R;
 SELECT 수험번호,학년,학기,편제명,교과명,과목명,이수단위,석차등급,과목반영점수,N'최종반영' 최종반영여부 FROM #R ORDER BY 학년,학기,과목명;
END;
GO
