-- 03_Create_HsbSubjectScore.sql: 지원자의 학년·학기별 학생부 과목 성적 원천 데이터를 저장하는 테이블을 생성한다.

USE [SWU_Validation]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[HsbSubjectScore](
	[입학연도] [smallint] NOT NULL,
	[모집시기] [tinyint] NOT NULL,
	[수험번호] [nvarchar](50) NOT NULL,
	[학년] [tinyint] NOT NULL,
	[학기] [tinyint] NOT NULL,
	[편제코드] [nvarchar](50) NULL,
	[편제명] [nvarchar](50) NULL,
	[과목코드] [nvarchar](50) NULL,
	[과목명] [nvarchar](50) NULL,
	[이수단위] [decimal](18, 10) NULL,
	[석차] [nvarchar](50) NULL,
	[재적수] [int] NULL,
	[동석차] [nvarchar](50) NULL,
	[원점수] [decimal](18, 10) NULL,
	[평균] [decimal](18, 10) NULL,
	[표준편차] [decimal](18, 10) NULL,
	[석차등급] [nvarchar](50) NULL,
	[성취도] [nvarchar](50) NULL
) ON [PRIMARY]
GO


