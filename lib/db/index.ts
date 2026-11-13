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

      // Create scheduled_ai_prompts table for user AI prompts with 3 time options (9am, 1pm, 5pm)
      await sql`
        CREATE TABLE IF NOT EXISTS scheduled_ai_prompts (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          user_email TEXT,
          prompt TEXT NOT NULL,
          scheduled_time TEXT NOT NULL,
          title TEXT,
          model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          last_run_at TIMESTAMPTZ,
          last_run_result TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

      // Create fire_safety_solutions table
      await sql`
        CREATE TABLE IF NOT EXISTS fire_safety_solutions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT,
          nazev_stavby TEXT NOT NULL DEFAULT '',
          investor_name TEXT NOT NULL DEFAULT '',
          misto_stavby TEXT NOT NULL DEFAULT '',
          stupen_dokumentace TEXT NOT NULL DEFAULT '',
          datum TEXT NOT NULL DEFAULT '',
          zhodnoceni_technickych_zarizeni_stavby TEXT NOT NULL DEFAULT '',
          seznam_priloh TEXT NOT NULL DEFAULT '',
          seznam_podkladu TEXT NOT NULL DEFAULT '',
          uvod TEXT NOT NULL DEFAULT '',
          kategorizace_stavby_z_hlediska_pozarni_bezpecnosti TEXT NOT NULL DEFAULT '',
          konstrukcni_reseni_stavby TEXT NOT NULL DEFAULT '',
          posouzeni_pozarni_bezpecnosti_staveb TEXT NOT NULL DEFAULT '',
          pozarni_odolnost_stavebnich_konstrukci TEXT NOT NULL DEFAULT '',
          evakuace_a_druhy_a_kapacity_unikovych_cest TEXT NOT NULL DEFAULT '',
          pozarne_nebezpecny_prostor_odstupove_vzdalenosti TEXT NOT NULL DEFAULT '',
          zabezpeceni_pozarni_vodou_nebo_jinymi_hasebnimi_latkami TEXT NOT NULL DEFAULT '',
          pozadavky_na_pozarne_bezpecnostni_zarizeni_a_znaceni TEXT NOT NULL DEFAULT '',
          pozadavky_pro_haseni_pozaru_a_zachranne_prace TEXT NOT NULL DEFAULT '',
          files JSONB DEFAULT '[]'::jsonb,
          total_cost_usd NUMERIC(12, 6) DEFAULT 0,
          total_tokens INT DEFAULT 0,
          generation_count INT DEFAULT 0,
          raw_properties JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Ensure files and cost columns exist if table was previously created
      await sql`
        ALTER TABLE fire_safety_solutions
        ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS total_cost_usd NUMERIC(12, 6) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_tokens INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS generation_count INT DEFAULT 0;
      `;

      // Create fss_ai_prompts table for global FSS property generation prompts
      await sql`
        CREATE TABLE IF NOT EXISTS fss_ai_prompts (
          id TEXT PRIMARY KEY,
          field_key TEXT NOT NULL UNIQUE,
          property_name TEXT NOT NULL,
          placeholder_key TEXT NOT NULL,
          system_prompt TEXT NOT NULL,
          user_prompt TEXT NOT NULL,
          include_files BOOLEAN NOT NULL DEFAULT TRUE,
          model TEXT,
          temperature NUMERIC(3,2),
          description TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_by TEXT DEFAULT 'admin'
        );
      `;

      // Create fss_templates table for PBŘ DOCX templates management
      await sql`
        CREATE TABLE IF NOT EXISTS fss_templates (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          filename TEXT NOT NULL,
          size INT NOT NULL,
          mime_type TEXT NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          storage_type TEXT NOT NULL DEFAULT 'local',
          url TEXT,
          blob_url TEXT,
          uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          uploaded_by TEXT DEFAULT 'admin',
          version INT NOT NULL DEFAULT 1,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          placeholders_count INT DEFAULT 0,
          placeholders JSONB DEFAULT '[]'::jsonb,
          notes TEXT
        );
      `;

      // Create user_openai_settings table for per-user OpenAI API keys & preferences
      await sql`
        CREATE TABLE IF NOT EXISTS user_openai_settings (
          user_id TEXT PRIMARY KEY,
          api_key TEXT,
          default_model TEXT NOT NULL DEFAULT 'gpt-4o',
          web_search_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          organization TEXT,
          temperature NUMERIC(3,2),
          reasoning_effort TEXT,
          custom_model TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      // Safe schema migration: ensure custom_model column exists
      await sql`
        ALTER TABLE user_openai_settings
        ADD COLUMN IF NOT EXISTS custom_model TEXT;
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
            ('fire_safety_solutions', 'admin'),
            ('fire_safety_solutions', 'operator'),
            ('fire_safety_solutions', 'user'),
            ('fss_ai_prompts', 'admin'),
            ('openai_settings', 'admin'),
            ('openai_settings', 'operator'),
            ('openai_settings', 'user'),
            ('ai_prompts', 'admin'),
            ('ai_prompts', 'operator'),
            ('ai_prompts', 'user'),
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
      await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_user_id ON scheduled_ai_prompts(user_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_time ON scheduled_ai_prompts(scheduled_time);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_scheduled_prompts_created_at ON scheduled_ai_prompts(created_at DESC);`;
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
