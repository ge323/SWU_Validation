export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";

export async function GET() {
  try {
    const pool = await getDbPool();

    const result = await pool.request().query(`
        SELECT
            DB_NAME() AS DatabaseName,
            @@SERVERNAME AS ServerName,
            GETDATE() AS ServerTime
    `);

    return NextResponse.json(result.recordset[0]);
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        success: false,
        error: String(err),
      },
      { status: 500 }
    );
  }
}