-- 01_Create_CodeFormation.sql: 편제 및 과목 코드 정보를 저장하는 기준 테이블을 생성한다.

USE [SWU_Validation]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[CodeFormation](
	[입학연도] [smallint] NOT NULL,
	[모집시기] [tinyint] NOT NULL,
	[편제코드] [nvarchar](50) NULL,
	[편제명] [nvarchar](50) NULL,
	[과목코드] [nvarchar](50) NULL,
	[과목명] [nvarchar](50) NULL,
	[과목구분코드] [nvarchar](1) NULL,
	[과목구분] [nvarchar](1) NULL
) ON [PRIMARY]
GO


