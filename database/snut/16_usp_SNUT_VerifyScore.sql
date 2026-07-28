USE [SNUT_Validation];
GO
CREATE OR ALTER PROCEDURE dbo.usp_SNUT_VerifyScore
 @수험번호 nvarchar(50),
 @논술점수 decimal(18,4)=NULL,
 @실기점수 decimal(18,4)=NULL,
 @비교내신사용 bit=0,
 @논술석차백분율 decimal(9,4)=NULL
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @전형명 nvarchar(200)=(SELECT TOP(1) 전형명 FROM dbo.vwApplyInfo WHERE 수험번호=@수험번호);
 IF @전형명 IS NULL THROW 50016,N'지원자 정보를 찾을 수 없습니다.',1;
 IF @비교내신사용=1
 BEGIN
  EXEC dbo.usp_SNUT_Verify_ComparativeRecord @수험번호,@비교유형=CASE WHEN @전형명 LIKE N'%특성화고%재직자%' THEN N'재직자' WHEN @전형명=N'실기전형' THEN N'실기' WHEN @전형명=N'논술전형' THEN N'논술' END,@논술석차백분율=@논술석차백분율;
  RETURN;
 END;
 IF @전형명=N'고교추천전형' EXEC dbo.usp_SNUT_Verify_HighSchoolRecommendation @수험번호;
 ELSE IF @전형명 LIKE N'%특성화고%재직자%' EXEC dbo.usp_SNUT_Verify_EmployedGraduate @수험번호;
 ELSE IF @전형명=N'논술전형' EXEC dbo.usp_SNUT_Verify_Essay @수험번호,@논술점수;
 ELSE IF @전형명=N'실기전형' EXEC dbo.usp_SNUT_Verify_Practical @수험번호,@실기점수;
 ELSE THROW 50017,N'현재 성적검증 대상이 아닌 전형입니다.',1;
END;
GO
