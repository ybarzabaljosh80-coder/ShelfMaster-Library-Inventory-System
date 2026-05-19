# AGENT.md

This file maps the codebase for future agent sessions. Load it before making changes.

## Project Snapshot

The SPCBA Library System: a SvelteKit 2 + Svelte 5 full-stack app for library authentication, book inventory, borrowing, reservations, notifications, reports, and role-based administration.

Core stack:

- Runtime/package manager: Bun, with `bun.lock` committed.
- Framework: SvelteKit 2, Svelte 5 with runes mode forced for project source in `svelte.config.js`.
- Styling: Tailwind CSS 4 via `@tailwindcss/vite`, configured from `src/routes/layout.css`.
- Database/auth: Supabase PostgreSQL + Supabase Auth through `@supabase/ssr` and `@supabase/supabase-js`.
- Email: Resend API via `src/lib/email.ts`.
- Import/export: `xlsx` package for Excel files; CSV report output is built manually.

## Commands

Use Bun for project commands:

- `bun install`: install dependencies.
- `bun run dev`: start Vite dev server.
- `bun run build`: production build.
- `bun run preview`: preview production build.
- `bun run check`: `svelte-kit sync` plus `svelte-check --tsconfig ./tsconfig.json`.
- `bun run lint`: `prettier --check .` plus `eslint .`.
- `bun run format`: Prettier write across the repo.

There are no automated test files currently tracked. For verification, prefer `bun run check`, then `bun run lint`, then `bun run build` when practical.

## Environment

Expected root `.env` variables:

- `PUBLIC_SUPABASE_URL`: public Supabase URL.
- `PUBLIC_SUPABASE_ANON_KEY`: public Supabase anon key.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key for admin/RLS-bypassing operations.
- `RESEND_API_KEY`: server-only Resend key for notification emails.

Never expose `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` to client code. Public env imports must come from `$env/static/public`; server-only env imports come from `$env/static/private` or `$env/dynamic/private`.

## Repository Map

Top-level source and config:

- `package.json`: scripts and dependencies.
- `svelte.config.js`: SvelteKit adapter-auto and forced Svelte 5 runes mode for project files.
- `vite.config.ts`: Vite plugins for Tailwind CSS and SvelteKit.
- `eslint.config.js`: ESLint flat config for JS, TypeScript, Svelte, and Prettier compatibility.
- `.prettierrc`: tabs, single quotes, no trailing commas, print width 100, Svelte/Tailwind plugins.
- `tsconfig.json`: strict TypeScript extending generated `.svelte-kit/tsconfig.json`.
- `static/supabase-schema.sql`: Supabase schema/bootstrap SQL.
- `README.md`: user-facing project overview and route/API documentation.
- `PLAN.md`: historical project plan; useful context, but less current than code/README.

Tracked app structure:

```text
src/
  app.d.ts
  app.html
  hooks.server.ts
  lib/
    components/
      EmptyState.svelte
      NavigationLoader.svelte
      NotificationBell.svelte
      Skeleton.svelte
    server/
      notifications.ts
      reservations.ts
      supabase.ts
    email.ts
    supabase.ts
    types.ts
  routes/
    +layout.svelte
    +page.server.ts
    +page.svelte
    +error.svelte
    layout.css
    login/+page.svelte
    register/+page.svelte
    auth/callback/+server.ts
    (user)/...
    (admin)/...
    api/...
```

Generated/build artifacts:

- `.svelte-kit/` is generated and ignored. Do not edit it.
- `build/`, `.output/`, deployment folders, `node_modules/`, and env files are ignored.

## Runtime Architecture

Request lifecycle:

- `src/hooks.server.ts` runs for every request.
- The hook creates `event.locals.supabase` using `createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, cookie adapters)`.
- It calls `event.locals.supabase.auth.getUser()` and stores the result at `event.locals.user`.
- It allows Supabase serialized response headers `content-range` and `x-supabase-api-version`.

Global typing:

- `src/app.d.ts` declares `App.Locals.supabase: SupabaseClient` and `App.Locals.user: User | null`.
- Server routes and server loads should use `locals.supabase` for user-scoped Supabase access.

Supabase clients:

- `src/lib/supabase.ts` exports a browser client using public env vars.
- `src/lib/server/supabase.ts` exports `createClient(cookies)` for server-side cookie-bound clients.
- `src/lib/server/supabase.ts` also exports `createServiceRoleClient()`, a cached service-role client or `null` if the service key is missing.
- Existing code often uses `createServiceRoleClient() ?? locals.supabase` for operations that may need to bypass RLS, especially queue/copy updates.

Important caution:

- `locals.supabase` is request/session-scoped and obeys the user's auth/RLS context.
- `createServiceRoleClient()` bypasses RLS. Use it only in server-only code after explicit authorization checks, or in shared server helpers that are only reached from authorized server routes.

## Route Groups And Access

Root routes:

- `src/routes/+layout.svelte` loads global CSS, favicon, and `NavigationLoader`.
- `src/routes/+page.server.ts` redirects unauthenticated users to `/login`; redirects `admin` and `moderator` roles to `/admin/dashboard`; redirects everyone else to `/dashboard`.
- `src/routes/+error.svelte` renders friendly error pages.

User route group:

- `src/routes/(user)/+layout.server.ts` requires `locals.user`, loads the profile, creates a missing profile from Supabase metadata if necessary, and redirects `admin` users to `/admin/dashboard`.
- `src/routes/(user)/+layout.svelte` renders the user nav for `/dashboard`, `/books`, and `/borrows`; it triggers `/api/notifications/check` on mount and refreshes `NotificationBell`.
- `src/routes/(user)/dashboard/+page.server.ts` loads active borrows, overdue count, and active reservation count for the current user.
- `src/routes/(user)/dashboard/+page.svelte` displays borrow slot status, overdue state, and reservation count.
- `src/routes/(user)/books/+page.svelte` browses/searches books, filters by category, borrows available books, and reserves unavailable books.
- `src/routes/(user)/borrows/+page.server.ts` loads current user's borrow history and active reservations.
- `src/routes/(user)/borrows/+page.svelte` lets users self-return borrows and cancel reservations.

Admin route group:

- `src/routes/(admin)/+layout.server.ts` requires `locals.user`, loads the profile, and allows `admin` and `moderator`.
- `src/routes/(admin)/+layout.svelte` renders admin navigation and conditionally shows Users only for `admin` and `moderator`.
- `src/routes/(admin)/admin/dashboard/+page.server.ts` aggregates total books, books out, registered users, total borrows, active borrows, and overdue borrows.
- `src/routes/(admin)/admin/dashboard/+page.svelte` renders stat cards.
- `src/routes/(admin)/admin/books/+page.svelte` manages inventory: search, add, edit copies/category, delete, import, export.
- `src/routes/(admin)/admin/users/+page.svelte` manages users, filters/searches roles, changes roles, and deletes users.
- `src/routes/(admin)/admin/borrows/+page.svelte` lists borrow records, filters by user/book/date, shows reservations, and force-returns active borrows.
- `src/routes/(admin)/admin/reports/+page.svelte` downloads CSV or Excel reports with optional date range filters.

Role model:

- `user`: regular portal access.
- `moderator`: admin-panel access including user management, but cannot promote to `admin`/`moderator` or modify/remove admins/moderators.
- `admin`: full admin-panel access.

## API Endpoint Map

Authentication:

- `POST /api/auth/login`: validates email/password, calls `signInWithPassword`, returns a redirect path based on profile role.
- `POST /api/auth/register`: validates name/email/password, calls `signUp` with metadata `{ name }`, handles email confirmation by returning a message when no session exists.
- `POST /api/auth/logout`: calls `locals.supabase.auth.signOut()`.
- `GET /auth/callback`: exchanges Supabase auth code for a session and redirects to `next` or `/dashboard`; on failure redirects to `/login?error=confirmation_failed`.

Books:

- `GET /api/books`: authenticated book search/list. Supports `q` across title/author/serial and `category` exact filter.
- `POST /api/books/add`: admin/moderator only. Adds title, author, serial, optional category, and copy count. Duplicate serial returns 409.
- `PATCH /api/books/[id]`: admin/moderator only. Updates total copies and category; adjusts available copies by total-copy diff.
- `DELETE /api/books/[id]`: admin/moderator only. Blocks deletion when active borrows exist.
- `POST /api/books/import`: admin/moderator only. Accepts uploaded Excel/CSV, fuzzy-matches columns, inserts new serials, and uses `add_book_copies` RPC for duplicate serials.
- `GET /api/books/export`: admin/moderator only. Returns `.xlsx` inventory export.

Borrows:

- `GET /api/borrows`: admin/moderator only. Lists borrow records with optional `user`, `book`, `from`, and `to` filters.
- `POST /api/borrows/borrow`: authenticated users. Enforces max 3 active borrows, no overdue borrows, no duplicate active borrow for same book, reservation readiness, and copy availability.
- `POST /api/borrows/return`: current user only. Marks own borrow returned and calls reservation queue handling.
- `POST /api/borrows/force-return`: admin/moderator only. Marks a borrow returned with `force_returned` and `force_returned_by`, then calls reservation queue handling.
- `GET /api/borrows/export`: admin/moderator only. Returns `.xlsx` borrow export with optional date range.

Reservations:

- `GET /api/reservations`: current user's active `waiting` and `ready` reservations.
- `POST /api/reservations`: creates a reservation only for unavailable books, rejects duplicate active reservations and active borrows for the same book, assigns FIFO position.
- `DELETE /api/reservations/[id]`: current user can cancel own active reservation. If cancelling `ready`, releases or promotes held copy; if cancelling `waiting`, recalculates queue positions.
- `GET /api/reservations/admin`: admin/moderator only. Lists all active reservations with profile/book joins.

Notifications:

- `GET /api/notifications`: current user's newest 20 notifications and unread count.
- `PATCH /api/notifications`: marks current user's selected notifications or all unread notifications as read.
- `POST /api/notifications/check`: generates due-date notifications for current user and processes expired ready reservations.

Users:

- `GET /api/users`: admin/moderator only. Lists profiles.
- `DELETE /api/users/[id]`: admin/moderator only. Blocks self-deletion, blocks moderators from removing admins/moderators, and blocks deletion with active borrows.
- `POST /api/users/[id]/role`: admin/moderator only. Valid roles: `user`, `moderator`, `admin`. Uses service role and enforces moderator limits.

Reports:

- `GET /api/reports`: admin/moderator only. Returns CSV borrow report with optional `from` and `to` filters.

## Shared Server Modules

`src/lib/server/reservations.ts` owns reservation queue and copy-count behavior:

- `ACTIVE_RESERVATION_STATUSES`: `waiting`, `ready`.
- `recalculateReservationPositions(supabase, bookId)`: reorders active reservations by position and created time.
- `promoteNextReservation(supabase, bookId)`: promotes the next waiting reservation to `ready`, sets a 2-day pickup window, and inserts a reservation-ready notification.
- `handleReturnedBook(supabase, bookId)`: recalculates queue, promotes next reservation if present, otherwise calls `increment_available_copies` RPC.
- `releaseHeldReservationCopy(supabase, bookId)`: for expired/cancelled ready reservations; promotes next reservation or increments available copies.

`src/lib/server/notifications.ts` owns notification generation:

- `createNotificationIfNeeded(supabase, input)`: de-duplicates notifications of the same type/reference within 24 hours, inserts a notification, and can send email.
- `generateDueNotifications(supabase, userId)`: creates `overdue`, `due_today`, or `due_soon` notifications for active borrows.
- `processExpiredReservations(supabase)`: expires ready reservations past `expires_at` and releases/promotes the copy.

`src/lib/email.ts` sends email through Resend:

- `sendEmail(to, subject, html)` returns `{ success: false, reason: 'no_api_key' }` when `RESEND_API_KEY` is missing.
- The sender is hard-coded as `SPCBA Library <library@spcba.edu.ph>`.

## Data Model

Application interfaces live in `src/lib/types.ts`:

- `Profile`: `id`, `name`, `role`, `created_at`.
- `Book`: `id`, `title`, `author`, `serial_no`, `category`, `total_copies`, `available_copies`, `created_at`.
- `BorrowRecord`: `id`, `user_id`, `book_id`, `borrowed_at`, `due_date`, `returned_at`, `force_returned`, `force_returned_by`.
- `Reservation`: `id`, `user_id`, `book_id`, `status`, `position`, `created_at`, `ready_at`, `expires_at`.
- `Notification`: `id`, `user_id`, `type`, `title`, `message`, `read`, `reference_id`, `created_at`.

Database schema expectations from code:

- `profiles.role` supports `pending`, `user`, `moderator`, and `admin`.
- `books` supports `category`, `total_copies`, and `available_copies`.
- `borrow_records` supports `due_date`, `force_returned`, and `force_returned_by`.
- `reservations.status` supports `waiting`, `ready`, `fulfilled`, `cancelled`, and `expired`.
- `notifications.type` supports `reservation_ready`, `due_soon`, `due_today`, and `overdue`.
- RPCs expected by code: `decrement_available_copies(book_id_input)`, `increment_available_copies(book_id_input)`, and `add_book_copies(serial, extra)`.

Known schema/documentation drift to verify before DB changes:

- `static/supabase-schema.sql` does not currently include the `books.category` column, but code reads/writes it.
- `README.md` only lists `increment_available_copies` under Supabase RPC functions, but code also calls `decrement_available_copies` and `add_book_copies`.
- `PLAN.md` is older and describes a simpler `books.is_available` model; current code uses `total_copies` and `available_copies`.

## Business Rules

Borrowing:

- A user must be authenticated.
- A user may have at most 3 active borrows.
- A user cannot borrow a new book while any active borrow is overdue.
- A user cannot have duplicate active borrows for the same book.
- Borrow durations accepted by API are 1, 3, or 5 days; default is 5.
- Borrowing without a ready reservation requires effective availability greater than 0.
- Effective availability subtracts active borrows and ready reservations for other users from total copies.
- Borrowing with an active reservation marks that reservation `fulfilled` and recalculates queue positions.
- Borrowing without a ready reservation decrements available copies via RPC.

Returning:

- Users can return only their own active borrow.
- Admins and moderators can force-return any active borrow.
- Returning calls `handleReturnedBook`, which promotes the next reservation or increments available copies.

Reservations:

- Users can reserve only unavailable books.
- Users cannot have duplicate active reservations for the same book.
- Users cannot reserve a book they already actively borrowed.
- Queue positions are FIFO and recalculated after cancellation/fulfillment.
- Promoted reservations become `ready` for 2 days.
- Expired ready reservations are processed when `/api/notifications/check` runs.

Notifications:

- Due notification types: `overdue`, `due_today`, `due_soon`.
- Reservation-ready notifications are created when a waiting reservation is promoted.
- Duplicate notification creation is suppressed within 24 hours for same type/reference.
- In-app notifications are stored in Supabase; emails are best-effort and skipped without a Resend key.

Roles and users:

- Moderators and admins may access the admin layout.
- Only admins and moderators manage users.
- Moderators cannot assign `admin` or `moderator` roles.
- Moderators cannot modify or remove admins or other moderators.
- Users with active borrows cannot be deleted.
- A user cannot delete themselves or change their own role.

## Frontend Conventions

Svelte conventions:

- Source uses Svelte 5 runes: `$props`, `$state`, `$derived`, and `$effect`.
- Keep new components in runes style to match forced project mode.
- Existing pages often use client-side `fetch('/api/...')` for mutations instead of SvelteKit form actions.
- Use `$app/paths` `resolve()` for internal links in layouts/pages that need base-path safety.
- Root layout uses `{@render children()}` with `Snippet` typed children in route-group layouts.

Styling conventions:

- Tailwind classes are inline in Svelte files.
- Global stylesheet is `src/routes/layout.css` and imports Plus Jakarta Sans.
- Theme colors: primary `#1B6B3A`, primary hover `#155A2F`, gold `#C5A832`, gold hover `#B39628`.
- Visual language: warm off-white backgrounds (`#FAFAF9`), white translucent cards, rounded 2xl/3xl corners, subtle rings, small soft shadows, green/gold accents.
- Maintain mobile layouts. Existing layouts use `sm:` breakpoints, mobile overlay menus, and `min-h-[100dvh]`.

Reusable components:

- `NotificationBell.svelte`: fetches notification state, shows unread dot, dropdown list, and mark-all-as-read action.
- `NavigationLoader.svelte`: top loading bar using `$app/stores` `navigating`.
- `EmptyState.svelte`: simple dashed placeholder.
- `Skeleton.svelte`: simple pulsing loading placeholder.

When adding UI:

- Preserve existing brand colors and rounded/translucent visual style unless explicitly redesigning.
- Keep interactive buttons disabled while loading where mutations are involved.
- Surface API error `message` values to users where possible.
- Avoid adding large new UI libraries; Tailwind and plain Svelte are the current pattern.

## Server/API Conventions

General patterns:

- API routes live under `src/routes/api/**/+server.ts`.
- Use `RequestHandler` types from `./$types`.
- Return JSON with `json(...)` for API success/failure, except file downloads which return `new Response(...)` with content headers.
- Check `locals.user` first for authenticated endpoints.
- Re-fetch the caller's profile role before privileged operations.
- Use `adminRoles = ['admin', 'moderator']` for inventory/borrow/report admin-panel operations.
- Use exact admin/moderator checks for user management.
- Prefer explicit 401, 403, 400, 404, 409, and 500 responses matching existing style.

Mutation safety:

- Do not trust client-provided roles, user IDs, copy counts, or reservation status.
- Keep authorization checks before service-role operations.
- Preserve queue/copy invariants when touching borrow or reservation flows.
- If a mutation changes `borrow_records.returned_at`, make sure copy availability/reservation promotion is handled.
- If a mutation changes active reservations, recalculate positions or release held copies as appropriate.

Supabase query style:

- User-scoped reads/writes generally use `locals.supabase`.
- Queue/copy/system operations use `createServiceRoleClient() ?? locals.supabase`.
- Existing code uses Supabase joins like `profiles(name)` and `books(title, author, serial_no)`.
- File downloads set `Content-Disposition` filenames with `new Date().toISOString().split('T')[0]`.

## Formatting And Linting

Follow the committed Prettier config:

- Tabs for indentation.
- Single quotes.
- No trailing commas.
- `printWidth: 100`.
- Svelte and Tailwind Prettier plugins are enabled.

Follow ESLint config:

- TypeScript strictness is on through `tsconfig.json`.
- `no-undef` is disabled for TypeScript compatibility.
- Svelte parser options use project service and the project Svelte config.

## Editing Guidance For Agents

Before editing:

- Read the target route/component/server helper first.
- Check whether the behavior is user-scoped, moderator/admin-scoped, or service-role/system-scoped.
- If changing DB fields, compare code expectations with `static/supabase-schema.sql` and update schema docs/migrations if needed.
- Ignore `.svelte-kit/`; it is generated.

When changing borrow/reservation logic:

- Trace all affected flows: borrow, user return, force return, reservation cancel, reservation expiry, and reservation promotion.
- Preserve active copy count invariants and ready-reservation holds.
- Re-run `bun run check` at minimum.

When changing roles/auth:

- Update root redirect, login redirect, user layout guard, admin layout guard, and user-management endpoints consistently.
- Re-check `user`, `moderator`, and `admin` separately; their permissions differ.
- Never move service-role operations into browser code.

When changing UI:

- Keep Svelte 5 runes style.
- Keep mobile behavior intact.
- Use existing card/nav/form styling patterns unless the task is a redesign.
- Verify that route links still use the right user/admin paths.

Suggested verification by change type:

- Type/schema/API changes: `bun run check`.
- Formatting-sensitive changes: `bun run lint`.
- Broad route/layout changes: `bun run build`.
- Import/export changes: manually exercise upload/download if credentials and browser access are available.
- Supabase/RLS changes: verify with real roles if environment credentials are configured.
