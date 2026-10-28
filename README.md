# marc-be — Backend with Telegram Bot Integration

A clean, modular Node.js / Next.js backend service designed to receive, process, and track backend tasks incoming from a Telegram Bot.

---

## 📁 Project Structure

The project follows a modular and readable structure tailored for backend development:

```text
marc-be/
├── app/
│   ├── login/
│   │   └── page.tsx         # Dedicated Sign-In with Google page (automatic user provisioning)
│   ├── components/
│   │   ├── AppSidebar.tsx   # Responsive left pane layout with user profile & logout
│   │   ├── GoogleSignInButton.tsx # One-click Google OAuth button
│   │   ├── LoginView.tsx    # Authentication gate & Google Sign-In landing view
│   │   ├── OpenAiSystemView.tsx # OpenAI System submenu (usage analytics & messages log)
│   │   ├── TelegramBotSystemView.tsx # Telegram Bot submenu (bot info & live messages log)
│   │   └── WebhookDeploymentControls.tsx # Interactive Telegram controls
│   ├── api/
│   │   ├── auth/
│   │   │   ├── google/
│   │   │   │   ├── route.ts     # Google OAuth URL initiator & direct ID-token verification
│   │   │   │   └── callback/
│   │   │   │       └── route.ts # Google OAuth 2.0 redirect callback & registration handler
│   │   │   ├── me/
│   │   │   │   └── route.ts     # Active user session profile & role menu mapping endpoint
│   │   │   ├── roles/
│   │   │   │   └── route.ts     # System role definitions & menu mapping schema
│   │   │   ├── logout/
│   │   │   │   └── route.ts     # Session clear & logout endpoint
│   │   │   └── users/
│   │   │       └── route.ts     # Query registered users & update roles (Admin only)
│   │   ├── draculino/
│   │   │   ├── where/
│   │   │   │   └── route.ts     # Query training units for today/day/branch
│   │   │   └── sitemap/
│   │   │       └── route.ts     # Verified Draculino branch sitemap & timetables
│   │   ├── tasks/
│   │   │   └── route.ts         # REST API endpoint to query and manage tasks
│   │   └── telegram/
│   │       ├── webhook/
│   │       │   └── route.ts     # Handles incoming POST updates from Telegram
│   │       └── setup-webhook/
│   │           └── route.ts     # Helper API to register/inspect/delete the Telegram webhook
│   ├── layout.tsx
│   └── page.tsx
├── lib/
│   ├── auth/
│   │   ├── config.ts            # Google OAuth configuration & environment validation
│   │   ├── crypto.ts            # JWT signing, verification & CSRF token generator
│   │   ├── google.ts            # Google OAuth client & token verification
│   │   ├── roles.ts             # User roles, permission levels & role-to-menu mapping
│   │   ├── session.ts           # Cookie management & session reader
│   │   ├── types.ts             # User, Session, GoogleProfile TypeScript types
│   │   └── userService.ts       # Database & fallback store for user registration & logins
│   ├── db/
│   │   └── index.ts             # Neon PostgreSQL client & schema initializer
│   ├── draculino/
│   │   ├── data.ts              # Structured schedules for all 13 Draculino branches
│   │   ├── sitemap.ts           # Sitemap parser and timetable URL verifier
│   │   ├── service.ts           # Core training query engine & markdown generator
│   │   ├── callbackHandler.ts   # Interactive Telegram button handlers
│   │   └── types.ts             # TypeScript types (TrainingUnit, GymBranch, etc.)
│   ├── openai/
│   │   ├── index.ts             # Module exports
│   │   ├── types.ts             # Telemetry, message log & config TypeScript interfaces
│   │   ├── logs.ts              # OpenAiLogService (token tracking, cost model, DB & local JSON store)
│   │   └── service.ts           # OpenAI client, completion runner, & insult generator
│   └── telegram/
│       ├── bot.ts               # GrammY bot initialization & handler registration
│       ├── config.ts            # Environment configuration & validation
│       ├── types.ts             # TypeScript types (TaskItem, TaskStatus, etc.)
│       ├── service.ts           # Outgoing Telegram API client (send messages, notifications)
│       └── handlers/
│           ├── commandHandler.ts    # Bot commands (/start, /help, /ping, /where)
│           ├── taskHandler.ts       # Task repository, state transitions, & inline button callbacks
│           └── messageHandler.ts    # Telegram update listeners
├── .env.example                 # Template for environment variables
└── README.md
```

---

## 🚀 Quick Start Guide

### 1. Configure Google / Gmail Authentication (OAuth 2.0)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project, then navigate to **APIs & Services** > **Credentials**.
3. Create an **OAuth 2.0 Client ID** (Application type: *Web application*).
4. Add Authorized redirect URIs:
   - For local development: `http://localhost:3000/api/auth/google/callback`
   - For production: `https://<your-app>.vercel.app/api/auth/google/callback`
5. Copy the **Client ID** and **Client Secret** into your `.env.local` file:
   ```env
   GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   AUTH_SECRET="your-random-32-character-secret"
   ```

### 2. Create a Telegram Bot
1. Open Telegram and search for [@BotFather](https://t.me/botfather).
2. Send `/newbot` and follow the prompts to choose a name and username for your bot.
3. BotFather will provide an API token (e.g. `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ`).

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
DATABASE_URL="postgresql://user:password@ep-xyz-pooler.c-8.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
TELEGRAM_BOT_TOKEN="your-bot-token-from-botfather"
TELEGRAM_WEBHOOK_SECRET="your-random-secret-token" # (Optional but recommended)
APP_URL="https://your-public-url.ngrok-free.app"    # (Optional for automatic webhook registration)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
AUTH_SECRET="your-random-auth-secret"
```

### 4. Run the Development Server
```bash
npm run dev
```
The server will start at `http://localhost:3000`.

---

## 🔗 Connecting Telegram to Local Development (Webhook)

Because Telegram sends updates to a public HTTPS URL, use a tunnel like [ngrok](https://ngrok.com) for local testing:

```bash
# In a separate terminal
npm run tunnel
# or alternatively: ngrok http 3000
```

Copy the HTTPS forwarding URL (e.g., `https://abc-123.ngrok-free.app`).

### Register the Webhook
You can register the webhook using our setup endpoint:

**Via curl:**
```bash
curl -X POST http://localhost:3000/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://abc-123.ngrok-free.app/api/telegram/webhook"}'
```

**Check Webhook Status:**
```bash
curl http://localhost:3000/api/telegram/setup-webhook
```

---

## 🚀 Production Deployment & Serverless Webhook Setup (Vercel)

When deploying to serverless platforms such as **Vercel**, serverless functions run on-demand and remain cold until an incoming HTTP request is received. Although `instrumentation.ts` handles auto-registration for long-running servers, serverless cold starts will not trigger webhook registration automatically on deployment.

### 1. Configure Environment Variables
In your Vercel Project Settings (**Settings** > **Environment Variables**), configure:
- `TELEGRAM_BOT_TOKEN` — Your bot token from @BotFather.
- `APP_URL` — Your production domain (e.g., `https://your-app.vercel.app`, no trailing slash).
- `TELEGRAM_WEBHOOK_SECRET` — (Optional) Secret token for update validation.

### 2. Required Post-Deployment `curl` Setup
After deploying to Vercel (or when updating your domain/bot token), **you must trigger the setup endpoint once via `curl`** (or open it in a browser) to register your URL with Telegram's Bot API:

```bash
# Register webhook using the configured APP_URL
curl -X POST https://<your-app>.vercel.app/api/telegram/setup-webhook
```

Alternatively, you can provide an explicit webhook URL in the JSON body:
```bash
curl -X POST https://<your-app>.vercel.app/api/telegram/setup-webhook \
  -H "Content-Type: application/json" \
  -d '{"url": "https://<your-app>.vercel.app/api/telegram/webhook"}'
```

### 3. Verify Registration Status
Check that Telegram successfully registered the endpoint:
```bash
curl https://<your-app>.vercel.app/api/telegram/setup-webhook
```

> **Note on Persistence:** Telegram permanently stores the webhook URL on their servers. You only need to execute this `curl` command after the initial deployment or if you change your domain name or bot token; routine code redeployments do not require re-registering.

---

## 🤖 Bot Usage & Commands

Once connected, open your bot in Telegram and use:

- `/start` — Welcome message and quick overview (automatically registers chat ID for notifications).
- `/ping` — Check server latency and health.
- `/help` — Help and usage instructions.
- `/broadcast <message>` — (Admin only) Broadcast an announcement message to all active subscribers.
- `/subscribers` — (Admin only) View count of active and total registered bot subscribers.
- `/where` — Check Draculino training units & timetables for today across all branches (supports `/where [město]`, `/where zitra`, `/where sitemap`).

---

## 📢 Deployment Notifications to All Users

The bot tracks all users and groups that start or send messages to the bot. When a new deployment occurs, you can broadcast notification messages to all active users.

### Trigger Deployment Notification via API (CI/CD / Post-deploy Webhook)
Make a POST request to `/api/telegram/notify-deployment`:

```bash
curl -X POST https://<your-app>.vercel.app/api/telegram/notify-deployment \
  -H "Authorization: Bearer <your-ADMIN_API_KEY-or-TELEGRAM_WEBHOOK_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "1.2.0",
    "releaseNotes": "• Added deployment notifications\n• Performance improvements",
    "message": "We have just released an update!"
  }'
```

### Auto-Notify on Server Startup
Set `AUTO_NOTIFY_DEPLOYMENT=true` in your `.env.local` / Vercel environment variables. The server will automatically broadcast a notification when it boots for a new deployment or commit SHA (without re-notifying on cold restarts of the same deployment).

---

## 🌐 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Web Application with left-pane navigation and role-based access control |
| `GET` | `/api/health` | System health check, database ping & latency, service statuses (JSON) |
| `GET` | `/api/auth/me` | Current authenticated user session, assigned role & accessible menu list |
| `GET` | `/api/auth/roles` | List dynamic role definitions, menu items, and current menu-to-role mappings |
| `POST` | `/api/auth/roles` | Create a new custom role (Administrator only) |
| `PUT` | `/api/auth/roles` | Update menu item to role access mappings (Administrator only) |
| `DELETE` | `/api/auth/roles` | Delete a custom role (Administrator only) |
| `GET` | `/api/auth/users` | List registered accounts with role assignments (Admin only) |
| `PATCH` | `/api/auth/users` | Assign registered user to any active role (Administrator only) |
| `GET` | `/api/draculino/where` | Query training units for today or a specific day/branch (`?day=...&branch=...`) |
| `GET` | `/api/draculino/sitemap` | Verified sitemap of Draculino gym branches and timetable links |
| `POST` | `/api/telegram/webhook` | Telegram webhook receiver (validates secret header and executes handlers) |
| `GET` | `/api/telegram/webhook` | Webhook health check |
| `GET` | `/api/telegram/setup-webhook` | Check current Telegram bot and webhook info |
| `POST` | `/api/telegram/setup-webhook` | Register or update webhook URL with Telegram API |
| `DELETE` | `/api/telegram/setup-webhook` | Remove webhook from Telegram API |
| `GET` | `/api/telegram/messages` | Query and filter persisted Telegram interaction audit logs |
| `POST` | `/api/telegram/notify-deployment` | Broadcast deployment notification to all active subscribers |
| `GET` | `/api/telegram/notify-deployment` | Check current subscriber statistics |
| `GET` | `/api/tasks` | List all tasks (supports `?status=pending`, `?userId=...`, `?chatId=...`) |
| `POST` | `/api/tasks` | Create a task via REST API |

---

## 🛡️ Role-Based Access Control & System Administration

The platform features dynamic Role-Based Access Control (RBAC):
- **Mock Menu Items (A, B, C)**: Available business application modules mapped dynamically to roles.
- **System Menu (`system`)**: Strictly accessible **only by Administrator accounts**.
- **Database-Only Administrator Policy**: Administrator permissions cannot be granted via client requests or auto-promotions; they are set strictly in the database (`users.role = 'admin'`).
- **Dynamic Roles Management (Inside System Menu)**:
  1. **Create Roles**: Administrators can define custom roles with unique identifiers, labels, descriptions, and color themes.
  2. **Assign Users to Roles**: Real-time user assignment selector to elevate or change user roles across all active roles.
  3. **Menu Item to Role Access Matrix**: Interactive matrix allowing administrators to toggle and persist which roles can access Menu Items A, B, and C (System menu item remains locked strictly to Admin).

---

## 🛠 Extending with a Database (e.g., Prisma / PostgreSQL)

Tasks are currently managed in-memory via `TaskService` (`lib/telegram/handlers/taskHandler.ts`).

When you are ready to persist tasks in a real database:
1. Replace `taskStore` in `lib/telegram/handlers/taskHandler.ts` with your database client (e.g., `prisma.task.create(...)`, `prisma.task.findMany(...)`, etc.).
2. The bot handlers, routes, and REST API will automatically benefit from persistent storage without changing their interface.
