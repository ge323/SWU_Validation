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
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

export function getDbPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect();
  }

  return poolPromise;
}