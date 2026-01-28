
Goal
- Create a MongoDB Atlas copy of your current backend data (a “mirror”) and keep it up to date.
- You also selected “migrate auth too”. That is a separate (much bigger) project because the app is tightly coupled to the current authentication system (login, sessions, password reset, teacher approval gating, admin user management). Also, passwords cannot be migrated as-is (you never get users’ password hashes in a portable way), so any true auth migration will require a reset-password / re-invite flow.

Important reality check (so expectations are correct)
- This app currently uses Lovable Cloud for:
  - Authentication sessions and JWTs (used everywhere, including backend functions)
  - Database queries (RLS policies enforce security)
  - Realtime channels (used by Live Classes)
  - Storage buckets for files (uploads/avatars)
- A “MongoDB copy” is feasible (sync data to Atlas).
- A “full replacement” (stop using Lovable Cloud auth/db/realtime) would require significant refactors and would also remove RLS protections unless we rebuild authorization in a custom API.

Proposed approach (recommended): Mirror data to MongoDB Atlas + keep current auth (Phase 1), then optionally plan auth migration (Phase 2)

Phase 1 — MongoDB Atlas data mirror (sync copy)
1) Decide what exactly to sync
   - Sync relational tables (documents/collections in MongoDB):
     - profiles, user_roles, teacher_approvals
     - courses, lessons, notes
     - assignments, assignment_submissions
     - quizzes, quiz_questions, quiz_submissions
     - enrollments
     - live_classes
   - Do NOT store files in MongoDB:
     - Keep files in storage buckets; only sync file URLs/paths (file_url, avatar_url, resource_url).

2) MongoDB Atlas setup (you do once)
   - Create an Atlas cluster.
   - Enable Atlas Data API (recommended for serverless HTTP writes from backend functions).
   - Create an API key / application key for the Data API.
   - Create a database (e.g., “brightoria”) and collections matching your tables (e.g., “courses”, “profiles”, etc.).
   - Configure IP allowlist to permit serverless requests (or Data API does this via keys).

3) Secrets we will add to the project (no hardcoding)
   - MONGODB_DATA_API_URL (your Atlas Data API endpoint)
   - MONGODB_DATA_API_KEY
   - MONGODB_DATA_SOURCE (cluster name)
   - MONGODB_DATABASE_NAME

4) Build backend sync functions (server-side)
   We’ll create a small set of backend functions that:
   - Authenticate the caller (admin-only for full sync; system-only for incremental).
   - Read from the current database using privileged server credentials.
   - Transform rows to MongoDB documents (convert timestamps to ISO strings, keep UUIDs as strings).
   - Upsert into MongoDB using the Atlas Data API.
   
   Functions to implement:
   - mongo-sync-full (admin-only)
     - Pull all rows from each table in chunks (pagination).
     - Upsert by primary key (“id” or “user_id” depending on table).
   - mongo-sync-incremental (internal use)
     - Sync only changed rows after a given “since” timestamp for tables that have created_at/updated_at.
     - For tables without updated_at, we can still do time-window by created_at or do “sync on write” (next step).
   - mongo-sync-onwrite (optional, recommended)
     - For each important write path (create/update course, create live class, upload assignment, etc.), after the main DB write succeeds, trigger a background sync for just that entity.

5) Add an “Admin → Sync to MongoDB” button in the UI
   - Admin dashboard gets a “Sync to MongoDB” section:
     - “Run full sync now” button (calls mongo-sync-full)
     - Shows progress and last-sync timestamp
     - Optional: show per-collection counts synced
   - This avoids needing scheduled jobs and still gives you control.

6) Verification & monitoring
   - Add logs in the sync functions:
     - How many rows were fetched per table
     - How many upserts succeeded/failed
   - Add a “health check” read:
     - Compare counts (approx) between current DB tables and MongoDB collections.

Phase 2 — Auth migration to MongoDB (optional, larger project)
This is only recommended if you truly need to stop using the current authentication system. Key constraints:
- You cannot migrate existing user passwords. Users must:
  - Reset password, or
  - Be re-invited to set a new password.
- You must rebuild:
  - Login, session persistence, refresh tokens
  - Password reset emails
  - Role checks (admin/teacher/student) server-side
  - Teacher approval workflow
  - Admin user management (create user, delete user, list users)
  - Security rules currently enforced by RLS must move into your API authorization rules

Practical migration steps if you still want it:
1) Choose auth technology
   - MongoDB Atlas App Services Auth, or another dedicated auth provider.
2) Introduce a “new auth mode” behind a feature flag
   - Keep current auth running while you test new auth in parallel.
3) Build a new API layer for all data access
   - Frontend stops calling direct database queries; instead calls your API.
4) Migrate users
   - Export user profiles + roles
   - Invite users to set a new password
5) Cutover
   - Once all key flows work, disable old auth paths.

What I need from you before implementation
- MongoDB Atlas Data API details (we’ll store as secrets):
  - Data API URL
  - Data API Key
  - Data Source (cluster name)
  - Database name you want (e.g., brightoria)
- Confirm scope for auth migration:
  - Do you want Phase 2 now, or should we complete Phase 1 (data mirror) first and revisit auth later?

Implementation order (exact)
1) Add MongoDB secrets.
2) Implement backend functions: mongo-sync-full + shared helper logic for upsert requests to Atlas Data API.
3) Add Admin UI: “Sync to MongoDB” panel with button + status.
4) Add incremental / on-write sync (optional but recommended).
5) Validate data in MongoDB Atlas.
6) If still required: create a separate plan for auth migration (Phase 2) because it impacts many parts of the app.

Risks / edge cases to handle
- Large tables: chunk/paginate reads (limit 1000) to avoid timeouts.
- Data typing: timestamps, JSON columns (options, answers) must stay JSON.
- Duplicates: upsert by stable key; ensure unique indexes in MongoDB on those keys.
- Security: sync endpoints must be admin-protected; MongoDB keys must never be exposed to the browser.
