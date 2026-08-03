import { NextResponse } from "next/server";
import sql from "mssql/msnodesqlv8";
import { getDbPool } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const examNo = searchParams.get("examNo")?.trim();

  if (!examNo) {
    return NextResponse.json(
      { message: "수험번호를 입력해주세요." },
      { status: 400 }
    );
  }

  try {
    const pool = await getDbPool();

    const result = await pool
      .request()
      .input("수험번호", sql.NVarChar(50), examNo)
      .query(`
        EXEC [SWU_Validation].[dbo].[usp_VerifyScore]
          @수험번호 = @수험번호
      `);

    const recordsets = Array.isArray(result.recordsets)
      ? result.recordsets
      : [];

    return NextResponse.json({
      message: "성적 검증이 완료되었습니다.",
      examNo,
      data: {
        application: recordsets[0]?.[0] ?? null,
        subjects: recordsets[1] ?? [],
        semesters: recordsets[2] ?? [],
        rankings: recordsets[3] ?? [],
        finalScore: recordsets[4]?.[0] ?? null,
      },
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        message: "성적 검증 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}