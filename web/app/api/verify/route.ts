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
      .execute("dbo.usp_VerifyScore");

    const recordsets = Array.isArray(result.recordsets)
    ? result.recordsets
    : [];

    const applicationResults = recordsets[0] ?? [];
    const subjectResults = recordsets[1] ?? [];
    const semesterResults = recordsets[2] ?? [];
    const rankingResults = recordsets[3] ?? [];
    const finalScoreResults = recordsets[4] ?? [];

    return NextResponse.json({
        message: "성적 검증이 완료되었습니다.",
        examNo,
        data: {
            application: applicationResults[0] ?? null,
            subjects: subjectResults,
            semesters: semesterResults,
            rankings: rankingResults,
            finalScore: finalScoreResults[0] ?? null,
        },
    });
  } catch (error: unknown) {
    console.error("성적 검증 API 오류:", error);

    const message =
      error instanceof Error
        ? error.message
        : "데이터베이스 조회 중 오류가 발생했습니다.";

    if (message.includes("학생부 성적 데이터가 없습니다")) {
      return NextResponse.json(
        { message: "입력한 수험번호의 학생부 성적 데이터가 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "성적 검증 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}