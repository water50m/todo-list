// lib/db.ts
import { Pool } from 'pg';

declare global {
  var _pgPool: Pool | undefined;
}

const pool =
  globalThis._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgPool = pool;
}

export default pool;
