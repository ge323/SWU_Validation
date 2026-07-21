import { getDbPool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pool = await getDbPool();

    const result = await pool.request().query<{
      databaseName: string;
      serverTime: Date;
    }>(`
      SELECT
        DB_NAME() AS databaseName,
        GETDATE() AS serverTime;
    `);

    return Response.json({
      success: true,
      message: "SQL Server 연결 성공",
      data: result.recordset[0],
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류";

    console.error("SQL Server connection error:", error);

    return Response.json(
      {
        success: false,
        message: "SQL Server 연결 실패",
        error: message,
      },
      { status: 500 },
    );
  }
}