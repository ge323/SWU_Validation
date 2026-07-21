-- 02_Create_vwApplyInfo.sql: 지원자의 전형·모집단위·학생부 동의 정보를 저장하는 지원자 테이블을 생성한다.

USE [SWU_Validation]
GO

SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[vwapplyinfo](
	[입학연도] [smallint] NOT NULL,
	[모집시기] [tinyint] NOT NULL,
	[모집시기명] [nvarchar](50) NULL,
	[수험번호] [nvarchar](50) NOT NULL,
	[군ID] [nvarchar](50) NULL,
	[계열] [tinyint] NULL,
	[계열명] [nvarchar](50) NULL,
	[전형코드] [nvarchar](50) NULL,
	[전형명] [nvarchar](50) NULL,
	[모집단위코드] [nvarchar](50) NULL,
	[모집단위명] [nvarchar](50) NULL,
	[학과부코드] [nvarchar](50) NULL,
	[졸엽연도] [date] NULL,
	[학생부동의코드] [nvarchar](50) NULL,
	[학생부동의] [nvarchar](50) NULL
) ON [PRIMARY]
GO
