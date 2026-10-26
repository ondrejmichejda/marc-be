import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let sqlClient: NeonQueryFunction<false, false> | null = null;
let dbInitPromise: Promise<void> | null = null;

/**
 * Gets or initializes the Neon SQL query client.
 */
export function getDb(): NeonQueryFunction<false, false> {
  if (sqlClient) {
    return sqlClient;
  }

  const databaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.NEON_DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "Missing DATABASE_URL environment variable. Please configure it in your .env or environment settings."
    );
  }

  sqlClient = neon(databaseUrl);
  return sqlClient;
}

/**
 * Checks whether database configuration is present.
 */
export function isDbConfigured(): boolean {
  return Boolean(
    process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.NEON_DATABASE_URL
  );
}

/**
 * Initializes the database schema (tables and indexes) idempotently.
 */
export async function initDatabase(): Promise<void> {
  if (!isDbConfigured()) {
    console.warn("[Database] No DATABASE_URL configured. Skipping database initialization.");
    return;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      const sql = getDb();

      // Create subscribers table
      await sql`
        CREATE TABLE IF NOT EXISTS subscribers (
          chat_id BIGINT PRIMARY KEY,
          user_id BIGINT,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          chat_type TEXT NOT NULL DEFAULT 'private',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create notified_deployments table
      await sql`
        CREATE TABLE IF NOT EXISTS notified_deployments (
          deploy_id TEXT PRIMARY KEY,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create tasks table
      await sql`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          priority TEXT NOT NULL DEFAULT 'medium',
          telegram_chat_id BIGINT NOT NULL DEFAULT 0,
          telegram_user_id BIGINT NOT NULL DEFAULT 0,
          telegram_username TEXT,
          metadata JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create indexes for efficient querying
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(telegram_user_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(telegram_chat_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);`;

      console.log("✅ [Database] Schema initialized successfully in Neon PostgreSQL.");
    } catch (error) {
      console.error("❌ [Database] Failed to initialize database schema:", error);
      dbInitPromise = null;
      throw error;
    }
  })();

  return dbInitPromise;
}

/**
 * Helper to ensure database is initialized before running operations.
 */
export async function ensureDb(): Promise<NeonQueryFunction<false, false>> {
  await initDatabase();
  return getDb();
}
