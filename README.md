# SPCBA Library System

A full-stack library management system built for **SPCBA** (San Pedro College of Business Administration). Manages books, borrowing, reservations, notifications, and user roles.

## Tech Stack

| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Framework  | [SvelteKit](https://kit.svelte.dev/) (Svelte 5)   |
| Styling    | [Tailwind CSS v4](https://tailwindcss.com/) (with forms & typography plugins) |
| Database   | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Email      | [Resend](https://resend.com/) (notification emails) |
| Bundler    | [Vite](https://vitejs.dev/)                       |
| Runtime    | [Bun](https://bun.sh/)                            |

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed
- A [Supabase](https://supabase.com/) project with Auth enabled

### Installation

```bash
bun install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
```

| Variable                    | Visibility    | Purpose                                      |
| --------------------------- | ------------- | -------------------------------------------- |
| `PUBLIC_SUPABASE_URL`       | Public        | Supabase project URL                         |
| `PUBLIC_SUPABASE_ANON_KEY`  | Public        | Supabase anonymous key (client-safe)         |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only   | Bypasses RLS for admin operations            |
| `RESEND_API_KEY`            | Server-only   | Sends notification emails via Resend API     |

### Development

```bash
bun run dev
```

### Build & Preview

```bash
bun run build
bun run preview
```

### Linting & Type Checking

```bash
bun run lint       # Prettier + ESLint
bun run check      # svelte-check (TypeScript)
bun run format     # Auto-format with Prettier
```

---

## User Roles

| Role        | Access                                                             |
| ----------- | ------------------------------------------------------------------ |
| `user`      | Browse books, borrow (max 3), reserve, view own borrows            |
| `staff`     | Same admin panel access as moderator (assigned by moderator/admin)  |
| `moderator` | Admin panel — manage books, borrows, users (cannot promote to admin)|
| `admin`     | Full access — all moderator abilities plus promote any role         |

---

## Project Structure

```
src/
├── app.d.ts                    # Global type declarations (Locals)
├── app.html                    # HTML shell template
├── hooks.server.ts             # Server hooks (Supabase session)
├── lib/                        # Shared library code
│   ├── components/             # Reusable Svelte components
│   ├── server/                 # Server-only modules
│   ├── email.ts                # Resend email integration
│   ├── supabase.ts             # Browser Supabase client
│   └── types.ts                # TypeScript interfaces
└── routes/                     # SvelteKit file-based routing
    ├── api/                    # REST API endpoints
    ├── (admin)/                # Admin route group (guarded)
    ├── (user)/                 # User route group (guarded)
    ├── auth/                   # OAuth/email callback
    ├── login/                  # Login page
    └── register/               # Registration page
```

---

## Core Files

### Global

| File | Description |
| ---- | ----------- |
| `src/app.d.ts` | Declares `App.Locals` — adds `supabase` (SupabaseClient) and `user` (User \| null) to every server request. |
| `src/app.html` | HTML shell with viewport meta, favicon, and `%sveltekit.body%` placeholder. |
| `src/hooks.server.ts` | **`handle()`** — Runs on every request. Creates a per-request Supabase server client with cookie-based sessions and attaches the authenticated user to `event.locals`. |

### Type Definitions

| File | Exports | Description |
| ---- | ------- | ----------- |
| `src/lib/types.ts` | `Profile`, `Book`, `BorrowRecord`, `Reservation`, `Notification` | TypeScript interfaces for all database entities. |

### Supabase Clients

| File | Exports | Description |
| ---- | ------- | ----------- |
| `src/lib/supabase.ts` | `supabase` | Browser-side Supabase client (uses anon key). |
| `src/lib/server/supabase.ts` | `createClient()`, `createServiceRoleClient()` | **`createClient(cookies)`** — Creates a server Supabase client bound to the user's cookie session. **`createServiceRoleClient()`** — Creates a singleton client with the service role key (bypasses RLS). |

### Email

| File | Exports | Description |
| ---- | ------- | ----------- |
| `src/lib/email.ts` | `sendEmail(to, subject, html)` | Sends transactional email via the Resend API. Used for borrow due-date and reservation-ready notifications. |

---

## Server Modules (`src/lib/server/`)

### `notifications.ts`

| Function | Description |
| -------- | ----------- |
| `createNotificationIfNeeded(supabase, input)` | Creates a notification if one of the same type hasn't been sent in the last 24 hours. Optionally sends an email. |
| `generateDueNotifications(supabase, userId)` | Scans a user's active borrows and generates `overdue`, `due_today`, or `due_soon` notifications as appropriate. |
| `processExpiredReservations(supabase)` | Finds reservations in `ready` status past their expiry, marks them `expired`, and promotes the next person in the queue. |

### `reservations.ts`

| Function | Description |
| -------- | ----------- |
| `recalculateReservationPositions(supabase, bookId)` | Re-numbers the queue positions for all active reservations of a book. |
| `promoteNextReservation(supabase, bookId)` | Promotes the next `waiting` reservation to `ready` status with a 2-day pickup window, and sends a notification. |
| `handleReturnedBook(supabase, bookId)` | Called when a book is returned — promotes the next reservation or increments available copies. |
| `releaseHeldReservationCopy(supabase, bookId)` | Called when a `ready` reservation expires — promotes the next in queue or releases the copy back to inventory. |

---

## Reusable Components (`src/lib/components/`)

| Component | Props | Description |
| --------- | ----- | ----------- |
| `EmptyState.svelte` | `message`, `actionLabel?`, `actionHref?` | Dashed-border placeholder for empty lists with an optional action link. |
| `NavigationLoader.svelte` | — | Animated gradient progress bar shown at the top during page navigations. |
| `NotificationBell.svelte` | `refreshKey` | Bell icon with unread badge. Opens a dropdown showing notifications with type-colored indicators and "Mark all as read". |
| `Skeleton.svelte` | `lines`, `class?` | Pulsing skeleton loader with configurable number of placeholder bars. |

---

## Pages & Layouts

### Root

| File | Description |
| ---- | ----------- |
| `routes/+page.server.ts` | Root redirect — sends authenticated users to their dashboard (admin or user), unauthenticated users to `/login`. |
| `routes/+layout.svelte` | Root layout — loads global CSS, favicon, and the `NavigationLoader`. |
| `routes/+error.svelte` | Error page — styled display for 404, 403, 500, and generic errors with navigation buttons. |
| `routes/layout.css` | Global styles — Tailwind imports, "Plus Jakarta Sans" font, theme color variables. |

### Authentication Pages

| File | Description |
| ---- | ----------- |
| `routes/login/+page.svelte` | Login form (email/password). Redirects based on role after successful authentication. |
| `routes/register/+page.svelte` | Registration form (name, email, password, confirm). Shows email confirmation message if required. |

### Admin Route Group (`routes/(admin)/`)

| File | Description |
| ---- | ----------- |
| `(admin)/+layout.server.ts` | **Guard** — Requires authentication + admin/staff/moderator role. Passes profile to child routes. |
| `(admin)/+layout.svelte` | Admin shell — sidebar/topbar navigation (Dashboard, Books, Users, Borrows, Reports), notification bell, user badge, logout. |
| `(admin)/admin/dashboard/+page.server.ts` | Loads aggregate stats: total books, books out, registered users, total/active/overdue borrows. |
| `(admin)/admin/dashboard/+page.svelte` | Renders six stat cards from the loaded data. |
| `(admin)/admin/books/+page.svelte` | Book management — search, add, delete, import from Excel/CSV. |
| `(admin)/admin/users/+page.svelte` | User management — list, search, filter by role, change roles (with hierarchy enforcement), delete users. |
| `(admin)/admin/borrows/+page.svelte` | Borrow records — search, filter by date range, view reservations, force-return active borrows. |
| `(admin)/admin/reports/+page.svelte` | Reports — download borrow reports as CSV or Excel with optional date range filters. |

### User Route Group (`routes/(user)/`)

| File | Description |
| ---- | ----------- |
| `(user)/+layout.server.ts` | **Guard** — Requires authentication, auto-creates profile if missing, redirects admin-role users to admin dashboard. |
| `(user)/+layout.svelte` | User shell — navigation (Dashboard, Books, My Borrows), notification bell, user name, logout. |
| `(user)/dashboard/+page.svelte` | User dashboard — welcome message, active borrows count, remaining slots (max 3), reservation count, borrow cards with overdue detection. |
| `(user)/books/+page.svelte` | Book catalog — search by query/category, borrow available books (configurable days), reserve unavailable books. |
| `(user)/borrows/+page.svelte` | My Borrows — list active/past borrows with return button, active reservations with cancel support. |

---

## API Endpoints (`src/routes/api/`)

### Authentication (`api/auth/`)

| Endpoint | Method | Description |
| -------- | ------ | ----------- |
| `/api/auth/login` | `POST` | Authenticates with email/password. Returns redirect path based on role. |
| `/api/auth/logout` | `POST` | Signs out the current Supabase session. |
| `/api/auth/register` | `POST` | Registers a new user (name, email, password). Returns redirect or email-confirmation message. |
| `/auth/callback` | `GET` | OAuth/email-confirmation callback. Exchanges auth code for a session. |

### Books (`api/books/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/books` | `GET` | User+ | Search/list books with optional `q` and `category` query params. |
| `/api/books/add` | `POST` | Staff+ | Add a new book (title, author, serial_no, category, copies). Rejects duplicate serials. |
| `/api/books/[id]` | `PATCH` | Staff+ | Update book copies and category (auto-adjusts available copies). |
| `/api/books/[id]` | `DELETE` | Staff+ | Delete a book (blocked if it has active borrows). |
| `/api/books/import` | `POST` | Staff+ | Import books from uploaded Excel/CSV with fuzzy column matching. |
| `/api/books/export` | `GET` | Staff+ | Export full book inventory as `.xlsx`. |

### Borrows (`api/borrows/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/borrows` | `GET` | Staff+ | List borrow records with filters (user, book, date range). |
| `/api/borrows/borrow` | `POST` | User+ | Create a borrow — enforces max 3 active, no overdue books, checks availability & reservations, decrements copies. |
| `/api/borrows/return` | `POST` | User+ | Self-return a borrowed book. Triggers reservation queue processing. |
| `/api/borrows/force-return` | `POST` | Staff+ | Admin force-return with `force_returned` flag and staff ID recorded. |
| `/api/borrows/export` | `GET` | Staff+ | Export borrow records as `.xlsx` with optional date range filter. |

### Reservations (`api/reservations/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/reservations` | `GET` | User+ | List current user's active reservations (waiting/ready). |
| `/api/reservations` | `POST` | User+ | Create a reservation for an unavailable book, assigns queue position. |
| `/api/reservations/[id]` | `DELETE` | User+ | Cancel own reservation. Releases held copy or recalculates queue. |
| `/api/reservations/admin` | `GET` | Staff+ | List all active reservations across all users. |

### Users (`api/users/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/users` | `GET` | Admin/Mod | List all user profiles. |
| `/api/users/[id]` | `DELETE` | Admin/Mod | Delete a user (blocked if active borrows, respects role hierarchy). |
| `/api/users/[id]/role` | `POST` | Admin/Mod | Change a user's role. Uses service-role client. Enforces role hierarchy. |

### Notifications (`api/notifications/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/notifications` | `GET` | User+ | Fetch latest 20 notifications + unread count. |
| `/api/notifications` | `PATCH` | User+ | Mark notifications as read (by IDs or all). |
| `/api/notifications/check` | `POST` | User+ | Generate due-date notifications and process expired reservations. |

### Reports (`api/reports/`)

| Endpoint | Method | Auth | Description |
| -------- | ------ | ---- | ----------- |
| `/api/reports` | `GET` | Staff+ | Generate CSV borrow report with optional date range filter. |

---

## Database Tables (Supabase)

| Table | Key Columns | Description |
| ----- | ----------- | ----------- |
| `profiles` | `id`, `name`, `role`, `created_at` | User profiles linked to Supabase Auth users. |
| `books` | `id`, `title`, `author`, `serial_no`, `category`, `total_copies`, `available_copies` | Book inventory. |
| `borrow_records` | `id`, `user_id`, `book_id`, `borrowed_at`, `due_date`, `returned_at`, `force_returned`, `force_returned_by` | Tracks all borrow transactions. |
| `reservations` | `id`, `user_id`, `book_id`, `status`, `position`, `ready_at`, `expires_at` | Book reservation queue (waiting → ready → fulfilled/expired/cancelled). |
| `notifications` | `id`, `user_id`, `type`, `title`, `message`, `read`, `reference_id` | In-app and email notification records. |

### Supabase RPC Functions

| Function | Description |
| -------- | ----------- |
| `increment_available_copies(book_id_input)` | Atomically increments a book's `available_copies` by 1. |

---

## Key Business Rules

1. **Max 3 active borrows** per user at a time.
2. **No borrowing if overdue** — users must return overdue books before borrowing new ones.
3. **Reservation queue** — when a book is unavailable, users join a FIFO queue. When a copy is returned, the next reservation is promoted to `ready` with a **2-day pickup window**.
4. **Expired reservations** — `ready` reservations that aren't picked up within 2 days automatically expire, and the copy is offered to the next person in queue.
5. **Duplicate notifications** are suppressed within a 24-hour window.
6. **Role hierarchy** — Moderators cannot promote users to admin/moderator or modify admin/moderator accounts.
