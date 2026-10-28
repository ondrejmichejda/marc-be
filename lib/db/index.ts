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

      // Create messages log table
      await sql`
        CREATE TABLE IF NOT EXISTS messages (
          id BIGSERIAL PRIMARY KEY,
          update_id BIGINT,
          message_id BIGINT,
          chat_id BIGINT NOT NULL,
          user_id BIGINT,
          username TEXT,
          first_name TEXT,
          last_name TEXT,
          chat_type TEXT NOT NULL DEFAULT 'private',
          text TEXT,
          direction TEXT NOT NULL DEFAULT 'incoming',
          message_type TEXT NOT NULL DEFAULT 'text',
          raw_payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create openai_logs table
      await sql`
        CREATE TABLE IF NOT EXISTS openai_logs (
          id BIGSERIAL PRIMARY KEY,
          model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
          prompt TEXT NOT NULL,
          completion TEXT,
          prompt_tokens INT NOT NULL DEFAULT 0,
          completion_tokens INT NOT NULL DEFAULT 0,
          total_tokens INT NOT NULL DEFAULT 0,
          duration_ms INT NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'success',
          error_message TEXT,
          user_identifier TEXT,
          source TEXT NOT NULL DEFAULT 'system',
          raw_payload JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create users table for Gmail / Google Authentication
      await sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'user',
          picture TEXT,
          google_id TEXT UNIQUE,
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Safe schema migration for existing deployments: ensure role column exists
      await sql`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
      `;

      // Create user sessions table
      await sql`
        CREATE TABLE IF NOT EXISTS user_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_agent TEXT,
          ip_address TEXT
        );
      `;

      // Create roles table for dynamic role management
      await sql`
        CREATE TABLE IF NOT EXISTS roles (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          badge_color JSONB,
          is_system BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Create role_menu_mappings table
      await sql`
        CREATE TABLE IF NOT EXISTS role_menu_mappings (
          menu_item_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          PRIMARY KEY (menu_item_id, role_id)
        );
      `;

      // Seed default built-in roles if roles table is empty
      const existingRoles = (await sql`
        SELECT COUNT(*)::int as count FROM roles;
      `) as { count: number }[];

      if (Number(existingRoles[0]?.count || 0) === 0) {
        await sql`
          INSERT INTO roles (id, name, description, badge_color, is_system)
          VALUES
            ('admin', 'Administrator', 'Full system administration, role configuration, user assignments, and menu mapping.', '{"bg":"bg-purple-500/10","text":"text-purple-300","border":"border-purple-500/30","dot":"bg-purple-400"}'::jsonb, TRUE),
            ('operator', 'Operator', 'Access to operational tools, background workflows, and designated business modules.', '{"bg":"bg-sky-500/10","text":"text-sky-300","border":"border-sky-500/30","dot":"bg-sky-400"}'::jsonb, FALSE),
            ('user', 'Standard User', 'Standard access to designated general application modules.', '{"bg":"bg-emerald-500/10","text":"text-emerald-300","border":"border-emerald-500/30","dot":"bg-emerald-400"}'::jsonb, FALSE)
          ON CONFLICT (id) DO NOTHING;
        `;

        await sql`
          INSERT INTO role_menu_mappings (menu_item_id, role_id)
          VALUES
            ('mock_a', 'admin'),
            ('mock_a', 'operator'),
            ('mock_a', 'user'),
            ('mock_b', 'admin'),
            ('mock_b', 'operator'),
            ('mock_c', 'admin'),
            ('system', 'admin')
          ON CONFLICT DO NOTHING;
        `;
      }

      // Create indexes for efficient querying
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(telegram_user_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_chat ON tasks(telegram_chat_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_subscribers_active ON subscribers(is_active);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_openai_logs_created_at ON openai_logs(created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_openai_logs_model ON openai_logs(model);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_openai_logs_status ON openai_logs(status);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);`;

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
