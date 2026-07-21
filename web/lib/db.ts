import sql from "mssql/msnodesqlv8";

const config: sql.config = {
  server: process.env.DB_SERVER ?? "",
  database: process.env.DB_DATABASE ?? "",
  options: {
    trustedConnection: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30_000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getDbPool(): Promise<sql.ConnectionPool> {
  if (!config.server || !config.database) {
    throw new Error("DB_SERVER 또는 DB_DATABASE 환경 변수가 없습니다.");
  }

  if (!poolPromise) {
    const pool = new sql.ConnectionPool(config);

    poolPromise = pool.connect().catch((error: unknown) => {
      poolPromise = null;
      throw error;
    });
  }

  return poolPromise;
}

export { sql };